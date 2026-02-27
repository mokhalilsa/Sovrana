/**
 * POST /api/agents/run
 * Triggers the agent engine to scan markets and execute trades.
 * Returns ALL generated data (signals, trades, activity) in the response
 * since serverless functions are stateless.
 */

import { NextResponse } from 'next/server';
import { runAgents } from '@/lib/trading/runner';
import { getStore, getAgents, getSignals, getTrades, getEngineStats, getActivityLog } from '@/lib/trading/store';
import { isExecutorConfigured } from '@/lib/trading/executor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function executeAndReturn() {
  const result = await runAgents();
  const store = getStore();
  const agents = getAgents();
  const signals = getSignals(100);
  const trades = getTrades(100);
  const stats = getEngineStats();
  const activity = getActivityLog().slice(0, 100);

  return NextResponse.json({
    success: result.success,
    result,
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
}

export async function POST() {
  try {
    return await executeAndReturn();
  } catch (error: any) {
    console.error('Agent run error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET for cron triggers
export async function GET() {
  try {
    return await executeAndReturn();
  } catch (error: any) {
    console.error('Agent run error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
