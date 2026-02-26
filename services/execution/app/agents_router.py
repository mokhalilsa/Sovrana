"""
Agent CRUD endpoints for the Execution Service.
The UI proxies all agent management calls through here.
"""

import json
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.database import AsyncSessionLocal

router = APIRouter()


# ------------------------------------------------------------------
# Models
# ------------------------------------------------------------------

class AgentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    mode: str = "read_only"
    is_simulate: bool = True
    manual_approve: bool = False
    wallet_profile_id: Optional[str] = None


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    mode: Optional[str] = None
    is_simulate: Optional[bool] = None
    manual_approve: Optional[bool] = None
    wallet_profile_id: Optional[str] = None


class RiskLimitsUpdate(BaseModel):
    max_order_size_usdc: float = 100
    max_exposure_usdc: float = 500
    daily_loss_cap_usdc: float = 200
    slippage_cap_pct: float = 3.0
    cooldown_seconds: int = 60
    max_open_orders: int = 10


class MarketPermissionCreate(BaseModel):
    condition_id: str
    permission_type: str = "allowlist"
    notes: Optional[str] = None


class WalletCreate(BaseModel):
    name: str
    evm_address: str
    secret_ref: str
    secret_backend: str = "env"
    chain_id: int = 137
    is_shared: bool = False


# ------------------------------------------------------------------
# Agents CRUD
# ------------------------------------------------------------------

@router.get("/agents")
async def list_agents() -> List[Dict]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("""
                SELECT a.id, a.name, a.description, a.mode, a.status, a.is_enabled,
                       a.is_simulate, a.manual_approve, a.kill_switch,
                       a.wallet_profile_id, a.created_at, a.updated_at
                FROM agents a
                ORDER BY a.created_at DESC
            """)
        )
        return [dict(r._mapping) for r in result.fetchall()]


@router.post("/agents")
async def create_agent(body: AgentCreate) -> Dict:
    agent_id = str(uuid.uuid4())
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("""
                INSERT INTO agents
                    (id, name, description, mode, status, is_enabled, is_simulate,
                     manual_approve, kill_switch, wallet_profile_id, created_at, updated_at)
                VALUES
                    (:id, :name, :desc, :mode, 'idle', FALSE, :simulate,
                     :manual, FALSE, :wallet_id, NOW(), NOW())
            """),
            {
                "id": agent_id,
                "name": body.name,
                "desc": body.description,
                "mode": body.mode,
                "simulate": body.is_simulate,
                "manual": body.manual_approve,
                "wallet_id": body.wallet_profile_id,
            },
        )
        # Create default risk limits
        await db.execute(
            text("""
                INSERT INTO agent_risk_limits
                    (agent_id, max_order_size_usdc, max_exposure_usdc, daily_loss_cap_usdc,
                     slippage_cap_pct, cooldown_seconds, max_open_orders)
                VALUES
                    (:agent_id, 100, 500, 200, 3.0, 60, 10)
            """),
            {"agent_id": agent_id},
        )
        await db.execute(
            text("""
                INSERT INTO audit_logs (event_type, agent_id, message, severity)
                VALUES ('agent_created', :id, :msg, 'info')
            """),
            {"id": agent_id, "msg": f"Agent {body.name} created"},
        )
        await db.commit()
    return {"id": agent_id, "name": body.name, "status": "idle"}


@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str) -> Dict:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("SELECT * FROM agents WHERE id = :id"),
            {"id": agent_id},
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Agent not found")
        return dict(row._mapping)


@router.patch("/agents/{agent_id}")
async def update_agent(agent_id: str, body: AgentUpdate) -> Dict:
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_parts = [f"{k} = :{k}" for k in updates]
    set_parts.append("updated_at = NOW()")
    set_clause = ", ".join(set_parts)
    updates["id"] = agent_id

    async with AsyncSessionLocal() as db:
        await db.execute(
            text(f"UPDATE agents SET {set_clause} WHERE id = :id"),
            updates,
        )
        await db.execute(
            text("INSERT INTO audit_logs (event_type, agent_id, message, severity) VALUES ('agent_updated', :id, 'Agent updated', 'info')"),
            {"id": agent_id},
        )
        await db.commit()
    return {"id": agent_id, "updated": True}


@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str) -> Dict:
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("DELETE FROM agents WHERE id = :id"),
            {"id": agent_id},
        )
        await db.commit()
    return {"id": agent_id, "deleted": True}


@router.post("/agents/{agent_id}/start")
async def start_agent(agent_id: str) -> Dict:
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("UPDATE agents SET status = 'running', is_enabled = TRUE, updated_at = NOW() WHERE id = :id"),
            {"id": agent_id},
        )
        await db.execute(
            text("INSERT INTO audit_logs (event_type, agent_id, message, severity) VALUES ('agent_started', :id, 'Agent started', 'info')"),
            {"id": agent_id},
        )
        await db.commit()
    return {"id": agent_id, "status": "running"}


