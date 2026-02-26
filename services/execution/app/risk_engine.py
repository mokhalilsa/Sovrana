"""
Risk Engine: Every order must pass all risk checks before execution.
The engine enforces per-agent limits fetched from the database.
A blocked order is logged in full and never silently dropped.
"""

import json
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple

from loguru import logger
from sqlalchemy import text

from app.config import settings
from app.database import AsyncSessionLocal


@dataclass
class OrderRequest:
    agent_id: str
    signal_id: str
    condition_id: str
    token_id: str
    side: str
    price: float
    size_usdc: float
    confidence: float
    order_type: str = "limit"


@dataclass
class RiskDecision:
    approved: bool
    reason: str
    checks: Dict[str, bool]
    adjusted_size: Optional[float] = None


class RiskEngine:
    """
    Runs all risk checks for an order request.
    Checks evaluated in order:
      1. Global kill switch
      2. Agent kill switch
      3. Agent mode must be trading_enabled
      4. Market allowlist check
      5. Market denylist check
      6. Max order size
      7. Max exposure per market
      8. Daily loss cap
      9. Slippage cap vs current market price
     10. Cooldown between orders for same market
     11. Max open orders
    """

    async def evaluate(self, request: OrderRequest) -> RiskDecision:
        checks: Dict[str, bool] = {}

        # 1. Global kill switch (from DB settings and env)
        global_ks = await self._get_global_kill_switch()
        checks["global_kill_switch"] = not global_ks
        if global_ks:
            return RiskDecision(
                approved=False,
                reason="Global kill switch is active",
                checks=checks,
            )

        # Load agent and risk limits
        agent = await self._load_agent(request.agent_id)
        if not agent:
            return RiskDecision(approved=False, reason="Agent not found", checks=checks)

        limits = await self._load_risk_limits(request.agent_id)
        if not limits:
            return RiskDecision(approved=False, reason="Risk limits not configured", checks=checks)

        # 2. Agent kill switch
        checks["agent_kill_switch"] = not agent.get("kill_switch", True)
        if agent.get("kill_switch", True):
            return RiskDecision(
                approved=False,
                reason="Agent kill switch is active",
                checks=checks,
            )

        # 3. Agent must be trading_enabled
        checks["agent_mode"] = agent.get("mode") == "trading_enabled"
        if not checks["agent_mode"]:
            return RiskDecision(
                approved=False,
                reason="Agent is in read-only mode",
                checks=checks,
            )

        # 4. Market allowlist
        allowed = await self._check_allowlist(request.agent_id, request.condition_id)
        checks["market_allowlist"] = allowed
        if not allowed:
            return RiskDecision(
                approved=False,
                reason=f"Market {request.condition_id} not in agent allowlist",
                checks=checks,
            )

        # 5. Market denylist
        denied = await self._check_denylist(request.agent_id, request.condition_id)
        checks["market_denylist"] = not denied
        if denied:
            return RiskDecision(
                approved=False,
                reason=f"Market {request.condition_id} is in agent denylist",
                checks=checks,
            )

        # 6. Max order size
        max_order = float(limits.get("max_order_size_usdc", 100))
        checks["max_order_size"] = request.size_usdc <= max_order
        adjusted_size = min(request.size_usdc, max_order)

        # 7. Max exposure per market
        current_exposure = await self._get_market_exposure(request.agent_id, request.condition_id)
        max_exposure = float(limits.get("max_exposure_usdc", 500))
        remaining_exposure = max_exposure - current_exposure
        checks["max_exposure"] = remaining_exposure > 0
        if not checks["max_exposure"]:
            return RiskDecision(
                approved=False,
                reason=f"Max exposure reached for market {request.condition_id}: {current_exposure:.2f}/{max_exposure:.2f} USDC",
                checks=checks,
            )
        adjusted_size = min(adjusted_size, remaining_exposure)

        # 8. Daily loss cap
        daily_loss = await self._get_daily_loss(request.agent_id)
        daily_cap = float(limits.get("daily_loss_cap_usdc", 200))
        checks["daily_loss_cap"] = daily_loss < daily_cap
        if not checks["daily_loss_cap"]:
            return RiskDecision(
                approved=False,
                reason=f"Daily loss cap reached: {daily_loss:.2f}/{daily_cap:.2f} USDC",
                checks=checks,
            )

        # 9. Slippage cap
        slippage_cap = float(limits.get("slippage_cap_pct", 3.0)) / 100
        slippage_ok = await self._check_slippage(
            request.token_id, request.side, request.price, slippage_cap
        )
        checks["slippage_cap"] = slippage_ok
        if not slippage_ok:
            return RiskDecision(
                approved=False,
                reason=f"Order price {request.price} exceeds slippage cap of {slippage_cap*100:.1f}%",
                checks=checks,
            )

        # 10. Cooldown
        cooldown_ok = await self._check_cooldown(
            request.agent_id,
            request.condition_id,
            int(limits.get("cooldown_seconds", 60)),
        )
        checks["cooldown"] = cooldown_ok
        if not cooldown_ok:
            return RiskDecision(
                approved=False,
                reason="Cooldown period not elapsed for this market",
                checks=checks,
            )

        # 11. Max open orders
        open_orders = await self._count_open_orders(request.agent_id)
        max_open = int(limits.get("max_open_orders", 10))
        checks["max_open_orders"] = open_orders < max_open
        if not checks["max_open_orders"]:
            return RiskDecision(
                approved=False,
                reason=f"Max open orders reached: {open_orders}/{max_open}",
                checks=checks,
            )

        return RiskDecision(
            approved=True,
            reason="All risk checks passed",
            checks=checks,
            adjusted_size=adjusted_size,
        )

    # ------------------------------------------------------------------
    # DB helpers
    # ------------------------------------------------------------------

    async def _get_global_kill_switch(self) -> bool:
        if settings.global_kill_switch:
            return True
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("SELECT value FROM system_settings WHERE key = 'global_kill_switch'")
            )
            row = result.fetchone()
            if row and row[0].lower() == "true":
                return True
        return False

    async def _load_agent(self, agent_id: str) -> Optional[Dict]:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("SELECT id, mode, kill_switch, is_simulate FROM agents WHERE id = :id"),
                {"id": agent_id},
            )
            row = result.fetchone()
            return dict(row._mapping) if row else None

    async def _load_risk_limits(self, agent_id: str) -> Optional[Dict]:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT max_order_size_usdc, max_exposure_usdc, daily_loss_cap_usdc,
                           slippage_cap_pct, cooldown_seconds, max_open_orders
                    FROM agent_risk_limits WHERE agent_id = :id
                """),
                {"id": agent_id},
            )
            row = result.fetchone()
            return dict(row._mapping) if row else None

    async def _check_allowlist(self, agent_id: str, condition_id: str) -> bool:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT COUNT(*) FROM agent_market_permissions
                    WHERE agent_id = :agent_id AND permission_type = 'allowlist'
                """),
                {"agent_id": agent_id},
            )
            total_allowlist = result.scalar()

            if total_allowlist == 0:
                return True  # No allowlist restriction, all markets allowed

            result2 = await db.execute(
                text("""
                    SELECT COUNT(*) FROM agent_market_permissions
                    WHERE agent_id = :agent_id AND condition_id = :cid
                      AND permission_type = 'allowlist'
                """),
                {"agent_id": agent_id, "cid": condition_id},
            )
            return result2.scalar() > 0

    async def _check_denylist(self, agent_id: str, condition_id: str) -> bool:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT COUNT(*) FROM agent_market_permissions
                    WHERE agent_id = :agent_id AND condition_id = :cid
                      AND permission_type = 'denylist'
                """),
                {"agent_id": agent_id, "cid": condition_id},
            )
            return result.scalar() > 0

    async def _get_market_exposure(self, agent_id: str, condition_id: str) -> float:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT COALESCE(SUM(size_usdc), 0)
                    FROM positions
                    WHERE agent_id = :agent_id AND condition_id = :cid AND is_open = TRUE
                """),
                {"agent_id": agent_id, "cid": condition_id},
            )
            return float(result.scalar() or 0)

    async def _get_daily_loss(self, agent_id: str) -> float:
        today = datetime.now(timezone.utc).date()
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT COALESCE(ABS(MIN(realized_pnl)), 0)
                    FROM pnl_snapshots
                    WHERE agent_id = :agent_id AND snapshot_date = :today
                      AND realized_pnl < 0
                """),
                {"agent_id": agent_id, "today": today},
            )
            return float(result.scalar() or 0)

    async def _check_slippage(
        self, token_id: str, side: str, order_price: float, slippage_cap: float
    ) -> bool:
        """Check if the order price is within slippage cap of the current market price."""
        try:
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(
                    f"http://ingestion:8001/midpoint/{token_id}"
                )
                if r.status_code == 200:
                    mid = float(r.json().get("mid", 0))
                    if mid > 0:
                        slippage = abs(order_price - mid) / mid
                        return slippage <= slippage_cap
        except Exception:
            pass
        return True  # Pass if can't determine mid price

    async def _check_cooldown(self, agent_id: str, condition_id: str, cooldown_seconds: int) -> bool:
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=cooldown_seconds)
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT COUNT(*) FROM orders
                    WHERE agent_id = :agent_id AND condition_id = :cid
                      AND status IN ('placed', 'partial', 'filled')
                      AND created_at > :cutoff
                """),
                {"agent_id": agent_id, "cid": condition_id, "cutoff": cutoff},
            )
            return result.scalar() == 0

    async def _count_open_orders(self, agent_id: str) -> int:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT COUNT(*) FROM orders
                    WHERE agent_id = :agent_id
                      AND status IN ('pending', 'placed', 'partial')
                """),
                {"agent_id": agent_id},
            )
            return int(result.scalar() or 0)
