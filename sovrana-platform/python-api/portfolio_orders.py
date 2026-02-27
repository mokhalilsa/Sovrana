"""Vercel Python serverless function for portfolio orders."""
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
            
            orders = []
            try:
                orders_resp = client.get_orders()
                orders = orders_resp if isinstance(orders_resp, list) else orders_resp.get("data", [])
            except:
                pass
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"orders": orders, "count": len(orders)}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
