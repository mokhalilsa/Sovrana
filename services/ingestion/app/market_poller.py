"""
Market Poller: periodically fetches market data, orderbooks, and prices
from Polymarket and writes snapshots to Postgres and Redis.
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import List

import redis.asyncio as aioredis
from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.polymarket_client import PolymarketClient


class MarketPoller:
    def __init__(self):
        self.client = PolymarketClient()
        self.redis: aioredis.Redis = None
        self._running = False

    async def start(self):
        self.redis = aioredis.from_url(settings.redis_url, decode_responses=True)
        self._running = True
        logger.info("MarketPoller started")
        await asyncio.gather(
            self._poll_markets_loop(),
            self._poll_orderbooks_loop(),
        )

    async def stop(self):
        self._running = False
        await self.client.close()
        if self.redis:
            await self.redis.aclose()

    # ------------------------------------------------------------------
    # Market metadata polling loop
    # ------------------------------------------------------------------

    async def _poll_markets_loop(self):
        while self._running:
            try:
                await self._ingest_markets()
            except Exception as exc:
                logger.error(f"Market poll error: {exc}")
            await asyncio.sleep(settings.market_poll_interval)

    async def _ingest_markets(self):
        markets = await self.client.get_markets(limit=settings.max_markets)
        if not markets:
            return

        async with AsyncSessionLocal() as db:
            for market in markets:
                condition_id = market.get("conditionId") or market.get("condition_id", "")
                if not condition_id:
                    continue

                yes_price = self._extract_price(market, "yes")
                no_price = self._extract_price(market, "no")

                await db.execute(
                    text("""
                        INSERT INTO market_snapshots
                            (condition_id, question, category, end_date, yes_price, no_price,
                             volume_24h, open_interest, active, raw_data, snapshotted_at)
                        VALUES
                            (:condition_id, :question, :category, :end_date, :yes_price, :no_price,
                             :volume_24h, :open_interest, :active, :raw_data, NOW())
                    """),
                    {
                        "condition_id": condition_id,
                        "question": market.get("question", ""),
                        "category": market.get("category"),
                        "end_date": market.get("endDate") or market.get("end_date"),
                        "yes_price": yes_price,
                        "no_price": no_price,
                        "volume_24h": float(market.get("volume24hr", 0) or 0),
                        "open_interest": float(market.get("openInterest", 0) or 0),
                        "active": bool(market.get("active", True)),
                        "raw_data": json.dumps(market),
                    },
                )

                # Cache latest market snapshot in Redis
                cache_key = f"market:{condition_id}:latest"
                await self.redis.setex(
                    cache_key,
                    settings.market_poll_interval * 3,
                    json.dumps({
                        "condition_id": condition_id,
                        "question": market.get("question", ""),
                        "yes_price": yes_price,
                        "no_price": no_price,
                        "active": bool(market.get("active", True)),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }),
                )

            await db.commit()

        # Publish updated market list to Redis pub/sub
        await self.redis.publish("channel:markets:updated", json.dumps({"count": len(markets)}))
        logger.info(f"Ingested {len(markets)} markets")

    # ------------------------------------------------------------------
    # Orderbook polling loop
    # ------------------------------------------------------------------

    async def _poll_orderbooks_loop(self):
        while self._running:
            try:
                await self._ingest_orderbooks()
            except Exception as exc:
                logger.error(f"Orderbook poll error: {exc}")
            await asyncio.sleep(settings.orderbook_poll_interval)

    async def _ingest_orderbooks(self):
        """Fetch orderbooks for all active token IDs tracked in Redis."""
        token_keys = await self.redis.keys("market:tokens:*")
        if not token_keys:
            # Bootstrap from DB if no cache yet
            token_keys_raw = await self._load_active_token_ids()
        else:
            token_keys_raw = [k.replace("market:tokens:", "") for k in token_keys]

        if not token_keys_raw:
            return

        async with AsyncSessionLocal() as db:
            for token_id in token_keys_raw[:50]:  # Process in batches
                book = await self.client.get_orderbook(token_id)
                if not book:
                    continue

                condition_id = book.get("condition_id", "")
                bids = book.get("bids", [])
                asks = book.get("asks", [])

                best_bid = float(bids[0]["price"]) if bids else 0
                best_ask = float(asks[0]["price"]) if asks else 0
                mid = (best_bid + best_ask) / 2 if best_bid and best_ask else 0
                spread = best_ask - best_bid if best_bid and best_ask else 0

                await db.execute(
                    text("""
                        INSERT INTO orderbook_snapshots
                            (token_id, condition_id, bids, asks, spread, mid_price, snapshotted_at)
                        VALUES
                            (:token_id, :condition_id, :bids, :asks, :spread, :mid_price, NOW())
                    """),
                    {
                        "token_id": token_id,
                        "condition_id": condition_id,
                        "bids": json.dumps(bids[:20]),
                        "asks": json.dumps(asks[:20]),
                        "spread": spread,
                        "mid_price": mid,
                    },
                )

                # Cache in Redis
                cache_key = f"orderbook:{token_id}:latest"
                await self.redis.setex(
                    cache_key,
                    settings.orderbook_poll_interval * 5,
                    json.dumps({
                        "token_id": token_id,
                        "condition_id": condition_id,
                        "bids": bids[:10],
                        "asks": asks[:10],
                        "mid_price": mid,
                        "spread": spread,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }),
                )

                await self.redis.publish(
                    f"channel:orderbook:{token_id}",
                    json.dumps({"token_id": token_id, "mid": mid, "spread": spread}),
                )

            await db.commit()

    async def _load_active_token_ids(self) -> List[str]:
        """Load token IDs from the DB for markets tracked via market permissions."""
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    text("""
                        SELECT DISTINCT token_id FROM positions WHERE is_open = TRUE
                        UNION
                        SELECT DISTINCT token_id FROM orders
                            WHERE status NOT IN ('filled', 'cancelled', 'rejected')
                    """)
                )
                return [row[0] for row in result.fetchall() if row[0]]
        except Exception as exc:
            logger.warning(f"Could not load token IDs from DB: {exc}")
            return []

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _extract_price(self, market: dict, side: str) -> float:
        tokens = market.get("tokens", [])
        for token in tokens:
            outcome = str(token.get("outcome", "")).lower()
            if outcome == side:
                return float(token.get("price", 0) or 0)
        return 0.0
