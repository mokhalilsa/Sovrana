import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WALLET = process.env.POLYMARKET_WALLET_ADDRESS || '0x36bc6aac04b92548ce78a990d2a83eb64b92d8cd';
const DATA_API = 'https://data-api.polymarket.com';

export async function GET() {
  try {
    const res = await fetch(`${DATA_API}/activity?user=${WALLET}&limit=100`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) throw new Error(`Data API error: ${res.status}`);

    const activity = await res.json();
    const trades = activity.filter((a: any) => a.type === 'TRADE');

    return NextResponse.json({
      trades: trades.map((t: any) => ({
        timestamp: t.timestamp,
        type: t.type,
        side: t.side || 'BUY',
        size: t.size,
        usdcSize: Math.round((t.usdcSize || 0) * 100) / 100,
        price: t.price,
        transactionHash: t.transactionHash,
        conditionId: t.conditionId,
        asset: t.asset,
        title: t.title || '',
        outcome: t.outcome || '',
        icon: t.icon || '',
      })),
      total: trades.length,
    });
  } catch (error: any) {
    console.error('Portfolio trades error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades', details: error.message, trades: [] },
      { status: 500 }
    );
  }
}
