"""
Polymarket Python API Service
Provides authenticated access to the Polymarket CLOB API via the official SDK.
Runs as a FastAPI microservice that the Next.js frontend proxies to.
"""

import os
import json
import logging
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from py_clob_client.client import ClobClient

# ─── Configuration ──────────────────────────────────────────────────────────

PRIVATE_KEY = os.environ.get('POLYMARKET_PRIVATE_KEY', '0x7eb24f67779a00768c848f47e277e042e1859972825d56557208c3c69baca585')
CLOB_HOST = 'https://clob.polymarket.com'
CHAIN_ID = 137

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('polymarket-service')

# ─── Initialize Client ─────────────────────────────────────────────────────

app = FastAPI(title='Sovrana Polymarket Service', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

_client: Optional[ClobClient] = None

def get_client() -> ClobClient:
    global _client
    if _client is None:
        logger.info('Initializing Polymarket CLOB client...')
        _client = ClobClient(
            host=CLOB_HOST,
            chain_id=CHAIN_ID,
            key=PRIVATE_KEY,
        )
        creds = _client.derive_api_key()
        _client.set_api_creds(creds)
        logger.info(f'Client initialized. Address: {_client.get_address()}')
    return _client

# ─── Health ─────────────────────────────────────────────────────────────────

@app.get('/api/health')
def health():
    try:
        client = get_client()
        addr = client.get_address()
        return {
            'status': 'ok',
            'address': addr,
            'timestamp': datetime.utcnow().isoformat(),
            'connected': True,
        }
    except Exception as e:
        return {'status': 'error', 'error': str(e), 'connected': False}

# ─── Portfolio Summary ──────────────────────────────────────────────────────

@app.get('/api/portfolio/summary')
def portfolio_summary():
    try:
        client = get_client()
        trades = client.get_trades()
        orders = client.get_orders()

        trade_list = trades if isinstance(trades, list) else []
        order_list = orders if isinstance(orders, list) else []

        total_volume = 0
        buy_count = 0
        sell_count = 0
        buy_volume = 0
        sell_volume = 0
        markets_traded = set()

        for t in trade_list:
            size = float(t.get('size', 0))
            price = float(t.get('price', 0))
            vol = size * price
            total_volume += vol
            markets_traded.add(t.get('market', ''))

            if t.get('side') == 'BUY':
                buy_count += 1
                buy_volume += vol
            else:
                sell_count += 1
                sell_volume += vol

        return {
            'totalTrades': len(trade_list),
            'totalVolume': round(total_volume, 2),
            'buyCount': buy_count,
            'sellCount': sell_count,
            'buyVolume': round(buy_volume, 2),
            'sellVolume': round(sell_volume, 2),
            'openOrders': len(order_list),
            'marketsTraded': len(markets_traded),
            'realizedPnl': round(sell_volume - buy_volume, 2),
            'address': client.get_address(),
        }
    except Exception as e:
        logger.error(f'Error fetching portfolio summary: {e}')
        raise HTTPException(status_code=500, detail=str(e))

# ─── Trades ─────────────────────────────────────────────────────────────────

@app.get('/api/portfolio/trades')
def portfolio_trades():
    try:
        client = get_client()
        trades = client.get_trades()
        trade_list = trades if isinstance(trades, list) else []
        return {'trades': trade_list, 'count': len(trade_list)}
    except Exception as e:
        logger.error(f'Error fetching trades: {e}')
        raise HTTPException(status_code=500, detail=str(e))

# ─── Orders ─────────────────────────────────────────────────────────────────

@app.get('/api/portfolio/orders')
def portfolio_orders():
    try:
        client = get_client()
        orders = client.get_orders()
        order_list = orders if isinstance(orders, list) else []
        return {'orders': order_list, 'count': len(order_list)}
    except Exception as e:
        logger.error(f'Error fetching orders: {e}')
        raise HTTPException(status_code=500, detail=str(e))

# ─── Positions ──────────────────────────────────────────────────────────────

@app.get('/api/portfolio/positions')
def portfolio_positions(closed: bool = Query(False)):
    try:
        client = get_client()
        addr = client.get_address()
        
        import requests
        if closed:
            url = f'https://data-api.polymarket.com/closed-positions?user={addr}'
        else:
            url = f'https://data-api.polymarket.com/positions?user={addr}'
        
        resp = requests.get(url, headers={'User-Agent': 'Sovrana/1.0'})
        positions = resp.json() if resp.ok else []
        pos_list = positions if isinstance(positions, list) else []
        return {'positions': pos_list, 'count': len(pos_list)}
    except Exception as e:
        logger.error(f'Error fetching positions: {e}')
        raise HTTPException(status_code=500, detail=str(e))

# ─── Place Order ────────────────────────────────────────────────────────────

@app.post('/api/trading/place-order')
def place_order(order: dict):
    try:
        client = get_client()
        
        from py_clob_client.order_builder.constants import BUY, SELL
        from py_clob_client.clob_types import OrderArgs, OrderType
        
        side = BUY if order.get('side', 'BUY').upper() == 'BUY' else SELL
        token_id = order.get('token_id')
        price = float(order.get('price', 0))
        size = float(order.get('size', 0))
        
        if not token_id or price <= 0 or size <= 0:
            raise HTTPException(status_code=400, detail='token_id, price, and size are required')
        
        order_args = OrderArgs(
            price=price,
            size=size,
            side=side,
            token_id=token_id,
        )
        
        signed_order = client.create_order(order_args)
        result = client.post_order(signed_order, OrderType.GTC)
        
        return {
            'success': True,
            'result': result,
            'order': {
                'side': order.get('side'),
                'token_id': token_id,
                'price': price,
                'size': size,
            }
        }
    except Exception as e:
        logger.error(f'Error placing order: {e}')
        raise HTTPException(status_code=500, detail=str(e))

# ─── Cancel Order ───────────────────────────────────────────────────────────

@app.post('/api/trading/cancel-order')
def cancel_order(data: dict):
    try:
        client = get_client()
        order_id = data.get('order_id')
        if not order_id:
            raise HTTPException(status_code=400, detail='order_id is required')
        result = client.cancel(order_id)
        return {'success': True, 'result': result}
    except Exception as e:
        logger.error(f'Error cancelling order: {e}')
        raise HTTPException(status_code=500, detail=str(e))

# ─── Cancel All Orders ─────────────────────────────────────────────────────

@app.post('/api/trading/cancel-all')
def cancel_all_orders():
    try:
        client = get_client()
        result = client.cancel_all()
        return {'success': True, 'result': result}
    except Exception as e:
        logger.error(f'Error cancelling all orders: {e}')
        raise HTTPException(status_code=500, detail=str(e))

# ─── Market Data ────────────────────────────────────────────────────────────

@app.get('/api/markets')
def get_markets(limit: int = Query(50)):
    try:
        import requests
        resp = requests.get(
            f'https://gamma-api.polymarket.com/markets?limit={limit}&active=true&closed=false&order=volume24hr&ascending=false',
            headers={'User-Agent': 'Sovrana/1.0'}
        )
        markets = resp.json() if resp.ok else []
        return {'markets': markets, 'count': len(markets)}
    except Exception as e:
        logger.error(f'Error fetching markets: {e}')
        raise HTTPException(status_code=500, detail=str(e))

# ─── Run ────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8001)
