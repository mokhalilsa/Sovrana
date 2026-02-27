/**
 * POST /api/agents/run
 * Triggers the agent engine to scan markets and execute trades.
 * Can be called manually or by a cron job.
 */

import { NextResponse } from 'next/server';
import { runAgents } from '@/lib/trading/runner';
import { getEngineStats } from '@/lib/trading/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for execution

export async function POST() {
  try {
    const result = await runAgents();

    return NextResponse.json({
      success: result.success,
      result,
      stats: getEngineStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Agent run error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Also support GET for cron triggers
export async function GET() {
  try {
    const result = await runAgents();

    return NextResponse.json({
      success: result.success,
      result,
      stats: getEngineStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Agent run error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
