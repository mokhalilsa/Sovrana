import { NextResponse } from 'next/server';
import { getActiveMarkets, searchMarkets } from '@/lib/polymarket-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    if (query) {
      const data = await searchMarkets(query);
      return NextResponse.json(data);
    }
    const data = await getActiveMarkets(limit);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
