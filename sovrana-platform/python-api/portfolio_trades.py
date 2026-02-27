"""Vercel Python serverless function for portfolio trades."""
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
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"trades": trades, "count": len(trades)}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
