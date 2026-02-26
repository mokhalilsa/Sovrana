import { NextRequest } from 'next/server'
import { jsonProxy } from '@/lib/proxy'

export async function POST(req: NextRequest) {
  const body = await req.json()
  // Manual orders are routed through the execution service execute endpoint
  // A dummy signal_id is used for manual orders
  return jsonProxy('execution', '/execute', 'POST', {
    ...body,
    signal_id: '00000000-0000-0000-0000-000000000000',
    confidence: 1.0,
    order_type: 'limit',
  })
}
