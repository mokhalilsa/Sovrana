import { NextResponse } from 'next/server';
import { getUserOrders, cancelOrder, cancelAllOrders, isConfigured } from '@/lib/polymarket-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { error: 'API not configured. Set credentials in .env.local', data: [] },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market') || undefined;
    const asset_id = searchParams.get('asset_id') || undefined;

    const orders = await getUserOrders({ market, asset_id });

    return NextResponse.json({ data: orders, count: orders.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch orders';
    return NextResponse.json({ error: message, data: [] }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { error: 'API not configured. Set credentials in .env.local' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');

    if (orderId) {
      const result = await cancelOrder(orderId);
      return NextResponse.json(result);
    } else {
      const result = await cancelAllOrders();
      return NextResponse.json(result);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to cancel order(s)';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
