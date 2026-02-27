import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WALLET = process.env.POLYMARKET_WALLET_ADDRESS || '0x36bc6aac04b92548ce78a990d2a83eb64b92d8cd';
const DATA_API = 'https://data-api.polymarket.com';

export async function GET() {
  try {
    const res = await fetch(`${DATA_API}/positions?user=${WALLET}`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) throw new Error(`Data API error: ${res.status}`);

    const positions = await res.json();

    const totalValue = positions.reduce((sum: number, p: any) => sum + (p.currentValue || 0), 0);
    const totalPnl = positions.reduce((sum: number, p: any) => sum + (p.cashPnl || 0), 0);

    return NextResponse.json({
      positions: positions.map((p: any) => ({
        title: p.title,
        slug: p.slug,
        eventSlug: p.eventSlug,
        outcome: p.outcome,
        outcomeIndex: p.outcomeIndex,
        size: p.size,
        avgPrice: p.avgPrice,
        currentPrice: p.curPrice,
        currentValue: Math.round((p.currentValue || 0) * 100) / 100,
        initialValue: Math.round((p.initialValue || 0) * 100) / 100,
        pnl: Math.round((p.cashPnl || 0) * 100) / 100,
        pnlPercent: Math.round((p.percentPnl || 0) * 100) / 100,
        realizedPnl: Math.round((p.realizedPnl || 0) * 100) / 100,
        icon: p.icon,
        endDate: p.endDate,
        redeemable: p.redeemable,
        mergeable: p.mergeable,
        conditionId: p.conditionId,
        asset: p.asset,
        negativeRisk: p.negativeRisk,
      })),
      total: positions.length,
      totalValue: Math.round(totalValue * 100) / 100,
      totalPnl: Math.round(totalPnl * 100) / 100,
    });
  } catch (error: any) {
    console.error('Portfolio positions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions', details: error.message, positions: [] },
      { status: 500 }
    );
  }
}
