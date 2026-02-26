import { NextRequest, NextResponse } from 'next/server'
import { proxyTo } from '@/lib/proxy'

export async function GET() {
  const res = await proxyTo('execution', '/wallets')
  const data = await res.json().catch(() => [])
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await proxyTo('execution', '/wallets', 'POST', body)
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
