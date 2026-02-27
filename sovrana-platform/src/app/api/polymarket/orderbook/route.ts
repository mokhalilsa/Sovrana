import { NextResponse } from 'next/server';
import { getOrderBook, getMidpointPrice, getPrice } from '@/lib/polymarket-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('token_id');
    if (!tokenId) return NextResponse.json({ error: 'token_id required' }, { status: 400 });
    
    const [book, midpoint, buyPrice, sellPrice] = await Promise.all([
      getOrderBook(tokenId).catch(() => null),
      getMidpointPrice(tokenId).catch(() => null),
      getPrice(tokenId, 'BUY').catch(() => null),
      getPrice(tokenId, 'SELL').catch(() => null),
    ]);
    
    return NextResponse.json({ book, midpoint, buyPrice, sellPrice });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
