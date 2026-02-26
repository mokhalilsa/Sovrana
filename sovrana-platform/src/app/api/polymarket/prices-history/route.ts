import { NextResponse } from 'next/server';
import { getPricesHistory } from '@/lib/polymarket-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('token_id');
    const interval = searchParams.get('interval') || '1d';
    const fidelity = searchParams.get('fidelity') || '60';

    if (!tokenId) {
      return NextResponse.json({ error: 'token_id is required' }, { status: 400 });
    }

    const data = await getPricesHistory(tokenId, interval, parseInt(fidelity));

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch price history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
