import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WALLET = process.env.POLYMARKET_WALLET_ADDRESS || '0x36bc6aac04b92548ce78a990d2a83eb64b92d8cd';
const DATA_API = 'https://data-api.polymarket.com';

export async function GET() {
  try {
    const [positionsRes, activityRes] = await Promise.all([
      fetch(`${DATA_API}/positions?user=${WALLET}`, { next: { revalidate: 30 } }),
      fetch(`${DATA_API}/activity?user=${WALLET}&limit=100`, { next: { revalidate: 30 } }),
    ]);

    const positions = positionsRes.ok ? await positionsRes.json() : [];
    const activity = activityRes.ok ? await activityRes.json() : [];

    const totalValue = positions.reduce((sum: number, p: any) => sum + (p.currentValue || 0), 0);
    const totalInvested = positions.reduce((sum: number, p: any) => sum + (p.initialValue || 0), 0);
    const totalPnl = positions.reduce((sum: number, p: any) => sum + (p.cashPnl || 0), 0);
    const realizedPnl = positions.reduce((sum: number, p: any) => sum + (p.realizedPnl || 0), 0);

    const trades = activity.filter((a: any) => a.type === 'TRADE');
    const totalVolume = trades.reduce((sum: number, t: any) => sum + (t.usdcSize || 0), 0);

    const uniqueMarkets = new Set(positions.map((p: any) => p.conditionId));

    return NextResponse.json({
      walletAddress: WALLET,
      totalPositions: positions.length,
      totalValue: Math.round(totalValue * 100) / 100,
      totalInvested: Math.round(totalInvested * 100) / 100,
      totalPnl: Math.round(totalPnl * 100) / 100,
      realizedPnl: Math.round(realizedPnl * 100) / 100,
      unrealizedPnl: Math.round((totalPnl - realizedPnl) * 100) / 100,
      totalTrades: trades.length,
      totalVolume: Math.round(totalVolume * 100) / 100,
      marketsTraded: uniqueMarkets.size,
      positions: positions.map((p: any) => ({
        title: p.title,
        slug: p.slug,
        outcome: p.outcome,
        size: p.size,
        avgPrice: p.avgPrice,
        currentPrice: p.curPrice,
        currentValue: Math.round((p.currentValue || 0) * 100) / 100,
        initialValue: Math.round((p.initialValue || 0) * 100) / 100,
        pnl: Math.round((p.cashPnl || 0) * 100) / 100,
        pnlPercent: Math.round((p.percentPnl || 0) * 100) / 100,
        icon: p.icon,
        endDate: p.endDate,
        redeemable: p.redeemable,
      })),
      recentTrades: trades.slice(0, 10).map((t: any) => ({
        timestamp: t.timestamp,
        type: t.type,
        side: t.side || 'BUY',
        size: t.size,
        usdcSize: Math.round((t.usdcSize || 0) * 100) / 100,
        price: t.price,
        transactionHash: t.transactionHash,
        title: t.title || '',
        outcome: t.outcome || '',
      })),
    });
  } catch (error: any) {
    console.error('Portfolio summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio data', details: error.message },
      { status: 500 }
    );
  }
}
