/**
 * POST /api/agents/control
 * Control agent state: enable/disable, kill switch, update config
 */

import { NextResponse } from 'next/server';
import { updateAgent, getAgent, addActivity } from '@/lib/trading/store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentId, action, config } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 });
    }

    const agent = getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    switch (action) {
      case 'enable':
        updateAgent(agentId, { enabled: true });
        addActivity({
          type: 'agent_start',
          agentId,
          agentName: agent.name,
          message: `Agent "${agent.name}" enabled`,
          severity: 'success',
        });
        break;

      case 'disable':
        updateAgent(agentId, { enabled: false });
        addActivity({
          type: 'agent_stop',
          agentId,
          agentName: agent.name,
          message: `Agent "${agent.name}" disabled`,
          severity: 'warning',
        });
        break;

      case 'kill':
        updateAgent(agentId, { enabled: false });
        addActivity({
          type: 'agent_stop',
          agentId,
          agentName: agent.name,
          message: `KILL SWITCH activated for "${agent.name}" - all trading halted`,
          severity: 'error',
        });
        break;

      case 'update':
        if (config) {
          updateAgent(agentId, config);
          addActivity({
            type: 'agent_start',
            agentId,
            agentName: agent.name,
            message: `Agent "${agent.name}" configuration updated`,
            severity: 'info',
          });
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      agent: getAgent(agentId),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
