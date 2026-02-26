"""
Ingestion Service  Read-only data ingestion from Polymarket APIs.
Exposes internal REST endpoints for Brain and Execution services to query cached data.
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
from app.market_poller import MarketPoller
from app.polymarket_client import PolymarketClient

poller = MarketPoller()
client = PolymarketClient()
redis_client: Optional[aioredis.Redis] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
    asyncio.create_task(poller.start())
    logger.info("Ingestion service started")
    yield
    await poller.stop()
    await redis_client.aclose()
    logger.info("Ingestion service stopped")


app = FastAPI(
    title="Sovrana Ingestion Service",
    description="Read-only data ingestion from Polymarket",
    version="1.0.0",
    lifespan=lifespan,
)


# ------------------------------------------------------------------
# Health
# ------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.service_name}


# ------------------------------------------------------------------
# Markets
# ------------------------------------------------------------------

@app.get("/markets")
async def list_markets(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    active: bool = Query(True),
) -> List[Dict]:
    """Return most recent market snapshots from DB."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("""
                SELECT DISTINCT ON (condition_id)
                    condition_id, question, category, end_date,
                    yes_price, no_price, volume_24h, open_interest,
                    active, snapshotted_at
                FROM market_snapshots
                WHERE active = :active
                ORDER BY condition_id, snapshotted_at DESC
                LIMIT :limit OFFSET :offset
            """),
            {"active": active, "limit": limit, "offset": offset},
        )
        rows = result.fetchall()
        return [dict(r._mapping) for r in rows]


@app.get("/markets/{condition_id}")
async def get_market(condition_id: str) -> Dict:
    """Return cached market data or live from Gamma API."""
    cached = await redis_client.get(f"market:{condition_id}:latest")
    if cached:
        return json.loads(cached)

    market = await client.get_market(condition_id)
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    return market


# ------------------------------------------------------------------
# Orderbooks
# ------------------------------------------------------------------

@app.get("/orderbook/{token_id}")
async def get_orderbook(token_id: str) -> Dict:
    """Return cached orderbook for a token."""
    cached = await redis_client.get(f"orderbook:{token_id}:latest")
    if cached:
        return json.loads(cached)

    book = await client.get_orderbook(token_id)
    if not book:
        raise HTTPException(status_code=404, detail="Orderbook not found")
    return book


@app.get("/price/{token_id}")
async def get_price(token_id: str, side: str = Query("buy")) -> Dict:
    price = await client.get_price(token_id, side)
    return {"token_id": token_id, "side": side, "price": price}


@app.get("/midpoint/{token_id}")
async def get_midpoint(token_id: str) -> Dict:
    mid = await client.get_midpoint(token_id)
    return {"token_id": token_id, "mid": mid}


# ------------------------------------------------------------------
# Positions (for a given wallet address)
# ------------------------------------------------------------------

@app.get("/positions/{address}")
async def get_positions(address: str) -> List[Dict]:
    return await client.get_positions(address)


@app.get("/activity/{address}")
async def get_activity(
    address: str,
    limit: int = Query(100, ge=1, le=500),
) -> List[Dict]:
    return await client.get_activity(address, limit)


# ------------------------------------------------------------------
# Trades
# ------------------------------------------------------------------

@app.get("/trades/{condition_id}")
async def get_trades(
    condition_id: str,
    limit: int = Query(100, ge=1, le=500),
) -> List[Dict]:
    return await client.get_trades(condition_id, limit)


# ------------------------------------------------------------------
# Leaderboard
# ------------------------------------------------------------------

@app.get("/leaderboard")
async def leaderboard(limit: int = Query(50, ge=1, le=200)) -> List[Dict]:
    return await client.get_leaderboard(limit)


# ------------------------------------------------------------------
# Open interest
# ------------------------------------------------------------------

@app.get("/open-interest/{condition_id}")
async def open_interest(condition_id: str) -> Dict:
    data = await client.get_open_interest(condition_id)
    if not data:
        raise HTTPException(status_code=404, detail="No open interest data found")
    return data
