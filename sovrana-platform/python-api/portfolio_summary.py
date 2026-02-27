"""Vercel Python serverless function for portfolio summary."""
import json
import os
from http.server import BaseHTTPRequestHandler

def get_client():
    from py_clob_client.client import ClobClient
    host = "https://clob.polymarket.com"
    chain_id = 137
    key = os.environ.get("POLYMARKET_PRIVATE_KEY", "")
    client = ClobClient(host, key=key, chain_id=chain_id)
    client.set_api_creds(client.create_or_derive_api_creds())
    return client

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            client = get_client()
            address = client.get_address()
            
            # Fetch trades
            trades = []
            cursor = None
            for _ in range(10):
                params = {"maker_address": address, "limit": 500}
                if cursor:
                    params["cursor"] = cursor
                resp = client.get_trades(**params)
                batch = resp if isinstance(resp, list) else resp.get("data", resp.get("results", []))
                if not batch:
                    break
                trades.extend(batch)
                if isinstance(resp, dict) and resp.get("next_cursor") and resp["next_cursor"] != "LTE=":
                    cursor = resp["next_cursor"]
                else:
                    break
            
            # Fetch open orders
            open_orders = []
            try:
                orders_resp = client.get_orders()
                open_orders = orders_resp if isinstance(orders_resp, list) else orders_resp.get("data", [])
            except:
                pass
            
            # Calculate summary
            total_volume = 0
            buy_volume = 0
            sell_volume = 0
            buy_count = 0
            sell_count = 0
            markets = set()
            
            for t in trades:
                size = float(t.get("size", 0))
                price = float(t.get("price", 0))
                vol = size * price
                total_volume += vol
                side = t.get("side", "").upper()
                if side == "BUY":
                    buy_volume += vol
                    buy_count += 1
                else:
                    sell_volume += vol
                    sell_count += 1
                markets.add(t.get("market", t.get("asset_id", "")))
            
            result = {
                "totalTrades": len(trades),
                "totalVolume": round(total_volume, 2),
                "buyCount": buy_count,
                "sellCount": sell_count,
                "buyVolume": round(buy_volume, 2),
                "sellVolume": round(sell_volume, 2),
                "openOrders": len(open_orders),
                "marketsTraded": len(markets),
                "realizedPnl": round(sell_volume - buy_volume, 2),
                "address": address,
            }
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
