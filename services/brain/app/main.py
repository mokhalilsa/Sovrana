"""
Brain Service  Agent strategy evaluation and signal generation.
Exposes REST endpoints for the UI to query signals and trigger manual evaluations.
"""

import asyncio
import json
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException, Query
from loguru import logger
from sqlalchemy import text

from app.config import settings
from app.database import AsyncSessionLocal
from app.signal_generator import SignalGenerator
from app.strategy_engine import STRATEGY_REGISTRY

generator = SignalGenerator()
redis_client: Optional[aioredis.Redis] = None

from app.agents_router import router as agents_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
    asyncio.create_task(generator.start())
    logger.info("Brain service started")
    yield
    await generator.stop()
    await redis_client.aclose()
    logger.info("Brain service stopped")


app = FastAPI(
    title="Sovrana Brain Service",
    description="Agent signal generation and strategy evaluation",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(agents_router)


# ------------------------------------------------------------------
# Health
# ------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.service_name}


# ------------------------------------------------------------------
# Strategy templates
# ------------------------------------------------------------------

@app.get("/strategies/templates")
async def list_strategy_templates() -> List[Dict]:
    """Return available strategy template types."""
    return [
        {
            "template_type": k,
            "description": {
                "mean_reversion": "Buys when price is below fair value and sells when above",
                "momentum": "Enters in the direction of recent price momentum",
                "liquidity_provision": "Places limit orders on both sides to earn spread",
            }.get(k, "Custom strategy"),
        }
        for k in STRATEGY_REGISTRY.keys()
    ]


# ------------------------------------------------------------------
# Signals
# ------------------------------------------------------------------

@app.get("/signals")
async def list_signals(
    agent_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> List[Dict]:
    async with AsyncSessionLocal() as db:
        conditions = ["1=1"]
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if agent_id:
            conditions.append("s.agent_id = :agent_id")
            params["agent_id"] = agent_id
        if status:
            conditions.append("s.status = :status")
            params["status"] = status

        where = " AND ".join(conditions)
        result = await db.execute(
            text(f"""
                SELECT s.id, s.agent_id, s.condition_id, s.token_id, s.side,
                       s.price, s.size_usdc, s.confidence, s.status,
                       s.rejection_reason, s.created_at, a.name AS agent_name
                FROM signals s
                JOIN agents a ON a.id = s.agent_id
                WHERE {where}
                ORDER BY s.created_at DESC
                LIMIT :limit OFFSET :offset
            """),
            params,
        )
        rows = result.fetchall()
        return [dict(r._mapping) for r in rows]


@app.get("/signals/{signal_id}")
async def get_signal(signal_id: str) -> Dict:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("""
                SELECT s.*, a.name AS agent_name
                FROM signals s
                JOIN agents a ON a.id = s.agent_id
                WHERE s.id = :id
            """),
            {"id": signal_id},
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Signal not found")
        return dict(row._mapping)


@app.post("/signals/{signal_id}/approve")
async def approve_signal(signal_id: str) -> Dict:
    """Manually approve a pending signal."""
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("""
                UPDATE signals SET status = 'approved', updated_at = NOW()
                WHERE id = :id AND status = 'pending'
            """),
            {"id": signal_id},
        )
        await db.execute(
            text("""
                INSERT INTO audit_logs
                    (event_type, entity_type, entity_id, message, severity)
                VALUES ('signal_approved', 'signal', :id, 'Signal manually approved', 'info')
            """),
            {"id": signal_id},
        )
        await db.commit()
    return {"status": "approved", "signal_id": signal_id}


@app.post("/signals/{signal_id}/reject")
async def reject_signal(signal_id: str, body: Dict) -> Dict:
    """Manually reject a pending signal."""
    reason = body.get("reason", "Manually rejected")
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("""
                UPDATE signals
                SET status = 'rejected', rejection_reason = :reason, updated_at = NOW()
                WHERE id = :id AND status = 'pending'
            """),
            {"id": signal_id, "reason": reason},
        )
        await db.execute(
            text("""
                INSERT INTO audit_logs
                    (event_type, entity_type, entity_id, message, metadata, severity)
                VALUES
                    ('signal_rejected', 'signal', :id, :msg, :meta, 'info')
            """),
            {
                "id": signal_id,
                "msg": f"Signal rejected: {reason}",
                "meta": json.dumps({"reason": reason}),
            },
        )
        await db.commit()
    return {"status": "rejected", "signal_id": signal_id}


# ------------------------------------------------------------------
# Strategy runs
# ------------------------------------------------------------------

@app.get("/runs")
async def list_runs(
    agent_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
) -> List[Dict]:
    async with AsyncSessionLocal() as db:
        params: Dict[str, Any] = {"limit": limit}
        extra = ""
        if agent_id:
            extra = "AND sr.agent_id = :agent_id"
            params["agent_id"] = agent_id

        result = await db.execute(
            text(f"""
                SELECT sr.id, sr.agent_id, sr.status, sr.started_at,
                       sr.completed_at, sr.error_message, sr.run_metadata,
                       a.name AS agent_name
                FROM strategy_runs sr
                JOIN agents a ON a.id = sr.agent_id
                WHERE 1=1 {extra}
                ORDER BY sr.created_at DESC
                LIMIT :limit
            """),
            params,
        )
        rows = result.fetchall()
        return [dict(r._mapping) for r in rows]
