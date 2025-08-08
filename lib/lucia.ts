// lib/lucia.ts
import { Lucia, TimeSpan } from "lucia"
import { PrismaAdapter } from "@lucia-auth/adapter-prisma"
import { prisma } from "./prisma"
import { cache } from "react"
import type { Session, User } from "lucia"
import { cookies } from "next/headers"

// Prisma adapter configuration
const adapter = new PrismaAdapter(prisma.session, prisma.user)

// Lucia instance configuration
export const lucia = new Lucia(adapter, {
  // Session configuration
  sessionExpiresIn: new TimeSpan(30, "d"), // 30 days
  sessionCookie: {
    name: "minecraft-host-session",
    expires: false, // session cookies have very long lifespan
    attributes: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "lax", // CSRF protection
      path: "/",
      domain: process.env.NODE_ENV === "production" ? undefined : "localhost"
    }
  },
  
  // User attributes configuration
  getUserAttributes: (attributes) => {
    return {
      // Return user attributes that will be available in session
      id: attributes.id,
      email: attributes.email,
      name: attributes.name,
      role: attributes.role,
      credits: attributes.credits,
      createdAt: attributes.createdAt,
      updatedAt: attributes.updatedAt
    }
  },

  // Session attributes (optional - for additional session data)
  getSessionAttributes: (attributes) => {
    return {
      // Add any session-specific attributes here if needed
    }
  }
})

// TypeScript declarations for Lucia
declare module "lucia" {
  interface Register {
    Lucia: typeof lucia
    DatabaseUserAttributes: {
      id: string
      email: string
      name: string | null
      role: "USER" | "ADMIN"
      credits: number
      createdAt: Date
      updatedAt: Date
    }
    DatabaseSessionAttributes: {
      // Add session attributes here if needed
    }
  }
}

// Utility functions for session management

/**
 * Validates the current session from cookies
 * Returns null if no valid session found
 */
export const validateRequest = cache(
  async (): Promise<
    { user: User; session: Session } | { user: null; session: null }
  > => {
    try {
      const cookieStore = cookies()
      const sessionId = (await cookieStore).get(lucia.sessionCookieName)?.value ?? null

      if (!sessionId) {
        return {
          user: null,
          session: null
        }
      }

      const result = await lucia.validateSession(sessionId)
      
      // Next.js throws when you attempt to set cookie when rendering page
      try {
        if (result.session && result.session.fresh) {
          const sessionCookie = lucia.createSessionCookie(result.session.id)
          ;(await cookieStore).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)
        }
        if (!result.session) {
          const sessionCookie = lucia.createBlankSessionCookie()
          ;(await cookieStore).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)
        }
      } catch {
        // Ignore cookie setting errors in static generation
      }

      return result
    } catch (error) {
      console.error("Session validation error:", error)
      return {
        user: null,
        session: null
      }
    }
  }
)

/**
 * Gets the current user from the session
 * Returns null if not authenticated
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const { user } = await validateRequest()
  return user
})

/**
 * Gets the current session
 * Returns null if no valid session
 */
export const getCurrentSession = cache(async (): Promise<Session | null> => {
  const { session } = await validateRequest()
  return session
})

/**
 * Checks if the current user is authenticated
 */
export const isAuthenticated = cache(async (): Promise<boolean> => {
  const { user } = await validateRequest()
  return !!user
})

/**
 * Checks if the current user is an admin
 */
export const isAdmin = cache(async (): Promise<boolean> => {
  const { user } = await validateRequest()
  return user?.role === "ADMIN"
})

/**
 * Requires authentication - throws error if not authenticated
 * Use this in API routes or server actions that require auth
 */
export const requireAuth = cache(async (): Promise<{ user: User; session: Session }> => {
  const result = await validateRequest()
  
  if (!result.user || !result.session) {
    throw new Error("Authentication required")
  }
  
  return result
})

/**
 * Requires admin role - throws error if not admin
 */
export const requireAdmin = cache(async (): Promise<{ user: User; session: Session }> => {
  const result = await requireAuth()
  
  if (result.user.role !== "ADMIN") {
    throw new Error("Admin privileges required")
  }
  
  return result
})

/**
 * Signs out the current user
 * Call this from server actions or API routes
 */
export async function signOut(): Promise<void> {
  try {
    const { session } = await validateRequest()
    
    if (!session) {
      return
    }

    await lucia.invalidateSession(session.id)
    
    const sessionCookie = lucia.createBlankSessionCookie()
    const cookieStore = cookies()
    ;(await cookieStore).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)
  } catch (error) {
    console.error("Sign out error:", error)
    throw new Error("Failed to sign out")
  }
}

/**
 * Creates a new session for a user
 * Use this after successful login/registration
 */
export async function createSession(userId: string): Promise<Session> {
  try {
    const session = await lucia.createSession(userId, {})
    const sessionCookie = lucia.createSessionCookie(session.id)
    
    const cookieStore = cookies()
    ;(await cookieStore).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)
    
    return session
  } catch (error) {
    console.error("Session creation error:", error)
    throw new Error("Failed to create session")
  }
}

/**
 * Invalidates all sessions for a user
 * Useful for security actions like password changes
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  try {
    await lucia.invalidateUserSessions(userId)
  } catch (error) {
    console.error("Session invalidation error:", error)
    throw new Error("Failed to invalidate sessions")
  }
}

/**
 * Refreshes the current session
 * Extends the session expiration time
 */
export async function refreshSession(): Promise<Session | null> {
  try {
    const { session } = await validateRequest()
    
    if (!session) {
      return null
    }

    // Create new session to refresh expiration
    const newSession = await lucia.createSession(session.userId, {})
    
    // Invalidate old session
    await lucia.invalidateSession(session.id)
    
    // Set new session cookie
    const sessionCookie = lucia.createSessionCookie(newSession.id)
    const cookieStore = cookies()
    ;(await cookieStore).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)
    
    return newSession
  } catch (error) {
    console.error("Session refresh error:", error)
    return null
  }
}

// Export types for convenience
export type { User, Session } from "lucia"