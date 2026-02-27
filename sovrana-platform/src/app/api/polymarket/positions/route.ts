import { NextResponse } from 'next/server';
import { getUserPositions, getUserClosedPositions } from '@/lib/polymarket-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const closed = searchParams.get('closed') === 'true';
    const data = closed ? await getUserClosedPositions() : await getUserPositions();
    return NextResponse.json({ positions: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
