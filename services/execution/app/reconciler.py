"""
Position Reconciler: Periodically syncs positions and fills from Polymarket
with the local database, updates PnL snapshots, and detects discrepancies.
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

import httpx
from loguru import logger
from sqlalchemy import text

from app.config import settings
from app.database import AsyncSessionLocal


class PositionReconciler:
    def __init__(self):
        self._running = False
        self._http = httpx.AsyncClient(timeout=30.0)

    async def start(self):
        self._running = True
        logger.info("PositionReconciler started")
        while self._running:
            try:
                await self._reconcile_all()
            except Exception as exc:
                logger.error(f"Reconciler error: {exc}")
            await asyncio.sleep(settings.reconcile_interval)

    async def stop(self):
        self._running = False
        await self._http.aclose()

    async def _reconcile_all(self):
        """Reconcile positions for all agents with wallets."""
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT a.id AS agent_id, wp.evm_address, wp.secret_ref
                    FROM agents a
                    JOIN wallet_profiles wp ON wp.id = a.wallet_profile_id
                    WHERE a.is_enabled = TRUE AND a.status NOT IN ('killed')
                """)
            )
            agents = [dict(r._mapping) for r in result.fetchall()]

        for agent in agents:
            try:
                await self._reconcile_agent(agent["agent_id"], agent["evm_address"])
            except Exception as exc:
                logger.error(f"Reconcile failed for agent {agent['agent_id']}: {exc}")

    async def _reconcile_agent(self, agent_id: str, wallet_address: str):
        """Fetch fills from Polymarket and sync to local DB."""
        try:
            fills_resp = await self._http.get(
                f"http://ingestion:8001/activity/{wallet_address}",
                params={"limit": 200},
            )
            fills_resp.raise_for_status()
            activities = fills_resp.json()
        except Exception as exc:
            logger.warning(f"Could not fetch activity for {wallet_address}: {exc}")
            return

        for activity in activities:
            if activity.get("type") != "trade":
                continue
            await self._upsert_fill(agent_id, activity)

        await self._update_pnl_snapshot(agent_id)
        logger.debug(f"Reconciled {len(activities)} activities for agent {agent_id}")

    async def _upsert_fill(self, agent_id: str, activity: Dict):
        poly_fill_id = str(activity.get("id") or activity.get("tradeId", ""))
        if not poly_fill_id:
            return

        async with AsyncSessionLocal() as db:
            # Check if fill already exists
            result = await db.execute(
                text("SELECT id FROM fills WHERE polymarket_fill_id = :fid"),
                {"fid": poly_fill_id},
            )
            if result.fetchone():
                return  # Already recorded

            # Try to match with an existing order
            condition_id = str(activity.get("conditionId", ""))
            order_result = await db.execute(
                text("""
                    SELECT id FROM orders
                    WHERE agent_id = :agent_id AND condition_id = :cid
                      AND status IN ('placed', 'partial')
                    ORDER BY created_at DESC LIMIT 1
                """),
                {"agent_id": agent_id, "cid": condition_id},
            )
            order_row = order_result.fetchone()
            order_id = str(order_row[0]) if order_row else str(uuid.uuid4())

            fill_id = str(uuid.uuid4())
            await db.execute(
                text("""
                    INSERT INTO fills
                        (id, order_id, agent_id, polymarket_fill_id, condition_id, token_id,
                         side, fill_price, fill_size_usdc, fee_usdc, filled_at, raw_data)
                    VALUES
                        (:id, :order_id, :agent_id, :poly_fill_id, :cid, :tid,
                         :side, :price, :size, :fee, :filled_at, :raw)
                    ON CONFLICT DO NOTHING
                """),
                {
                    "id": fill_id,
                    "order_id": order_id,
                    "agent_id": agent_id,
                    "poly_fill_id": poly_fill_id,
                    "cid": condition_id,
                    "tid": str(activity.get("tokenId", "")),
                    "side": str(activity.get("side", "buy")).lower(),
                    "price": float(activity.get("price", 0)),
                    "size": float(activity.get("size", 0)),
                    "fee": float(activity.get("fee", 0)),
                    "filled_at": activity.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                    "raw": json.dumps(activity),
                },
            )
            await db.commit()

    async def _update_pnl_snapshot(self, agent_id: str):
        today = datetime.now(timezone.utc).date()
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT
                        COALESCE(SUM(CASE WHEN side = 'sell' THEN fill_size_usdc ELSE -fill_size_usdc END), 0) AS realized,
                        COUNT(*) AS trade_count,
                        COALESCE(SUM(fill_size_usdc), 0) AS volume
                    FROM fills
                    WHERE agent_id = :agent_id
                      AND filled_at::date = :today
                """),
                {"agent_id": agent_id, "today": today},
            )
            row = result.fetchone()
            realized = float(row[0] or 0)
            trade_count = int(row[1] or 0)
            volume = float(row[2] or 0)

            # Unrealized PnL from open positions
            pos_result = await db.execute(
                text("""
                    SELECT COALESCE(SUM(unrealized_pnl), 0)
                    FROM positions
                    WHERE agent_id = :agent_id AND is_open = TRUE
                """),
                {"agent_id": agent_id},
            )
            unrealized = float(pos_result.scalar() or 0)

            await db.execute(
                text("""
                    INSERT INTO pnl_snapshots
                        (agent_id, snapshot_date, realized_pnl, unrealized_pnl, total_pnl, total_volume, trade_count)
                    VALUES
                        (:agent_id, :date, :realized, :unrealized, :total, :volume, :count)
                    ON CONFLICT (agent_id, snapshot_date)
                    DO UPDATE SET
                        realized_pnl = EXCLUDED.realized_pnl,
                        unrealized_pnl = EXCLUDED.unrealized_pnl,
                        total_pnl = EXCLUDED.total_pnl,
                        total_volume = EXCLUDED.total_volume,
                        trade_count = EXCLUDED.trade_count
                """),
                {
                    "agent_id": agent_id,
                    "date": today,
                    "realized": realized,
                    "unrealized": unrealized,
                    "total": realized + unrealized,
                    "volume": volume,
                    "count": trade_count,
                },
            )
            await db.commit()