@router.post("/agents/{agent_id}/stop")
async def stop_agent(agent_id: str) -> Dict:
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("UPDATE agents SET status = 'stopped', is_enabled = FALSE, updated_at = NOW() WHERE id = :id"),
            {"id": agent_id},
        )
        await db.execute(
            text("INSERT INTO audit_logs (event_type, agent_id, message, severity) VALUES ('agent_stopped', :id, 'Agent stopped', 'info')"),
            {"id": agent_id},
        )
        await db.commit()
    return {"id": agent_id, "status": "stopped"}


# ------------------------------------------------------------------
# Risk limits
# ------------------------------------------------------------------

@router.get("/agents/{agent_id}/risk")
async def get_risk_limits(agent_id: str) -> Dict:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("SELECT * FROM agent_risk_limits WHERE agent_id = :id"),
            {"id": agent_id},
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Risk limits not found")
        return dict(row._mapping)


@router.put("/agents/{agent_id}/risk")
async def update_risk_limits(agent_id: str, body: RiskLimitsUpdate) -> Dict:
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("""
                INSERT INTO agent_risk_limits
                    (agent_id, max_order_size_usdc, max_exposure_usdc, daily_loss_cap_usdc,
                     slippage_cap_pct, cooldown_seconds, max_open_orders)
                VALUES
                    (:agent_id, :max_order, :max_exp, :loss_cap, :slippage, :cooldown, :max_orders)
                ON CONFLICT (agent_id) DO UPDATE SET
                    max_order_size_usdc = EXCLUDED.max_order_size_usdc,
                    max_exposure_usdc = EXCLUDED.max_exposure_usdc,
                    daily_loss_cap_usdc = EXCLUDED.daily_loss_cap_usdc,
                    slippage_cap_pct = EXCLUDED.slippage_cap_pct,
                    cooldown_seconds = EXCLUDED.cooldown_seconds,
                    max_open_orders = EXCLUDED.max_open_orders,
                    updated_at = NOW()
            """),
            {
                "agent_id": agent_id,
                "max_order": body.max_order_size_usdc,
                "max_exp": body.max_exposure_usdc,
                "loss_cap": body.daily_loss_cap_usdc,
                "slippage": body.slippage_cap_pct,
                "cooldown": body.cooldown_seconds,
                "max_orders": body.max_open_orders,
            },
        )
        await db.commit()
    return {"agent_id": agent_id, "updated": True}


# ------------------------------------------------------------------
# Market permissions
# ------------------------------------------------------------------

@router.get("/agents/{agent_id}/markets")
async def get_market_permissions(agent_id: str) -> List[Dict]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("SELECT * FROM agent_market_permissions WHERE agent_id = :id ORDER BY created_at"),
            {"id": agent_id},
        )
        return [dict(r._mapping) for r in result.fetchall()]


@router.post("/agents/{agent_id}/markets")
async def add_market_permission(agent_id: str, body: MarketPermissionCreate) -> Dict:
    perm_id = str(uuid.uuid4())
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("""
                INSERT INTO agent_market_permissions
                    (id, agent_id, condition_id, permission_type, notes, created_at)
                VALUES
                    (:id, :agent_id, :cid, :ptype, :notes, NOW())
                ON CONFLICT (agent_id, condition_id) DO NOTHING
            """),
            {
                "id": perm_id,
                "agent_id": agent_id,
                "cid": body.condition_id,
                "ptype": body.permission_type,
                "notes": body.notes,
            },
        )
        await db.commit()
    return {"id": perm_id, "agent_id": agent_id, "condition_id": body.condition_id}


@router.delete("/agents/{agent_id}/markets/{perm_id}")
async def remove_market_permission(agent_id: str, perm_id: str) -> Dict:
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("DELETE FROM agent_market_permissions WHERE id = :id AND agent_id = :agent_id"),
            {"id": perm_id, "agent_id": agent_id},
        )
        await db.commit()
    return {"deleted": True}


# ------------------------------------------------------------------
# Wallets
# ------------------------------------------------------------------

@router.get("/wallets")
async def list_wallets() -> List[Dict]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("SELECT id, name, evm_address, is_shared, chain_id, secret_backend FROM wallet_profiles ORDER BY name")
        )
        return [dict(r._mapping) for r in result.fetchall()]


@router.post("/wallets")
async def create_wallet(body: WalletCreate) -> Dict:
    wallet_id = str(uuid.uuid4())
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("""
                INSERT INTO wallet_profiles
                    (id, name, evm_address, secret_ref, secret_backend, chain_id, is_shared, created_at, updated_at)
                VALUES
                    (:id, :name, :addr, :ref, :backend, :chain_id, :shared, NOW(), NOW())
            """),
            {
                "id": wallet_id,
                "name": body.name,
                "addr": body.evm_address,
                "ref": body.secret_ref,
                "backend": body.secret_backend,
                "chain_id": body.chain_id,
                "shared": body.is_shared,
            },
        )
        await db.commit()
    return {"id": wallet_id, "name": body.name}
