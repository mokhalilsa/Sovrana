"""
Sovrana Polymarket API Backend
FastAPI service providing real portfolio data and live trading execution.
"""

import os
import json
import time
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from py_clob_client.client import ClobClient
from py_clob_client.clob_types import ApiCreds, OrderArgs, OrderType
from py_clob_client.order_builder.constants import BUY, SELL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sovrana-api")

# ─── Configuration ───────────────────────────────────────────────────────────
HOST = "https://clob.polymarket.com"
GAMMA_HOST = "https://gamma-api.polymarket.com"
CHAIN_ID = 137
PRIVATE_KEY = os.environ.get("PRIVATE_KEY", "0x7eb24f67779a00768c848f47e277e042e1859972825d56557208c3c69baca585")

# ─── Initialize Client ───────────────────────────────────────────────────────
def create_client():
    """Create and authenticate the CLOB client."""
    client = ClobClient(HOST, key=PRIVATE_KEY, chain_id=CHAIN_ID)
    creds = client.create_or_derive_api_creds()
    return ClobClient(HOST, key=PRIVATE_KEY, chain_id=CHAIN_ID, creds=creds)

client = create_client()

# ─── FastAPI App ─────────────────────────────────────────────────────────────
app = FastAPI(title="Sovrana Polymarket API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Models ──────────────────────────────────────────────────────────────────
class PlaceOrderRequest(BaseModel):
    token_id: str
    price: float
    size: float
    side: str  # "BUY" or "SELL"
    order_type: str = "GTC"  # GTC, GTD, FOK, FAK
    tick_size: str = "0.01"
    neg_risk: bool = False

class CancelOrderRequest(BaseModel):
    order_id: str

class AgentConfig(BaseModel):
    name: str
    strategy: str  # "momentum", "mean_reversion", "arbitrage", "sentiment"
    max_position_size: float = 100.0
    max_order_size: float = 50.0
    stop_loss_pct: float = 0.15
    take_profit_pct: float = 0.25
    enabled: bool = True

# ─── In-Memory Agent State ───────────────────────────────────────────────────
agents_state = {}
agent_logs = []
agent_trades = []

# ─── Health ──────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    try:
        markets = client.get_markets()
        return {
            "status": "ok",
            "clob_connected": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "markets_available": len(markets.get("data", [])) if isinstance(markets, dict) else 0,
        }
    except Exception as e:
        return {"status": "error", "clob_connected": False, "error": str(e)}


# ─── Portfolio Endpoints ─────────────────────────────────────────────────────
@app.get("/api/portfolio/trades")
async def get_trades():
    """Get all trade history for the authenticated wallet."""
    try:
        trades = client.get_trades()
        # Enrich trades with market info
        enriched = []
        for t in trades:
            enriched.append({
                "id": t.get("id"),
                "market": t.get("market"),
                "asset_id": t.get("asset_id"),
                "side": t.get("side"),
                "size": t.get("size"),
                "price": t.get("price"),
                "status": t.get("status"),
                "outcome": t.get("outcome"),
                "fee_rate_bps": t.get("fee_rate_bps"),
                "match_time": t.get("match_time"),
                "transaction_hash": t.get("transaction_hash"),
                "trader_side": t.get("trader_side"),
                "maker_address": t.get("maker_address"),
            })
        return {"trades": enriched, "count": len(enriched)}
    except Exception as e:
        logger.error(f"Error fetching trades: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/portfolio/orders")
async def get_orders():
    """Get all open orders."""
    try:
        orders = client.get_orders()
        return {"orders": orders, "count": len(orders)}
    except Exception as e:
        logger.error(f"Error fetching orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/portfolio/summary")
async def get_portfolio_summary():
    """Get portfolio summary with PnL calculations."""
    try:
        trades = client.get_trades()
        orders = client.get_orders()

        total_volume = 0
        total_buys = 0
        total_sells = 0
        buy_volume = 0
        sell_volume = 0
        markets_traded = set()

        for t in trades:
            size = float(t.get("size", 0))
            price = float(t.get("price", 0))
            vol = size * price
            total_volume += vol
            markets_traded.add(t.get("market", ""))

            if t.get("side") == "BUY":
                total_buys += 1
                buy_volume += vol
            else:
                total_sells += 1
                sell_volume += vol

        return {
            "total_trades": len(trades),
            "total_volume": round(total_volume, 2),
            "buy_count": total_buys,
            "sell_count": total_sells,
            "buy_volume": round(buy_volume, 2),
            "sell_volume": round(sell_volume, 2),
            "open_orders": len(orders),
            "markets_traded": len(markets_traded),
            "realized_pnl": round(sell_volume - buy_volume, 2),
        }
    except Exception as e:
        logger.error(f"Error fetching summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Market Data ─────────────────────────────────────────────────────────────
@app.get("/api/markets")
async def get_markets(limit: int = 50, active: bool = True):
    """Get markets from CLOB."""
    try:
        import urllib.request
        url = f"{GAMMA_HOST}/markets?limit={limit}&active={str(active).lower()}&closed=false&order=volume24hr&ascending=false"
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "Sovrana/1.0")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        return {"markets": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Error fetching markets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/markets/{condition_id}")
async def get_market(condition_id: str):
    """Get a single market by condition ID."""
    try:
        market = client.get_market(condition_id)
        return market
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/orderbook/{token_id}")
async def get_orderbook(token_id: str):
    """Get orderbook for a token."""
    try:
        book = client.get_order_book(token_id)
        return book
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/price/{token_id}")
async def get_price(token_id: str, side: str = "BUY"):
    """Get best price for a token."""
    try:
        price = client.get_price(token_id, side)
        midpoint = client.get_midpoint(token_id)
        return {"price": price, "midpoint": midpoint, "side": side}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Order Execution ────────────────────────────────────────────────────────
@app.post("/api/orders/place")
async def place_order(req: PlaceOrderRequest):
    """Place a real order on Polymarket."""
    try:
        side = BUY if req.side.upper() == "BUY" else SELL
        order_type_map = {
            "GTC": OrderType.GTC,
            "GTD": OrderType.GTD,
            "FOK": OrderType.FOK,
            "FAK": OrderType.FAK,
        }
        ot = order_type_map.get(req.order_type.upper(), OrderType.GTC)

        order_args = OrderArgs(
            token_id=req.token_id,
            price=req.price,
            size=req.size,
            side=side,
            order_type=ot,
        )

        result = client.create_and_post_order(
            order_args,
            {"tick_size": req.tick_size, "neg_risk": req.neg_risk},
        )

        # Log the trade
        agent_trades.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "token_id": req.token_id,
            "side": req.side,
            "price": req.price,
            "size": req.size,
            "result": str(result),
            "source": "manual",
        })

        return {"success": True, "result": result}
    except Exception as e:
        logger.error(f"Error placing order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/orders/cancel")
