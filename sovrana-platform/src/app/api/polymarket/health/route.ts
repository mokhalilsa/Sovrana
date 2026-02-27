import { NextResponse } from 'next/server';
import { checkApiHealth, isConfigured } from '@/lib/polymarket-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = await checkApiHealth();
    const configured = isConfigured();
    return NextResponse.json({ ...health, configured });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
