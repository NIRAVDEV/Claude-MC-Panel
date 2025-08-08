// app/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
// import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Server, Play, Square, RotateCcw, Settings, Coins } from 'lucide-react'
import { requireAuth } from '@/lib/auth-utils';
import SignOutButton from '@/components/auth/SignOutButton'

interface Server {
  id: string
  name: string
  software: string
  ram: string
  storage: string
  status: string
}

export default function DashboardPage() {
  // const { data: session, status } = useSession()
  const router = useRouter()
  const { user, loading: authLoading, refreshUser } = useAuth()
  const [servers, setServers] = useState<Server[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Redirect if unauthenticated when loading completes
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin')
    }
  }, [authLoading, user, router])

  // Refresh user once on mount if needed
  useEffect(() => {
    if (!user && !authLoading) {
      refreshUser()
    }
  }, [])

  // Fetch servers function
  const fetchServers = async () => {
    try {
      const response = await fetch('/api/servers', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setServers(Array.isArray(data.servers) ? data.servers : [])
      } else {
        setServers([])
      }
    } catch (error) {
      console.error('Failed to fetch servers:', error)
      setServers([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch servers when user is authenticated
  useEffect(() => {
    if (!authLoading && user) {
      fetchServers()
    }
  }, [authLoading, user])

  if (authLoading || isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  if (!user) {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'success'
      case 'stopped':
        return 'secondary'
      case 'starting':
      case 'stopping':
        return 'warning'
      default:
        return 'destructive'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user.name}
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/servers/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Server
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Your Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <Coins className="h-5 w-5 text-yellow-500 mr-2" />
                {user.credits || 0}
              </div>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link href="/earn">Earn More</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <Server className="h-5 w-5 text-blue-500 mr-2" />
                {servers.length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Running Servers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center text-green-600">
                <Play className="h-5 w-5 mr-2" />
                {/* {servers.filter(s => s.status === 'running').length || <p className="text-muted-foreground">No Servers are created</p>} */}
                {(servers || []).filter(s => s.status === 'running').length || <p className="text-muted-foreground">0</p>}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Account Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                {user.role || 'USER'}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Servers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Servers</CardTitle>
              <CardDescription>Manage your Minecraft servers</CardDescription>
            </div>
            <Button asChild>
              <Link href="/dashboard/servers/create">
                <Plus className="h-4 w-4 mr-2" />
                New Server
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {servers.length === 0 ? (
            <div className="text-center py-12">
              <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No servers yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first Minecraft server to get started
              </p>
              <Button asChild>
                <Link href="/dashboard/servers/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Server
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {servers.map((server) => (
                <div key={server.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Server className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <h4 className="font-semibold">{server.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {server.software} • {server.ram} RAM • {server.storage} Storage
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(server.status) as any}>
                      {server.status}
                    </Badge>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/servers/${server.id}`}>
                        <Settings className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}