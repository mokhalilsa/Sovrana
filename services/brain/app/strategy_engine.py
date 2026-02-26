"""
Strategy Engine: Evaluates registered strategy templates against market data
and produces trade signals. Each strategy is a pluggable class that follows
the BaseStrategy interface. The Brain service routes each agent to the correct
strategy class based on agent_strategies.config.
"""

import abc
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
import numpy as np
from loguru import logger

from app.config import settings


# ------------------------------------------------------------------
# Signal data class (returned by all strategies)
# ------------------------------------------------------------------

class SignalOutput:
    def __init__(
        self,
        condition_id: str,
        token_id: str,
        side: str,
        price: float,
        size_usdc: float,
        confidence: float,
        time_horizon: int = 3600,
        raw_data: Optional[Dict] = None,
    ):
        self.condition_id = condition_id
        self.token_id = token_id
        self.side = side
        self.price = price
        self.size_usdc = size_usdc
        self.confidence = confidence
        self.time_horizon = time_horizon
        self.raw_data = raw_data or {}
        self.created_at = datetime.now(timezone.utc)

    def to_dict(self) -> Dict:
        return {
            "condition_id": self.condition_id,
            "token_id": self.token_id,
            "side": self.side,
            "price": self.price,
            "size_usdc": self.size_usdc,
            "confidence": self.confidence,
            "time_horizon": self.time_horizon,
            "raw_data": self.raw_data,
            "created_at": self.created_at.isoformat(),
        }


# ------------------------------------------------------------------
# Base strategy interface
# ------------------------------------------------------------------

class BaseStrategy(abc.ABC):
    """All strategies implement this interface."""

    template_type: str = "base"

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.confidence_threshold = float(config.get("confidence_threshold", settings.default_confidence_threshold))
        self.max_size_usdc = float(config.get("max_size_usdc", 50))
        self.time_horizon = int(config.get("time_horizon", 3600))
        self.http = httpx.AsyncClient(timeout=10.0)

    @abc.abstractmethod
    async def evaluate(self, market_data: Dict, orderbook: Dict) -> Optional[SignalOutput]:
        """Evaluate market data and return a signal or None."""
        ...

    async def fetch_market_data(self, condition_id: str) -> Optional[Dict]:
        try:
            r = await self.http.get(f"{settings.ingestion_url}/markets/{condition_id}")
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            logger.warning(f"fetch_market_data failed for {condition_id}: {exc}")
            return None

    async def fetch_orderbook(self, token_id: str) -> Optional[Dict]:
        try:
            r = await self.http.get(f"{settings.ingestion_url}/orderbook/{token_id}")
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            logger.warning(f"fetch_orderbook failed for {token_id}: {exc}")
            return None

    async def close(self):
        await self.http.aclose()


# ------------------------------------------------------------------
# Strategy 1: Mean Reversion
# Buys YES when market price is significantly below a calculated fair value
# based on recent price history, sells when above fair value.
# ------------------------------------------------------------------

class MeanReversionStrategy(BaseStrategy):
    template_type = "mean_reversion"

    def __init__(self, config: Dict):
        super().__init__(config)
        self.deviation_threshold = float(config.get("deviation_threshold", 0.08))
        self.lookback_periods = int(config.get("lookback_periods", 10))

    async def evaluate(self, market_data: Dict, orderbook: Dict) -> Optional[SignalOutput]:
        condition_id = market_data.get("condition_id", "")
        yes_price = float(market_data.get("yes_price", 0) or 0)
        no_price = float(market_data.get("no_price", 0) or 0)

        if not yes_price or not no_price:
            return None

        bids = orderbook.get("bids", [])
        asks = orderbook.get("asks", [])
        if not bids or not asks:
            return None

        bid_prices = [float(b["price"]) for b in bids[:self.lookback_periods] if b.get("price")]
        ask_prices = [float(a["price"]) for a in asks[:self.lookback_periods] if a.get("price")]

        if not bid_prices or not ask_prices:
            return None

        avg_bid = np.mean(bid_prices)
        avg_ask = np.mean(ask_prices)
        mid = (avg_bid + avg_ask) / 2
        fair_value = 0.5  # Neutral prior; adjust with model

        deviation = yes_price - fair_value
        confidence = min(abs(deviation) / self.deviation_threshold, 1.0)

        if confidence < self.confidence_threshold:
            return None

        if deviation < -self.deviation_threshold:
            side = "buy"
            entry_price = float(asks[0]["price"]) if asks else yes_price
        elif deviation > self.deviation_threshold:
            side = "sell"
            entry_price = float(bids[0]["price"]) if bids else yes_price
        else:
            return None

        token_id = orderbook.get("token_id", "")

        return SignalOutput(
            condition_id=condition_id,
            token_id=token_id,
            side=side,
            price=entry_price,
            size_usdc=self.max_size_usdc * confidence,
            confidence=confidence,
            time_horizon=self.time_horizon,
            raw_data={
                "strategy": self.template_type,
                "yes_price": yes_price,
                "fair_value": fair_value,
                "deviation": deviation,
                "mid": mid,
            },
        )


