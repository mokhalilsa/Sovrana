import { NextResponse } from 'next/server';
import { getUserTrades } from '@/lib/polymarket-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const trades = await getUserTrades();
    return NextResponse.json({ trades });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
