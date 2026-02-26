"""
Agent strategy endpoints for the Brain Service.
"""

import json
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.database import AsyncSessionLocal

router = APIRouter()


class StrategyAssign(BaseModel):
    template_type: str
    config: Dict[str, Any] = {}


@router.get("/agents/{agent_id}/strategy")
async def get_agent_strategy(agent_id: str) -> Dict:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("""
                SELECT as2.id, as2.agent_id, as2.strategy_id, as2.config, as2.is_active,
                       s.name AS strategy_name, s.template_type
                FROM agent_strategies as2
                JOIN strategies s ON s.id = as2.strategy_id
                WHERE as2.agent_id = :agent_id AND as2.is_active = TRUE
                LIMIT 1
            """),
            {"agent_id": agent_id},
        )
        row = result.fetchone()
        if not row:
            return {}
        return dict(row._mapping)


@router.post("/agents/{agent_id}/strategy")
async def assign_strategy(agent_id: str, body: StrategyAssign) -> Dict:
    async with AsyncSessionLocal() as db:
        # Check if strategy template exists, create if not
        result = await db.execute(
            text("SELECT id FROM strategies WHERE template_type = :ttype"),
            {"ttype": body.template_type},
        )
        row = result.fetchone()
        if row:
            strategy_id = str(row[0])
        else:
            strategy_id = str(uuid.uuid4())
            await db.execute(
                text("""
                    INSERT INTO strategies (id, name, template_type, config_schema)
                    VALUES (:id, :name, :ttype, :schema)
                """),
                {
                    "id": strategy_id,
                    "name": body.template_type.replace("_", " ").title(),
                    "ttype": body.template_type,
                    "schema": json.dumps(body.config),
                },
            )

        # Deactivate old strategies for agent
        await db.execute(
            text("UPDATE agent_strategies SET is_active = FALSE WHERE agent_id = :agent_id"),
            {"agent_id": agent_id},
        )

        # Assign new strategy
        assign_id = str(uuid.uuid4())
        await db.execute(
            text("""
                INSERT INTO agent_strategies (id, agent_id, strategy_id, config, is_active, created_at, updated_at)
                VALUES (:id, :agent_id, :strategy_id, :config, TRUE, NOW(), NOW())
                ON CONFLICT (agent_id, strategy_id) DO UPDATE SET
                    config = EXCLUDED.config, is_active = TRUE, updated_at = NOW()
            """),
            {
                "id": assign_id,
                "agent_id": agent_id,
                "strategy_id": strategy_id,
                "config": json.dumps(body.config),
            },
        )
        await db.commit()
    return {"agent_id": agent_id, "strategy_id": strategy_id, "template_type": body.template_type}
