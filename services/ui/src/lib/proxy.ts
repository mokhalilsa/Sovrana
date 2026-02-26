/**
 * Proxy helper: forwards Next.js API route requests to the appropriate backend service.
 * Keeps backend service URLs server-side only.
 */

const INGESTION = process.env.INGESTION_URL || 'http://ingestion:8001'
const BRAIN = process.env.BRAIN_URL || 'http://brain:8002'
const EXECUTION = process.env.EXECUTION_URL || 'http://execution:8003'

type Service = 'ingestion' | 'brain' | 'execution'

const BASES: Record<Service, string> = {
  ingestion: INGESTION,
  brain: BRAIN,
  execution: EXECUTION,
}

export async function proxyTo(
  service: Service,
  path: string,
  method: string = 'GET',
  body?: unknown,
  params?: Record<string, string>
): Promise<Response> {
  let url = `${BASES[service]}${path}`
  if (params) {
    const qs = new URLSearchParams(params).toString()
    if (qs) url += `?${qs}`
  }

  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }

  try {
    return await fetch(url, init)
  } catch (err) {
    console.error(`Proxy error to ${service}${path}:`, err)
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function jsonProxy(
  service: Service,
  path: string,
  method: string = 'GET',
  body?: unknown,
  params?: Record<string, string>
) {
  const { NextResponse } = await import('next/server')
  const res = await proxyTo(service, path, method, body, params)
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
