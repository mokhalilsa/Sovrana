import { NextResponse } from 'next/server';
import { getEvents } from '@/lib/polymarket-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';
    const active = searchParams.get('active');
    const tag_slug = searchParams.get('tag_slug') || undefined;

    const events = await getEvents({
      limit: parseInt(limit),
      offset: parseInt(offset),
      active: active ? active === 'true' : undefined,
      order: 'volume_num',
      ascending: false,
      tag_slug,
    });

    return NextResponse.json({ data: events, count: events.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch events';
    return NextResponse.json({ error: message, data: [] }, { status: 500 });
  }
}
