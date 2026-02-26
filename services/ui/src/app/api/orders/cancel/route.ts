import { NextRequest } from 'next/server'
import { jsonProxy } from '@/lib/proxy'

export async function POST(req: NextRequest) {
  const body = await req.json()
  return jsonProxy('execution', '/cancel', 'POST', body)
}
