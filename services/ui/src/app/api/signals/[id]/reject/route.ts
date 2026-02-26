import { NextRequest } from 'next/server'
import { jsonProxy } from '@/lib/proxy'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  return jsonProxy('brain', `/signals/${params.id}/reject`, 'POST', body)
}
