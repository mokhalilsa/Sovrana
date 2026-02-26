import { NextResponse } from 'next/server';
import { getOrderBook, getMidpointPrice, getMarketPrice, getLastTradePrice } from '@/lib/polymarket-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('token_id');
    const type = searchParams.get('type') || 'book'; // book, midpoint, price, last-trade

    if (!tokenId) {
      return NextResponse.json({ error: 'token_id is required' }, { status: 400 });
    }

    switch (type) {
      case 'midpoint': {
        const data = await getMidpointPrice(tokenId);
        return NextResponse.json({ data });
      }
      case 'price': {
        const data = await getMarketPrice(tokenId);
        return NextResponse.json({ data });
      }
      case 'last-trade': {
        const data = await getLastTradePrice(tokenId);
        return NextResponse.json({ data });
      }
      case 'book':
      default: {
        const data = await getOrderBook(tokenId);
        return NextResponse.json({ data });
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch orderbook data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
