import { NextResponse } from 'next/server';
import { getMarkets, searchMarkets } from '@/lib/polymarket-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    const active = searchParams.get('active');
    const order = searchParams.get('order') || 'volumeNum';

    let markets;
    if (query) {
      markets = await searchMarkets(query);
    } else {
      markets = await getMarkets({
        limit: parseInt(limit),
        offset: parseInt(offset),
        active: active ? active === 'true' : undefined,
        closed: active === 'true' ? false : undefined,
        order,
        ascending: false,
      });
    }

    return NextResponse.json({ data: markets, count: markets.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch markets';
    return NextResponse.json({ error: message, data: [] }, { status: 500 });
  }
}
