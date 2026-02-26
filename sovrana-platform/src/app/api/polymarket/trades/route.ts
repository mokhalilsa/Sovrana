import { NextResponse } from 'next/server';
import { getUserTrades, isConfigured } from '@/lib/polymarket-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { error: 'API not configured. Set POLY_ADDRESS in .env.local', data: [] },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';

    const trades = await getUserTrades(undefined, parseInt(limit));

    return NextResponse.json({ data: trades, count: trades.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch trades';
    return NextResponse.json({ error: message, data: [] }, { status: 500 });
  }
}
