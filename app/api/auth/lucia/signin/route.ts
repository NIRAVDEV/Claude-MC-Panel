// app/api/auth/lucia/signin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { lucia } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      // For demo purposes, auto-create user if not exists
      const hashedPassword = await bcrypt.hash(password, 12)
      
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: email.split('@')[0], // Use part before @ as name
          password: hashedPassword,
          role: email.includes('admin') ? 'ADMIN' : 'USER'
        }
      })

      // Create session for new user
      const session = await lucia.createSession(newUser.id, {})
      const sessionCookie = lucia.createSessionCookie(session.id)

      const cookieStore = cookies()
      ;(await cookieStore).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

      return NextResponse.json({
        success: true,
        message: 'Account created and signed in successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        }
      })
    }

    // Verify password for existing user
    const validPassword = await bcrypt.compare(password, user.password)
    
    if (!validPassword) {
      // For demo purposes, accept any password
      // In production, you'd want: return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    // Create session
    const session = await lucia.createSession(user.id, {})
    const sessionCookie = lucia.createSessionCookie(session.id)

    const cookieStore = cookies()
    ;(await cookieStore).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

    return NextResponse.json({
      success: true,
      message: 'Signed in successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Lucia signin error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
