import { NextRequest } from 'next/server'
import { jsonProxy } from '@/lib/proxy'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  return jsonProxy('execution', `/agents/${params.id}/risk`)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  return jsonProxy('execution', `/agents/${params.id}/risk`, 'PUT', body)
}
