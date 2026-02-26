import { NextRequest, NextResponse } from 'next/server'
import { jsonProxy } from '@/lib/proxy'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  return jsonProxy('execution', `/agents/${params.id}`)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  return jsonProxy('execution', `/agents/${params.id}`, 'PATCH', body)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  return jsonProxy('execution', `/agents/${params.id}`, 'DELETE')
}