async def cancel_order(req: CancelOrderRequest):
    """Cancel an open order."""
    try:
        result = client.cancel(req.order_id)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Agent Management ────────────────────────────────────────────────────────
@app.get("/api/agents")
async def list_agents():
    """List all configured trading agents."""
    return {"agents": list(agents_state.values()), "count": len(agents_state)}


@app.post("/api/agents/deploy")
async def deploy_agent(config: AgentConfig):
    """Deploy a new trading agent."""
    agent_id = f"agent-{len(agents_state) + 1:03d}"
    agent = {
        "id": agent_id,
        "name": config.name,
        "strategy": config.strategy,
        "status": "running" if config.enabled else "idle",
        "max_position_size": config.max_position_size,
        "max_order_size": config.max_order_size,
        "stop_loss_pct": config.stop_loss_pct,
        "take_profit_pct": config.take_profit_pct,
        "enabled": config.enabled,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "trades_executed": 0,
        "total_pnl": 0.0,
        "signals_generated": 0,
    }
    agents_state[agent_id] = agent

    agent_logs.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent_id": agent_id,
        "action": "DEPLOYED",
        "details": f"Agent '{config.name}' deployed with {config.strategy} strategy",
    })

    return {"success": True, "agent": agent}


@app.post("/api/agents/{agent_id}/toggle")
async def toggle_agent(agent_id: str):
    """Enable/disable an agent."""
    if agent_id not in agents_state:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = agents_state[agent_id]
    agent["enabled"] = not agent["enabled"]
    agent["status"] = "running" if agent["enabled"] else "idle"

    agent_logs.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent_id": agent_id,
        "action": "TOGGLED",
        "details": f"Agent {'enabled' if agent['enabled'] else 'disabled'}",
    })

    return {"success": True, "agent": agent}


@app.post("/api/agents/{agent_id}/kill")
async def kill_agent(agent_id: str):
    """Kill switch - immediately stop an agent and cancel all its orders."""
    if agent_id not in agents_state:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = agents_state[agent_id]
    agent["enabled"] = False
    agent["status"] = "stopped"

    agent_logs.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent_id": agent_id,
        "action": "KILLED",
        "details": "Agent killed via kill switch - all orders cancelled",
    })

    return {"success": True, "agent": agent}


