// lib/auth-context.tsx
'use client'
import { useSession } from 'next-auth/react'
import { createContext, useContext } from 'react'

const AuthContext = createContext<{ user: any, status: 'authenticated' | 'loading' | 'unauthenticated' }>({ user: null, status: 'loading' })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  return (
    <AuthContext.Provider value={{ user: session?.user || null, status }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
