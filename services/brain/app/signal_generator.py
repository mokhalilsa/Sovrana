"""
Signal Generator: Runs strategy evaluation for each active agent,
writes signals to DB, publishes to Redis, and optionally routes
to Execution Service.
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
import redis.asyncio as aioredis
from loguru import logger
from sqlalchemy import text

from app.config import settings
from app.database import AsyncSessionLocal
from app.strategy_engine import get_strategy, SignalOutput


class SignalGenerator:
    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None
        self._running = False
        self._http = httpx.AsyncClient(timeout=15.0)

    async def start(self):
        self.redis = aioredis.from_url(settings.redis_url, decode_responses=True)
        self._running = True
        logger.info("SignalGenerator started")
        while self._running:
            try:
                await self._evaluate_all_agents()
            except Exception as exc:
                logger.error(f"SignalGenerator loop error: {exc}")
            await asyncio.sleep(settings.strategy_eval_interval)

    async def stop(self):
        self._running = False
        await self._http.aclose()
        if self.redis:
            await self.redis.aclose()

    # ------------------------------------------------------------------
    # Main evaluation loop
    # ------------------------------------------------------------------

    async def _evaluate_all_agents(self):
        """Load all enabled agents and run their active strategies."""
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT
                        a.id AS agent_id,
                        a.name,
                        a.mode,
                        a.kill_switch,
                        a.is_simulate,
                        a.manual_approve,
                        s.template_type,
                        as2.config AS strategy_config,
                        as2.id AS agent_strategy_id
                    FROM agents a
                    JOIN agent_strategies as2 ON as2.agent_id = a.id AND as2.is_active = TRUE
                    JOIN strategies s ON s.id = as2.strategy_id
                    WHERE a.is_enabled = TRUE
                      AND a.status NOT IN ('killed', 'errored')
                      AND a.kill_switch = FALSE
                """)
            )
            rows = result.fetchall()

        if not rows:
            return

        tasks = [self._evaluate_agent(row._mapping) for row in rows]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _evaluate_agent(self, agent_row: Dict):
        agent_id = str(agent_row["agent_id"])
        agent_name = agent_row["name"]
        template_type = agent_row["template_type"]
        strategy_config = agent_row["strategy_config"] or {}

        try:
            strategy = get_strategy(template_type, strategy_config)
        except ValueError as exc:
            logger.warning(f"Agent {agent_name}: {exc}")
            return

        # Fetch markets the agent is allowed to trade
        allowed_markets = await self._get_agent_markets(agent_id)
        if not allowed_markets:
            return

        run_id = await self._create_strategy_run(agent_id, strategy_config)

        signals_created = 0
        for market in allowed_markets[:20]:  # Limit evaluations per cycle
            condition_id = market.get("condition_id", "")
            if not condition_id:
                continue

            # Fetch orderbook (check cache first)
            orderbook = await self._fetch_orderbook_for_market(condition_id, market)
            if not orderbook:
                continue

            try:
                signal = await strategy.evaluate(market, orderbook)
            except Exception as exc:
                logger.error(f"Strategy eval error agent={agent_name} market={condition_id}: {exc}")
                continue

            if signal:
                signal_id = await self._persist_signal(agent_id, run_id, signal, agent_row)
                if signal_id:
                    signals_created += 1
                    await self._publish_signal(agent_id, signal_id, signal)

                    # Auto-submit to execution if not manual_approve and trading_enabled
                    if (
                        not agent_row["manual_approve"]
                        and agent_row["mode"] == "trading_enabled"
                        and not agent_row["is_simulate"]
                    ):
                        await self._submit_to_execution(agent_id, signal_id, signal)

        await strategy.close()
        await self._complete_strategy_run(run_id, signals_created)
        logger.info(f"Agent {agent_name} evaluated: {signals_created} signals generated")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _get_agent_markets(self, agent_id: str) -> List[Dict]:
        """Fetch markets from the allowlist or all active markets if no allowlist."""
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT condition_id FROM agent_market_permissions
                    WHERE agent_id = :agent_id AND permission_type = 'allowlist'
                """),
                {"agent_id": agent_id},
            )
            allowlist = [r[0] for r in result.fetchall()]

        if allowlist:
            markets = []
            for cid in allowlist:
                cached = await self.redis.get(f"market:{cid}:latest") if self.redis else None
                if cached:
                    markets.append(json.loads(cached))
                else:
                    try:
                        r = await self._http.get(f"{settings.ingestion_url}/markets/{cid}")
                        r.raise_for_status()
                        markets.append(r.json())
                    except Exception:
                        pass
            return markets
        else:
            try:
                r = await self._http.get(
                    f"{settings.ingestion_url}/markets",
                    params={"limit": 50, "active": True},
                )
                r.raise_for_status()
                return r.json()
            except Exception as exc:
                logger.warning(f"Could not fetch markets: {exc}")
                return []

    async def _fetch_orderbook_for_market(self, condition_id: str, market: Dict) -> Optional[Dict]:
        """Attempt to get orderbook for YES token of a market."""
        # Try Redis cache first
        if self.redis:
            keys = await self.redis.keys(f"orderbook:*:{condition_id}:latest")
            if not keys:
                # Try generic pattern
                ob_keys = await self.redis.keys(f"orderbook:*:latest")
                for key in ob_keys[:5]:
                    data = await self.redis.get(key)
                    if data:
                        parsed = json.loads(data)
                        if parsed.get("condition_id") == condition_id:
                            return parsed

        # Fallback to ingestion service
        try:
            r = await self._http.get(f"{settings.ingestion_url}/orderbook/{condition_id}")
            if r.status_code == 200:
                return r.json()
        except Exception:
            pass

        return None

    async def _create_strategy_run(self, agent_id: str, config: Dict) -> str:
        run_id = str(uuid.uuid4())
        async with AsyncSessionLocal() as db:
            await db.execute(
                text("""
                    INSERT INTO strategy_runs
                        (id, agent_id, strategy_id, status, started_at, run_metadata)
                    SELECT :id, :agent_id, as2.strategy_id, 'running', NOW(), :meta
                    FROM agent_strategies as2
                    WHERE as2.agent_id = :agent_id AND as2.is_active = TRUE
                    LIMIT 1
                """),
                {
                    "id": run_id,
                    "agent_id": agent_id,
                    "meta": json.dumps(config),
                },
            )
            await db.commit()
        return run_id

    async def _complete_strategy_run(self, run_id: str, signals_count: int):
        async with AsyncSessionLocal() as db:
            await db.execute(
                text("""
                    UPDATE strategy_runs
                    SET status = 'completed', completed_at = NOW(),
                        run_metadata = run_metadata || :meta
                    WHERE id = :id
                """),
                {
                    "id": run_id,
                    "meta": json.dumps({"signals_generated": signals_count}),
                },
            )
            await db.commit()

    async def _persist_signal(
        self, agent_id: str, run_id: str, signal: SignalOutput, agent_row: Dict
    ) -> Optional[str]:
        signal_id = str(uuid.uuid4())
        try:
            async with AsyncSessionLocal() as db:
                await db.execute(
                    text("""
                        INSERT INTO signals
                            (id, agent_id, strategy_run_id, condition_id, token_id,
                             side, price, size_usdc, confidence, time_horizon,
                             status, raw_data, created_at, updated_at)
                        VALUES
                            (:id, :agent_id, :run_id, :condition_id, :token_id,
                             :side, :price, :size_usdc, :confidence, :time_horizon,
                             :status, :raw_data, NOW(), NOW())
                    """),
                    {
                        "id": signal_id,
                        "agent_id": agent_id,
                        "run_id": run_id,
                        "condition_id": signal.condition_id,
                        "token_id": signal.token_id,
                        "side": signal.side,
                        "price": signal.price,
                        "size_usdc": signal.size_usdc,
                        "confidence": signal.confidence,
                        "time_horizon": signal.time_horizon,
                        "status": "pending" if agent_row["manual_approve"] else "approved",
                        "raw_data": json.dumps(signal.raw_data),
                    },
                )

                # Audit log
                await db.execute(
                    text("""
                        INSERT INTO audit_logs
                            (event_type, agent_id, entity_type, entity_id, message, metadata, severity)
                        VALUES
                            ('signal_generated', :agent_id, 'signal', :signal_id, :msg, :meta, 'info')
                    """),
                    {
                        "agent_id": agent_id,
                        "signal_id": signal_id,
                        "msg": f"Signal generated: {signal.side} {signal.condition_id} confidence={signal.confidence:.3f}",
                        "meta": json.dumps(signal.raw_data),
                    },
                )
                await db.commit()
            return signal_id
        except Exception as exc:
            logger.error(f"persist_signal failed: {exc}")
            return None

    async def _publish_signal(self, agent_id: str, signal_id: str, signal: SignalOutput):
        if not self.redis:
            return
        payload = signal.to_dict()
        payload["signal_id"] = signal_id
        payload["agent_id"] = agent_id
        await self.redis.publish("channel:signals:new", json.dumps(payload))

    async def _submit_to_execution(self, agent_id: str, signal_id: str, signal: SignalOutput):
        """POST signal to the Execution Service for order placement."""
        try:
            execution_url = "http://execution:8003"
            payload = {
                "agent_id": agent_id,
                "signal_id": signal_id,
                "condition_id": signal.condition_id,
                "token_id": signal.token_id,
                "side": signal.side,
                "price": signal.price,
                "size_usdc": signal.size_usdc,
                "confidence": signal.confidence,
            }
            r = await self._http.post(f"{execution_url}/execute", json=payload)
            r.raise_for_status()
            logger.info(f"Signal {signal_id} submitted to execution: {r.json()}")
        except Exception as exc:
            logger.error(f"Failed to submit signal {signal_id} to execution: {exc}")
