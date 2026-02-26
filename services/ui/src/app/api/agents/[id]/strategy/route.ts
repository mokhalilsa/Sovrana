import { NextRequest } from 'next/server'
import { jsonProxy } from '@/lib/proxy'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  return jsonProxy('brain', `/agents/${params.id}/strategy`)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  return jsonProxy('brain', `/agents/${params.id}/strategy`, 'POST', body)
}
