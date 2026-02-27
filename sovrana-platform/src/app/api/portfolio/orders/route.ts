import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const CLOB_API = 'https://clob.polymarket.com';
const API_KEY = process.env.POLYMARKET_API_KEY || '';
const API_SECRET = process.env.POLYMARKET_API_SECRET || '';
const API_PASSPHRASE = process.env.POLYMARKET_API_PASSPHRASE || '';

function buildHmacHeaders(method: string, path: string, body: string = '') {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = timestamp + method + path + body;
  const hmac = crypto.createHmac('sha256', Buffer.from(API_SECRET, 'base64'));
  hmac.update(message);
  const signature = hmac.digest('base64');

  return {
    'POLY_API_KEY': API_KEY,
    'POLY_SIGNATURE': signature,
    'POLY_TIMESTAMP': timestamp,
    'POLY_PASSPHRASE': API_PASSPHRASE,
    'Content-Type': 'application/json',
  };
}

export async function GET() {
  try {
    // If no API credentials, return empty
    if (!API_KEY || !API_SECRET) {
      return NextResponse.json({ orders: [], total: 0, message: 'No API credentials configured' });
    }

    const path = '/orders?state=LIVE';
    const headers = buildHmacHeaders('GET', path);

    const res = await fetch(`${CLOB_API}${path}`, {
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('CLOB orders error:', res.status, text);
      return NextResponse.json({ orders: [], total: 0, error: `CLOB API: ${res.status}` });
    }

    const data = await res.json();
    const orders = Array.isArray(data) ? data : (data.orders || []);

    return NextResponse.json({
      orders: orders.map((o: any) => ({
        id: o.id || o.order_id,
        market: o.market || o.token_id,
        side: o.side,
        price: o.price,
        size: o.original_size || o.size,
        sizeMatched: o.size_matched || 0,
        status: o.status || o.state || 'LIVE',
        createdAt: o.created_at || o.timestamp,
        type: o.type || o.order_type || 'LIMIT',
      })),
      total: orders.length,
    });
  } catch (error: any) {
    console.error('Portfolio orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error.message, orders: [] },
      { status: 500 }
    );
  }
}
