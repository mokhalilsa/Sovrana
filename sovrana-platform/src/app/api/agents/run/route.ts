/**
 * POST /api/agents/run
 * DISABLED - Agents have been killed. No trading will occur.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const KILLED_RESPONSE = {
  success: false,
  result: {
    success: false,
    marketsScanned: 0,
    signalsGenerated: 0,
    tradesExecuted: 0,
    tradesFailed: 0,
    duration: 0,
    errors: ['Agents are KILLED. Trading is disabled.'],
  },
  agents: [],
  signals: [],
  trades: [],
  activity: [{
    id: 'kill-1',
    type: 'error',
    agentId: 'system',
    agentName: 'System',
    message: 'All agents have been KILLED. Trading is permanently disabled.',
    severity: 'error',
    timestamp: new Date().toISOString(),
  }],
  stats: {
    totalSignals: 0,
    totalTrades: 0,
    totalVolume: 0,
    agentsEnabled: 0,
    agentsTotal: 0,
    engineRunning: false,
  },
  executorConfigured: false,
  timestamp: new Date().toISOString(),
  killed: true,
};

export async function POST() {
  return NextResponse.json(KILLED_RESPONSE);
}

export async function GET() {
  return NextResponse.json(KILLED_RESPONSE);
}