# ------------------------------------------------------------------
# Strategy 2: Momentum
# Enters in the direction of recent price movement when volume is elevated.
# ------------------------------------------------------------------

class MomentumStrategy(BaseStrategy):
    template_type = "momentum"

    def __init__(self, config: Dict):
        super().__init__(config)
        self.momentum_threshold = float(config.get("momentum_threshold", 0.05))
        self.min_volume_24h = float(config.get("min_volume_24h", 10000))

    async def evaluate(self, market_data: Dict, orderbook: Dict) -> Optional[SignalOutput]:
        condition_id = market_data.get("condition_id", "")
        yes_price = float(market_data.get("yes_price", 0) or 0)
        volume_24h = float(market_data.get("volume_24h", 0) or 0)

        if not yes_price or volume_24h < self.min_volume_24h:
            return None

        asks = orderbook.get("asks", [])
        bids = orderbook.get("bids", [])
        if not asks or not bids:
            return None

        best_ask = float(asks[0]["price"])
        best_bid = float(bids[0]["price"])
        spread_pct = (best_ask - best_bid) / best_ask if best_ask else 1.0

        if spread_pct > 0.1:
            return None

        # Simplified momentum: if yes_price > 0.5 and volume high -> buy momentum
        if yes_price > 0.5 + self.momentum_threshold:
            side = "buy"
            confidence = min((yes_price - 0.5) / 0.5, 1.0)
            entry_price = best_ask
        elif yes_price < 0.5 - self.momentum_threshold:
            side = "sell"
            confidence = min((0.5 - yes_price) / 0.5, 1.0)
            entry_price = best_bid
        else:
            return None

        if confidence < self.confidence_threshold:
            return None

        token_id = orderbook.get("token_id", "")

        return SignalOutput(
            condition_id=condition_id,
            token_id=token_id,
            side=side,
            price=entry_price,
            size_usdc=self.max_size_usdc * confidence,
            confidence=confidence,
            time_horizon=self.time_horizon,
            raw_data={
                "strategy": self.template_type,
                "yes_price": yes_price,
                "volume_24h": volume_24h,
                "spread_pct": spread_pct,
            },
        )


# ------------------------------------------------------------------
# Strategy 3: Liquidity Provision (Market Making)
# Places limit orders on both sides of the book to earn spread.
# ------------------------------------------------------------------

class LiquidityProvisionStrategy(BaseStrategy):
    template_type = "liquidity_provision"

    def __init__(self, config: Dict):
        super().__init__(config)
        self.spread_target = float(config.get("spread_target", 0.02))
        self.inventory_limit_usdc = float(config.get("inventory_limit_usdc", 200))

    async def evaluate(self, market_data: Dict, orderbook: Dict) -> Optional[SignalOutput]:
        asks = orderbook.get("asks", [])
        bids = orderbook.get("bids", [])
        if not asks or not bids:
            return None

        best_ask = float(asks[0]["price"])
        best_bid = float(bids[0]["price"])
        spread = best_ask - best_bid
        mid = (best_ask + best_bid) / 2

        if spread < self.spread_target:
            return None

        condition_id = market_data.get("condition_id", "")
        token_id = orderbook.get("token_id", "")

        buy_price = mid - self.spread_target / 2
        confidence = min(spread / self.spread_target, 1.0)

        if confidence < self.confidence_threshold:
            return None

        return SignalOutput(
            condition_id=condition_id,
            token_id=token_id,
            side="buy",
            price=round(buy_price, 4),
            size_usdc=self.max_size_usdc,
            confidence=confidence,
            time_horizon=300,
            raw_data={
                "strategy": self.template_type,
                "mid": mid,
                "spread": spread,
                "buy_price": buy_price,
            },
        )


# ------------------------------------------------------------------
# Strategy registry
# ------------------------------------------------------------------

STRATEGY_REGISTRY: Dict[str, type] = {
    "mean_reversion": MeanReversionStrategy,
    "momentum": MomentumStrategy,
    "liquidity_provision": LiquidityProvisionStrategy,
}


def get_strategy(template_type: str, config: Dict) -> BaseStrategy:
    cls = STRATEGY_REGISTRY.get(template_type)
    if not cls:
        raise ValueError(f"Unknown strategy template: {template_type}")
    return cls(config)
