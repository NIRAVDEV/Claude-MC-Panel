// app/api/auth/lucia/signout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { lucia } from '@/lib/lucia'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const sessionId = (await cookieStore).get(lucia.sessionCookieName)?.value ?? null

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'No session found' },
        { status: 401 }
      )
    }

    // Invalidate session
    await lucia.invalidateSession(sessionId)

    // Create blank session cookie to clear it
    const sessionCookie = lucia.createBlankSessionCookie()
    ;(await cookieStore).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

    return NextResponse.json({
      success: true,
      message: 'Signed out successfully'
    })

  } catch (error) {
    console.error('Lucia signout error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
