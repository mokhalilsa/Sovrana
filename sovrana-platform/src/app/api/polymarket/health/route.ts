import { NextResponse } from 'next/server';
import { checkApiHealth, getConfigStatus } from '@/lib/polymarket-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [health, config] = await Promise.all([
      checkApiHealth(),
      Promise.resolve(getConfigStatus()),
    ]);

    return NextResponse.json({
      status: health.gamma && health.clob ? 'operational' : 'degraded',
      apis: health,
      config,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Health check failed';
    return NextResponse.json(
      { status: 'error', error: message },
      { status: 500 }
    );
  }
}
