import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Order placement requires EIP-712 signing via the Python SDK
    // This endpoint will proxy to the Python agent service
    return NextResponse.json({ 
      error: 'Order placement requires the agent engine. Use the agent system to place orders.',
      received: body 
    }, { status: 501 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
