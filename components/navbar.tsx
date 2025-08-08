// components/navbar.tsx
'use client'

import { useState } from 'react'
// Switched from next-auth to internal Lucia-based auth context
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { User, Server, Coins, Settings, LogOut, Menu, X } from 'lucide-react'

export function Navbar() {
  const { user: sessionUser, refreshUser } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      await refreshUser()
      window.location.href = '/auth/signin'
    } catch (e) {
      console.error('Sign out failed', e)
    }
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Server className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">MinecraftHost</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary">
              Dashboard
            </Link>
            <Link href="/earn" className="text-sm font-medium hover:text-primary">
              Earn Credits
            </Link>
            <Link href="/billing" className="text-sm font-medium hover:text-primary">
              Billing
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
    {sessionUser ? (
              <>
                {/* Credits Display */}
                <div className="hidden sm:flex items-center space-x-1 bg-muted px-3 py-1 rounded-full">
                  <Coins className="h-4 w-4 text-yellow-500" />
      <span className="text-sm font-medium">{sessionUser.credits || 0}</span>
                </div>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{sessionUser.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {sessionUser.email}
                        </p>
                        <div className="flex items-center space-x-1 pt-1">
                          <Coins className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs">{sessionUser.credits || 0} credits</span>
                          {sessionUser.role === 'ADMIN' && (
                            <Badge variant="secondary" className="text-xs">Admin</Badge>
                          )}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">
                        <Server className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/earn">
                        <Coins className="mr-2 h-4 w-4" />
                        Earn Credits
                      </Link>
                    </DropdownMenuItem>
        {sessionUser.role === 'ADMIN' && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <Settings className="mr-2 h-4 w-4" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
      <Link href="/auth/signin"><Button>Sign In</Button></Link>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-3">
              <Link 
                href="/dashboard" 
                className="text-sm font-medium hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/earn" 
                className="text-sm font-medium hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Earn Credits
              </Link>
              <Link 
                href="/billing" 
                className="text-sm font-medium hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Billing
              </Link>
              {sessionUser?.role === 'ADMIN' && (
                <Link 
                  href="/admin" 
                  className="text-sm font-medium hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin Panel
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}