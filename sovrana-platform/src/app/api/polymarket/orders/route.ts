import { NextResponse } from 'next/server';
import { getOpenOrders } from '@/lib/polymarket-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const orders = await getOpenOrders();
    return NextResponse.json({ orders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
