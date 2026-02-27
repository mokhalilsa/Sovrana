/**
 * GET /api/agents/state
 * Returns the current state of all agents, recent signals, trades, and activity.
 */

import { NextResponse } from 'next/server';
import { getStore, getAgents, getSignals, getTrades, getEngineStats, getActivityLog } from '@/lib/trading/store';
import { isExecutorConfigured } from '@/lib/trading/executor';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    const agents = getAgents();
    const signals = getSignals(limit, agentId);
    const trades = getTrades(limit, agentId);
    const stats = getEngineStats();
    const activity = getActivityLog().slice(0, limit);

    return NextResponse.json({
      agents: agents.map(a => ({
        ...a,
        signalCount: signals.filter(s => s.agentId === a.id).length,
        tradeCount: trades.filter(t => t.agentId === a.id).length,
        lastSignal: signals.find(s => s.agentId === a.id)?.timestamp || null,
        lastTrade: trades.find(t => t.agentId === a.id)?.timestamp || null,
      })),
      signals,
      trades,
      activity,
      stats,
      executorConfigured: isExecutorConfigured(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Agent state error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
