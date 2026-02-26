import { NextRequest } from 'next/server'
import { jsonProxy } from '@/lib/proxy'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  return jsonProxy('execution', `/agents/${params.id}/stop`, 'POST')
}
