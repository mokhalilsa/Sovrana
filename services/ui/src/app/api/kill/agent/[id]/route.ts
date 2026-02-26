import { NextRequest } from 'next/server'
import { jsonProxy } from '@/lib/proxy'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { enabled } = await req.json()
  return jsonProxy('execution', `/kill/agent/${params.id}`, 'POST', { enabled })
}
