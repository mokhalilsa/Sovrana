import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme'

  if (username === adminUsername && password === adminPassword) {
    return NextResponse.json({
      access_token: 'local_admin_token',
      user_id: 'admin',
      email: 'admin@sovrana.local',
    })
  }

  return NextResponse.json({ detail: 'Invalid credentials' }, { status: 401 })
}
