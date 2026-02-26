import { NextRequest, NextResponse } from 'next/server'
import { jsonProxy } from '@/lib/proxy'

export async function GET() {
  return jsonProxy('execution', '/agents')
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  return jsonProxy('execution', '/agents', 'POST', body)
}
