"""
Execution Service: The only service that places orders and holds signing capability.
Exposes internal REST endpoints for Brain Service and UI manual orders.
All endpoints are protected by an internal API key.
"""

import asyncio
import json
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException, Header, Query, Request
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import text

from app.config import settings
from app.database import AsyncSessionLocal
from app.order_executor import OrderExecutor
from app.reconciler import PositionReconciler
from app.risk_engine import OrderRequest, RiskEngine

executor = OrderExecutor()
reconciler = PositionReconciler()
risk_engine = RiskEngine()
redis_client: Optional[aioredis.Redis] = None

from app.agents_router import router as agents_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
    asyncio.create_task(reconciler.start())
    logger.info("Execution service started")
    yield
    await reconciler.stop()
    await executor.close()
    await redis_client.aclose()
    logger.info("Execution service stopped")


app = FastAPI(
    title="Sovrana Execution Service",
    description="Order signing and placement with risk controls",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(agents_router)


# ------------------------------------------------------------------
# Internal API key guard
# ------------------------------------------------------------------

def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != settings.execution_api_key:
        raise HTTPException(status_code=403, detail="Invalid internal API key")


# ------------------------------------------------------------------
# Health
# ------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.service_name}


# ------------------------------------------------------------------
# Execute order (called by Brain or UI)
# ------------------------------------------------------------------

class ExecuteRequest(BaseModel):
    agent_id: str
    signal_id: str
    condition_id: str
    token_id: str
    side: str
    price: float
    size_usdc: float
    confidence: float
    order_type: str = "limit"


@app.post("/execute")
async def execute_order(body: ExecuteRequest) -> Dict:
    """
    Main execution endpoint.
    Runs risk engine first, then places order if approved.
    """
    request = OrderRequest(
        agent_id=body.agent_id,
        signal_id=body.signal_id,
        condition_id=body.condition_id,
        token_id=body.token_id,
        side=body.side,
        price=body.price,
        size_usdc=body.size_usdc,
        confidence=body.confidence,
        order_type=body.order_type,
    )

    # Run risk engine
    decision = await risk_engine.evaluate(request)

    if not decision.approved:
        logger.warning(f"Order blocked: {decision.reason}")
        await _write_blocked_order(request, decision)
        return {
            "status": "blocked",
            "reason": decision.reason,
            "checks": decision.checks,
        }

    result = await executor.execute(request, decision)
    return result


async def _write_blocked_order(request: OrderRequest, decision):
    """Persist blocked order and audit log."""
    import uuid as _uuid
    order_id = str(_uuid.uuid4())
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("""
                INSERT INTO orders
                    (id, agent_id, signal_id, condition_id, token_id, side, order_type,
                     price, size_usdc, status, block_reason, created_at, updated_at)
                VALUES
                    (:id, :agent_id, :signal_id, :cid, :tid, :side, :otype,
                     :price, :size, 'blocked', :reason, NOW(), NOW())
            """),
            {
                "id": order_id,
                "agent_id": request.agent_id,
                "signal_id": request.signal_id,
                "cid": request.condition_id,
                "tid": request.token_id,
                "side": request.side,
                "otype": request.order_type,
                "price": request.price,
                "size": request.size_usdc,
                "reason": decision.reason,
            },
        )
        await db.execute(
            text("""
                INSERT INTO audit_logs
                    (event_type, agent_id, entity_type, entity_id, message, metadata, severity)
                VALUES
                    ('order_blocked', :agent_id, 'order', :order_id, :msg, :meta, 'warning')
            """),
            {
                "agent_id": request.agent_id,
                "order_id": order_id,
                "msg": f"Order blocked: {decision.reason}",
                "meta": json.dumps({"checks": decision.checks}),
            },
        )
        await db.commit()


# ------------------------------------------------------------------
# Cancel order
# ------------------------------------------------------------------

class CancelRequest(BaseModel):
    agent_id: str
    order_id: str
    polymarket_order_id: str


@app.post("/cancel")
async def cancel_order(body: CancelRequest) -> Dict:
    return await executor.cancel(body.agent_id, body.order_id, body.polymarket_order_id)


# ------------------------------------------------------------------
# Orders
# ------------------------------------------------------------------

