import { NextRequest, NextResponse } from 'next/server'
import { proxyTo } from '@/lib/proxy'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const params = Object.fromEntries(searchParams.entries())
  const res = await proxyTo('execution', '/orders', 'GET', undefined, params)
  const data = await res.json().catch(() => [])
  return NextResponse.json(data, { status: res.status })
}
