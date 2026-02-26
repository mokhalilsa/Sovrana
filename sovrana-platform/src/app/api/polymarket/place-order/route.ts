import { NextResponse } from 'next/server';
import { signOrder, isSignerConfigured, type OrderParams } from '@/lib/polymarket-signer';
import { isConfigured } from '@/lib/polymarket-api';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// L2 HMAC helper
function buildHmacSignature(
  secret: string,
  timestamp: string,
  method: string,
  requestPath: string,
  body: string = ''
): string {
  const message = timestamp + method.toUpperCase() + requestPath + body;
  const key = Buffer.from(secret, 'base64');
  return crypto.createHmac('sha256', key).update(message).digest('base64');
}

export async function POST(request: Request) {
  try {
    if (!isSignerConfigured()) {
      return NextResponse.json(
        { error: 'Private key not configured. Set PRIVATE_KEY in .env.local' },
        { status: 503 }
      );
    }

    if (!isConfigured()) {
      return NextResponse.json(
        { error: 'API credentials not configured. Set POLY_* in .env.local' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { tokenId, price, size, side, negRisk, tickSize, funderAddress } = body;

    if (!tokenId || !price || !size || !side) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenId, price, size, side' },
        { status: 400 }
      );
    }

    // Sign the order locally using L1 (private key)
    const signedOrder = await signOrder({
      tokenId,
      price: parseFloat(price),
      size: parseFloat(size),
      side: side.toUpperCase() as 'BUY' | 'SELL',
      negRisk: negRisk || false,
      funderAddress,
    });

    // Post the signed order to CLOB API using L2 auth
    const CLOB_API = process.env.CLOB_API_URL || 'https://clob.polymarket.com';
    const orderPath = '/order';
    const orderBody = JSON.stringify({
      order: signedOrder,
      orderType: 'GTC', // Good Till Cancel
    });

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const secret = process.env.POLY_SECRET || '';
    const signature = buildHmacSignature(secret, timestamp, 'POST', orderPath, orderBody);

    const res = await fetch(`${CLOB_API}${orderPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'POLY_ADDRESS': process.env.POLY_ADDRESS || '',
        'POLY_SIGNATURE': signature,
        'POLY_TIMESTAMP': timestamp,
        'POLY_API_KEY': process.env.POLY_API_KEY || '',
        'POLY_PASSPHRASE': process.env.POLY_PASSPHRASE || '',
      },
      body: orderBody,
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `CLOB API Error: ${res.status} - ${errorText}` },
        { status: res.status }
      );
    }

    const result = await res.json();
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to place order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
