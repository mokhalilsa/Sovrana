import { NextRequest } from 'next/server'
import { jsonProxy } from '@/lib/proxy'

export async function POST(req: NextRequest) {
  const { enabled } = await req.json()
  const method = enabled ? 'POST' : 'DELETE'
  return jsonProxy('execution', '/kill/global', 'POST', { enabled })
}