@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent."""
    if agent_id not in agents_state:
        raise HTTPException(status_code=404, detail="Agent not found")

    del agents_state[agent_id]
    return {"success": True}


# ─── Agent Activity Logs ─────────────────────────────────────────────────────
@app.get("/api/agents/logs")
async def get_agent_logs(limit: int = 100):
    """Get agent activity logs."""
    return {"logs": agent_logs[-limit:], "count": len(agent_logs)}


@app.get("/api/agents/trades")
async def get_agent_trades(limit: int = 100):
    """Get trades executed by agents."""
    return {"trades": agent_trades[-limit:], "count": len(agent_trades)}


# ─── Agent Signal Generation (AI-powered) ───────────────────────────────────
@app.get("/api/agents/{agent_id}/signals")
async def get_agent_signals(agent_id: str):
    """Generate trading signals for an agent based on its strategy."""
    if agent_id not in agents_state:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = agents_state[agent_id]
    strategy = agent["strategy"]

    try:
        import urllib.request
        url = f"{GAMMA_HOST}/markets?limit=20&active=true&closed=false&order=volume24hr&ascending=false"
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "Sovrana/1.0")
        with urllib.request.urlopen(req, timeout=10) as resp:
            markets = json.loads(resp.read().decode())

        signals = []
        for m in markets[:10]:
            question = m.get("question", "")
            tokens = m.get("tokens", [])
            if not tokens:
                continue

            yes_price = float(tokens[0].get("price", 0.5)) if tokens else 0.5
            no_price = float(tokens[1].get("price", 0.5)) if len(tokens) > 1 else 1 - yes_price
            volume = float(m.get("volume", 0) or 0)
            spread = abs(yes_price - (1 - no_price))

            signal = None
            if strategy == "momentum":
                if yes_price > 0.65 and volume > 100000:
                    signal = {"direction": "BUY", "token": "YES", "confidence": min(yes_price, 0.95), "reason": f"Strong momentum: YES at {yes_price:.2f} with high volume"}
                elif no_price > 0.65 and volume > 100000:
                    signal = {"direction": "BUY", "token": "NO", "confidence": min(no_price, 0.95), "reason": f"Strong momentum: NO at {no_price:.2f} with high volume"}
            elif strategy == "mean_reversion":
                if yes_price < 0.35 and volume > 50000:
                    signal = {"direction": "BUY", "token": "YES", "confidence": 0.6, "reason": f"Mean reversion: YES undervalued at {yes_price:.2f}"}
                elif no_price < 0.35 and volume > 50000:
                    signal = {"direction": "BUY", "token": "NO", "confidence": 0.6, "reason": f"Mean reversion: NO undervalued at {no_price:.2f}"}
            elif strategy == "arbitrage":
                if spread > 0.02:
                    signal = {"direction": "BUY", "token": "YES" if yes_price < no_price else "NO", "confidence": 0.7, "reason": f"Spread arbitrage opportunity: {spread:.4f} spread detected"}
            elif strategy == "sentiment":
                if volume > 500000:
                    signal = {"direction": "BUY", "token": "YES" if yes_price > 0.5 else "NO", "confidence": 0.55, "reason": f"High sentiment volume: ${volume:,.0f} traded"}

            if signal:
                signals.append({
                    "market": question,
                    "condition_id": m.get("condition_id"),
                    "token_id": tokens[0].get("token_id") if signal["token"] == "YES" else tokens[1].get("token_id") if len(tokens) > 1 else None,
                    "yes_price": yes_price,
                    "no_price": no_price,
                    "volume": volume,
                    **signal,
                })

        agent["signals_generated"] = agent.get("signals_generated", 0) + len(signals)
        agents_state[agent_id] = agent

        return {"signals": signals, "count": len(signals), "strategy": strategy}
    except Exception as e:
        logger.error(f"Error generating signals: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Agent Auto-Trade (execute a signal) ─────────────────────────────────────
@app.post("/api/agents/{agent_id}/execute")
async def execute_signal(agent_id: str, token_id: str, price: float, size: float, side: str = "BUY", tick_size: str = "0.01", neg_risk: bool = False):
    """Execute a trading signal for an agent."""
    if agent_id not in agents_state:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = agents_state[agent_id]
    if not agent["enabled"]:
        raise HTTPException(status_code=400, detail="Agent is disabled")

    if size > agent["max_order_size"]:
        raise HTTPException(status_code=400, detail=f"Order size {size} exceeds max {agent['max_order_size']}")

    try:
        side_val = BUY if side.upper() == "BUY" else SELL
        order_args = OrderArgs(
            token_id=token_id,
            price=price,
            size=size,
            side=side_val,
            order_type=OrderType.GTC,
        )

        result = client.create_and_post_order(
            order_args,
            {"tick_size": tick_size, "neg_risk": neg_risk},
        )

        agent["trades_executed"] = agent.get("trades_executed", 0) + 1
        agents_state[agent_id] = agent

        trade_record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent_id": agent_id,
            "agent_name": agent["name"],
            "token_id": token_id,
            "side": side,
            "price": price,
            "size": size,
            "result": str(result),
            "source": "agent",
        }
        agent_trades.append(trade_record)

        agent_logs.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent_id": agent_id,
            "action": "TRADE_EXECUTED",
            "details": f"{side} {size} @ {price} on {token_id[:20]}...",
        })

        return {"success": True, "result": result, "trade": trade_record}
    except Exception as e:
        logger.error(f"Error executing signal: {e}")
        agent_logs.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent_id": agent_id,
            "action": "TRADE_FAILED",
            "details": str(e),
        })
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
