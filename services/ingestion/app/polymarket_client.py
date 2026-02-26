"""
Polymarket API client wrapper.
Provides read-only access to Gamma API, Data API, and CLOB orderbook endpoints.
This module must never be used for order placement; that is the Execution Service responsibility.
"""

import hashlib
import hmac
import time
from typing import Any, Dict, List, Optional

import httpx
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings


class PolymarketClient:
    """
    Unified client for Polymarket public and authenticated APIs.
    All methods are read-only from an ingestion perspective.
    """

    def __init__(self):
        self.gamma_base = settings.gamma_api_base
        self.data_base = settings.data_api_base
        self.clob_base = settings.clob_api_base
        self._http = httpx.AsyncClient(timeout=30.0)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _clob_auth_headers(self, method: str, path: str, body: str = "") -> Dict[str, str]:
        """
        Generate HMAC-SHA256 authentication headers for the CLOB API.
        Required for authenticated endpoints (cancel, place order).
        Ingestion only calls public endpoints; execution service uses these.
        """
        if not settings.polymarket_api_key:
            return {}
        timestamp = str(int(time.time()))
        message = timestamp + method.upper() + path + body
        signature = hmac.new(
            settings.polymarket_api_secret.encode(),
            message.encode(),
            hashlib.sha256,
        ).hexdigest()
        return {
            "POLY-API-KEY": settings.polymarket_api_key,
            "POLY-TIMESTAMP": timestamp,
            "POLY-SIGNATURE": signature,
            "POLY-PASSPHRASE": settings.polymarket_api_passphrase or "",
        }

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def _get(self, base: str, path: str, params: Optional[Dict] = None) -> Any:
        url = f"{base}{path}"
        response = await self._http.get(url, params=params or {})
        response.raise_for_status()
        return response.json()

    # ------------------------------------------------------------------
    # Gamma API  markets and events discovery
    # ------------------------------------------------------------------

    async def get_markets(
        self,
        limit: int = 100,
        offset: int = 0,
        active: bool = True,
        category: Optional[str] = None,
    ) -> List[Dict]:
        """Fetch paginated list of prediction markets from Gamma API."""
        params: Dict[str, Any] = {"limit": limit, "offset": offset, "active": active}
        if category:
            params["category"] = category
        try:
            data = await self._get(self.gamma_base, "/markets", params)
            if isinstance(data, list):
                return data
            return data.get("markets", [])
        except Exception as exc:
            logger.error(f"get_markets failed: {exc}")
            return []

    async def get_market(self, condition_id: str) -> Optional[Dict]:
        """Fetch a single market by condition ID."""
        try:
            return await self._get(self.gamma_base, f"/markets/{condition_id}")
        except Exception as exc:
            logger.error(f"get_market {condition_id} failed: {exc}")
            return None

    async def get_events(self, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Fetch events from Gamma API."""
        try:
            data = await self._get(self.gamma_base, "/events", {"limit": limit, "offset": offset})
            if isinstance(data, list):
                return data
            return data.get("events", [])
        except Exception as exc:
            logger.error(f"get_events failed: {exc}")
            return []

    # ------------------------------------------------------------------
    # Data API  positions, activity, holders, leaderboards
    # ------------------------------------------------------------------

    async def get_positions(self, address: str) -> List[Dict]:
        """Fetch current positions for a wallet address."""
        try:
            data = await self._get(self.data_base, "/positions", {"user": address})
            if isinstance(data, list):
                return data
            return data.get("positions", [])
        except Exception as exc:
            logger.error(f"get_positions for {address} failed: {exc}")
            return []

    async def get_activity(self, address: str, limit: int = 100) -> List[Dict]:
        """Fetch trading activity for a wallet address."""
        try:
            data = await self._get(
                self.data_base, "/activity", {"user": address, "limit": limit}
            )
            if isinstance(data, list):
                return data
            return data.get("activity", [])
        except Exception as exc:
            logger.error(f"get_activity for {address} failed: {exc}")
            return []

    async def get_open_interest(self, condition_id: str) -> Optional[Dict]:
        """Fetch open interest for a market."""
        try:
            return await self._get(self.data_base, f"/markets/{condition_id}/open-interest")
        except Exception as exc:
            logger.error(f"get_open_interest {condition_id} failed: {exc}")
            return None

    async def get_leaderboard(self, limit: int = 50) -> List[Dict]:
        """Fetch trader leaderboard."""
        try:
            data = await self._get(self.data_base, "/leaderboard", {"limit": limit})
            if isinstance(data, list):
                return data
            return data.get("traders", [])
        except Exception as exc:
            logger.error(f"get_leaderboard failed: {exc}")
            return []

    # ------------------------------------------------------------------
    # CLOB API  order book (read only)
    # ------------------------------------------------------------------

    async def get_orderbook(self, token_id: str) -> Optional[Dict]:
        """
        Fetch current order book for a token (YES or NO side of a market).
        token_id is the CTF token identifier for a market outcome.
        """
        try:
            return await self._get(self.clob_base, f"/book", {"token_id": token_id})
        except Exception as exc:
            logger.error(f"get_orderbook for {token_id} failed: {exc}")
            return None

    async def get_price(self, token_id: str, side: str = "buy") -> Optional[float]:
        """Get best price for a token on a given side."""
        try:
            data = await self._get(
                self.clob_base, "/price", {"token_id": token_id, "side": side}
            )
            return float(data.get("price", 0))
        except Exception as exc:
            logger.error(f"get_price for {token_id}/{side} failed: {exc}")
            return None

    async def get_midpoint(self, token_id: str) -> Optional[float]:
        """Get midpoint price for a token."""
        try:
            data = await self._get(self.clob_base, "/midpoint", {"token_id": token_id})
            return float(data.get("mid", 0))
        except Exception as exc:
            logger.error(f"get_midpoint for {token_id} failed: {exc}")
            return None

    async def get_spread(self, token_id: str) -> Optional[Dict]:
        """Get bid-ask spread for a token."""
        try:
            return await self._get(self.clob_base, "/spread", {"token_id": token_id})
        except Exception as exc:
            logger.error(f"get_spread for {token_id} failed: {exc}")
            return None

    async def get_trades(self, condition_id: str, limit: int = 100) -> List[Dict]:
        """Fetch recent trades for a market condition."""
        try:
            data = await self._get(
                self.clob_base, "/trades", {"condition_id": condition_id, "limit": limit}
            )
            if isinstance(data, list):
                return data
            return data.get("trades", [])
        except Exception as exc:
            logger.error(f"get_trades for {condition_id} failed: {exc}")
            return []

    async def close(self):
        await self._http.aclose()
