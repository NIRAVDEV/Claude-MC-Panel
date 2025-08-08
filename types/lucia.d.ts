// types/lucia.d.ts
/// <reference types="lucia" />

declare namespace Lucia {
  type Auth = import("../lib/lucia").Auth
  type DatabaseUserAttributes = {
    id: string
    email: string
    name: string | null
    role: "USER" | "ADMIN"
    credits: number
    createdAt: Date
    updatedAt: Date
  }
  type DatabaseSessionAttributes = {}
}

// Global type augmentation for better TypeScript support
declare global {
  namespace Lucia {
    interface Register {
      Lucia: typeof import("../lib/lucia").lucia
      DatabaseUserAttributes: {
        id: string
        email: string
        name: string | null
        role: "USER" | "ADMIN"
        credits: number
        createdAt: Date
        updatedAt: Date
      }
      DatabaseSessionAttributes: {}
    }
  }
}

// User type with all attributes available in session
export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: "USER" | "ADMIN"
  credits: number
  // These may not be included in the Lucia user object (not returned by getUserAttributes)
  // so mark them optional to avoid type mismatch with `lucia`'s `User` type.
  createdAt?: Date
  updatedAt?: Date
}

// Session context type
export interface AuthSession {
  user: AuthUser | null
  session: import("lucia").Session | null
}

// Auth context for React components
export interface AuthContextType extends AuthSession {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  isLoading: boolean
}

export {}