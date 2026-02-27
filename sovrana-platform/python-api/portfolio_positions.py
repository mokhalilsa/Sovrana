"""Vercel Python serverless function for portfolio positions."""
import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.request import urlopen, Request

def get_address():
    from py_clob_client.client import ClobClient
    host = "https://clob.polymarket.com"
    chain_id = 137
    key = os.environ.get("POLYMARKET_PRIVATE_KEY", "")
    client = ClobClient(host, key=key, chain_id=chain_id)
    return client.get_address()

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            address = get_address()
            
            # Fetch positions from the data API (public, no auth needed)
            url = f"https://data-api.polymarket.com/positions?user={address}"
            req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            resp = urlopen(req, timeout=15)
            positions = json.loads(resp.read().decode())
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"positions": positions, "count": len(positions)}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
