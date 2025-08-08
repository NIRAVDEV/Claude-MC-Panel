// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { lucia } from '@/lib/lucia'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const sessionId = (await cookieStore).get(lucia.sessionCookieName)?.value ?? null

    if (!sessionId) {
      return NextResponse.json(
        { success: false, user: null, error: 'No session found' },
        { status: 401 }
      )
    }

    const { user, session } = await lucia.validateSession(sessionId)
    
    if (!user || !session) {
      return NextResponse.json(
        { success: false, user: null, error: 'Invalid session' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt
      }
    })

  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json(
      { success: false, user: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
