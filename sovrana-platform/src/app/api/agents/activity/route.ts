/**
 * GET /api/agents/activity
 * Returns the activity feed for all agents or a specific agent.
 */

import { NextResponse } from 'next/server';
import { getActivityLog } from '@/lib/trading/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const limit = parseInt(searchParams.get('limit') || '100');

    let activity = getActivityLog();
    if (agentId) {
      activity = activity.filter(a => a.agentId === agentId);
    }

    return NextResponse.json({
      activity: activity.slice(0, limit),
      total: activity.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
