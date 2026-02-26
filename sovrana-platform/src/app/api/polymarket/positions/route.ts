import { NextResponse } from 'next/server';
import { getUserPositions, getUserClosedPositions, isConfigured } from '@/lib/polymarket-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { error: 'API not configured. Set POLY_ADDRESS in .env.local', data: [] },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const closed = searchParams.get('closed') === 'true';

    const positions = closed
      ? await getUserClosedPositions()
      : await getUserPositions();

    return NextResponse.json({ data: positions, count: positions.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch positions';
    return NextResponse.json({ error: message, data: [] }, { status: 500 });
  }
}
