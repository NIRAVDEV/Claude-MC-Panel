// lib/auth-context.tsx
"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from 'lucia'
import type { AuthContextType } from '@/types/lucia'

// Create the auth context
const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: React.ReactNode
  initialUser?: User | null
  initialSession?: Session | null
}

export function AuthProvider({ 
  children, 
  initialUser = null, 
  initialSession = null 
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [session, setSession] = useState<Session | null>(initialSession)
  const [isLoading, setIsLoading] = useState(false)

  // Sign in function
  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/lucia/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (data.success && data.user) {
        setUser(data.user)
        setSession(data.session)
        return { success: true }
      } else {
        return { 
          success: false, 
          error: data.error || 'Sign in failed' 
        }
      }
    } catch (error) {
      console.error('Sign in error:', error)
      return { 
        success: false, 
        error: 'Network error occurred' 
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Sign up function
  const signUp = async (email: string, password: string, name?: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/lucia/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name })
      })

      const data = await response.json()

      if (data.success && data.user) {
        setUser(data.user)
        setSession(data.session)
        return { success: true }
      } else {
        return { 
          success: false, 
          error: data.error || 'Sign up failed' 
        }
      }
    } catch (error) {
      console.error('Sign up error:', error)
      return { 
        success: false, 
        error: 'Network error occurred' 
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Sign out function
  const signOut = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/auth/lucia/signout', {
        method: 'POST'
      })
      
      setUser(null)
      setSession(null)
      
      // Redirect to home page after sign out
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh user data
  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/lucia/me')
      const data = await response.json()

      if (data.success && data.user) {
        setUser(data.user)
        setSession(data.session)
      } else {
        setUser(null)
        setSession(null)
      }
    } catch (error) {
      console.error('Refresh user error:', error)
      setUser(null)
      setSession(null)
    }
  }

  // Check authentication status on mount and periodically
  useEffect(() => {
    // Only refresh if we don't have initial data
    if (!initialUser && !initialSession) {
      refreshUser()
    }

    // Set up periodic session validation (every 5 minutes)
    const interval = setInterval(() => {
      if (user) {
        refreshUser()
      }
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [initialUser, initialSession, user])

  // Handle page visibility change to refresh session
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        refreshUser()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  const contextValue: AuthContextType = {
    user,
    session,
    signIn,
    signUp,
    signOut,
    refreshUser,
    isLoading
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

// Hook to check if user is authenticated
export function useIsAuthenticated(): boolean {
  const { user } = useAuth()
  return !!user
}

// Hook to check if user is admin
export function useIsAdmin(): boolean {
  const { user } = useAuth()
  return user?.role === 'ADMIN'
}

// Hook to require authentication (redirects if not authenticated)
export function useRequireAuth(): User {
  const { user, isLoading } = useAuth()
  
  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to sign in page
      window.location.href = '/auth/lucia/signin'
    }
  }, [user, isLoading])

  if (!user) {
    throw new Error('Authentication required')
  }

  return user
}

// Hook to require admin role (redirects if not admin)
export function useRequireAdmin(): User {
  const user = useRequireAuth()
  
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      // Redirect to dashboard or show error
      window.location.href = '/dashboard'
    }
  }, [user])

  if (user.role !== 'ADMIN') {
    throw new Error('Admin privileges required')
  }

  return user
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const user = useRequireAuth()
    
    return <WrappedComponent {...props} />
  }
}

// Higher-order component for admin-only routes
export function withAdmin<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AdminComponent(props: P) {
    const user = useRequireAdmin()
    
    return <WrappedComponent {...props} />
  }
}