import { NextResponse } from 'next/server';
import { getPricesHistory } from '@/lib/polymarket-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('token_id');
    if (!tokenId) return NextResponse.json({ error: 'token_id required' }, { status: 400 });
    const interval = searchParams.get('interval') || '1d';
    const fidelity = parseInt(searchParams.get('fidelity') || '60');
    const data = await getPricesHistory(tokenId, interval, fidelity);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