@app.get("/orders")
async def list_orders(
    agent_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> List[Dict]:
    async with AsyncSessionLocal() as db:
        conditions = ["1=1"]
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if agent_id:
            conditions.append("o.agent_id = :agent_id")
            params["agent_id"] = agent_id
        if status:
            conditions.append("o.status = :status")
            params["status"] = status

        where = " AND ".join(conditions)
        result = await db.execute(
            text(f"""
                SELECT o.id, o.agent_id, o.signal_id, o.polymarket_order_id,
                       o.condition_id, o.token_id, o.side, o.order_type, o.price,
                       o.size_usdc, o.status, o.block_reason, o.placed_at,
                       o.created_at, a.name AS agent_name
                FROM orders o
                JOIN agents a ON a.id = o.agent_id
                WHERE {where}
                ORDER BY o.created_at DESC
                LIMIT :limit OFFSET :offset
            """),
            params,
        )
        return [dict(r._mapping) for r in result.fetchall()]


# ------------------------------------------------------------------
# Fills
# ------------------------------------------------------------------

@app.get("/fills")
async def list_fills(
    agent_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> List[Dict]:
    async with AsyncSessionLocal() as db:
        conditions = ["1=1"]
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if agent_id:
            conditions.append("f.agent_id = :agent_id")
            params["agent_id"] = agent_id

        where = " AND ".join(conditions)
        result = await db.execute(
            text(f"""
                SELECT f.id, f.order_id, f.agent_id, f.polymarket_fill_id,
                       f.condition_id, f.token_id, f.side, f.fill_price,
                       f.fill_size_usdc, f.fee_usdc, f.filled_at, a.name AS agent_name
                FROM fills f
                JOIN agents a ON a.id = f.agent_id
                WHERE {where}
                ORDER BY f.filled_at DESC
                LIMIT :limit OFFSET :offset
            """),
            params,
        )
        return [dict(r._mapping) for r in result.fetchall()]


# ------------------------------------------------------------------
# Positions
# ------------------------------------------------------------------

@app.get("/positions")
async def list_positions(
    agent_id: Optional[str] = Query(None),
    is_open: Optional[bool] = Query(None),
) -> List[Dict]:
    async with AsyncSessionLocal() as db:
        conditions = ["1=1"]
        params: Dict[str, Any] = {}
        if agent_id:
            conditions.append("p.agent_id = :agent_id")
            params["agent_id"] = agent_id
        if is_open is not None:
            conditions.append("p.is_open = :is_open")
            params["is_open"] = is_open

        where = " AND ".join(conditions)
        result = await db.execute(
            text(f"""
                SELECT p.id, p.agent_id, p.condition_id, p.token_id, p.side,
                       p.size_usdc, p.avg_entry_price, p.current_price,
                       p.unrealized_pnl, p.realized_pnl, p.is_open,
                       p.opened_at, p.closed_at, a.name AS agent_name
                FROM positions p
                JOIN agents a ON a.id = p.agent_id
                WHERE {where}
                ORDER BY p.opened_at DESC
            """),
            params,
        )
        return [dict(r._mapping) for r in result.fetchall()]


# ------------------------------------------------------------------
# PnL snapshots
# ------------------------------------------------------------------

@app.get("/pnl")
async def list_pnl(
    agent_id: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365),
) -> List[Dict]:
    async with AsyncSessionLocal() as db:
        conditions = ["ps.snapshot_date >= CURRENT_DATE - :days"]
        params: Dict[str, Any] = {"days": days}
        if agent_id:
            conditions.append("ps.agent_id = :agent_id")
            params["agent_id"] = agent_id

        where = " AND ".join(conditions)
        result = await db.execute(
            text(f"""
                SELECT ps.id, ps.agent_id, ps.snapshot_date, ps.realized_pnl,
                       ps.unrealized_pnl, ps.total_pnl, ps.total_volume,
                       ps.trade_count, a.name AS agent_name
                FROM pnl_snapshots ps
                JOIN agents a ON a.id = ps.agent_id
                WHERE {where}
                ORDER BY ps.snapshot_date DESC, a.name
            """),
            params,
        )
        return [dict(r._mapping) for r in result.fetchall()]


# ------------------------------------------------------------------
# Kill switches
# ------------------------------------------------------------------

@app.post("/kill/global")
async def global_kill_switch(enabled: bool = True) -> Dict:
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("""
                UPDATE system_settings SET value = :val, updated_at = NOW()
                WHERE key = 'global_kill_switch'
            """),
            {"val": "true" if enabled else "false"},
        )
        await db.execute(
            text("""
                INSERT INTO audit_logs
                    (event_type, message, severity)
                VALUES
                    ('kill_switch_triggered',
                     :msg,
                     'critical')
            """),
            {"msg": f"Global kill switch {'ENABLED' if enabled else 'DISABLED'}"},
        )
        await db.commit()
    logger.warning(f"Global kill switch {'ENABLED' if enabled else 'DISABLED'}")
    return {"global_kill_switch": enabled}


@app.post("/kill/agent/{agent_id}")
async def agent_kill_switch(agent_id: str, enabled: bool = True) -> Dict:
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("""
                UPDATE agents SET kill_switch = :val, updated_at = NOW()
                WHERE id = :id
            """),
            {"val": enabled, "id": agent_id},
        )
        await db.execute(
            text("""
                INSERT INTO audit_logs
                    (event_type, agent_id, message, severity)
                VALUES
                    ('kill_switch_triggered', :agent_id, :msg, 'critical')
            """),
            {
                "agent_id": agent_id,
                "msg": f"Agent kill switch {'ENABLED' if enabled else 'DISABLED'}",
            },
        )
        await db.commit()
    return {"agent_id": agent_id, "kill_switch": enabled}


# ------------------------------------------------------------------
# Audit logs
# ------------------------------------------------------------------

@app.get("/audit")
async def list_audit_logs(
    agent_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> List[Dict]:
    async with AsyncSessionLocal() as db:
        conditions = ["1=1"]
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if agent_id:
            conditions.append("al.agent_id = :agent_id")
            params["agent_id"] = agent_id
        if event_type:
            conditions.append("al.event_type = :event_type")
            params["event_type"] = event_type

        where = " AND ".join(conditions)
        result = await db.execute(
            text(f"""
                SELECT al.id, al.event_type, al.agent_id, al.entity_type,
                       al.entity_id, al.message, al.severity, al.created_at,
                       al.metadata,
                       a.name AS agent_name
                FROM audit_logs al
                LEFT JOIN agents a ON a.id = al.agent_id
                WHERE {where}
                ORDER BY al.created_at DESC
                LIMIT :limit OFFSET :offset
            """),
            params,
        )
        return [dict(r._mapping) for r in result.fetchall()]
