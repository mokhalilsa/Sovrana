import { NextResponse } from 'next/server'
import { proxyTo } from '@/lib/proxy'

export async function GET() {
  const res = await proxyTo('brain', '/strategies/templates')
  const data = await res.json().catch(() => [])
  return NextResponse.json(data, { status: res.status })
}
