// app/dashboard/servers/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
// import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Play, Square, RotateCcw, Settings, FileText, Terminal, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'

interface Server {
  id: string
  name: string
  software: string
  ram: string
  storage: string
  status: string
  containerId?: string
  node?: {
    id: string
    name: string
    ip: string
    status: string
  }
  createdAt: string
  updatedAt: string
}

interface ServerResponse {
  success: boolean
  server?: Server
  error?: string
}

interface ActionResponse {
  success: boolean
  message?: string
  error?: string
}

export default function ServerManagePage() {
  const params = useParams()
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [server, setServer] = useState<Server | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const serverId = params?.id as string

  // Lucia session fetcher
  async function fetchLuciaSession() {
    try {
      const res = await fetch('/api/auth/session', {
        credentials: 'include'
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.user || null
    } catch {
      return null
    }
  }

  // Fetch server data
  const fetchServer = async () => {
    if (!serverId) return
    
    try {
      const response = await fetch(`/api/servers/${serverId}`, {
        credentials: 'include'
      })
      const data: ServerResponse = await response.json()
      
      if (data.success && data.server) {
        setServer(data.server)
      } else {
        console.error('Failed to fetch server:', data.error)
        toast({
          title: "Error",
          description: data.error || "Failed to load server",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Failed to fetch server:', error)
      toast({
        title: "Error",
        description: "Network error while loading server",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch server status
  const fetchServerStatus = async () => {
    if (!serverId) return
    
    try {
      const response = await fetch(`/api/servers/${serverId}/status`, {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success && server) {
        setServer(prev => prev ? { ...prev, status: data.status } : null)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch server status:', error)
    }
  }

  // Handle server actions (start, stop, restart)
  const handleServerAction = async (action: string) => {
    if (!server || !user) return

    setActionLoading(action)
    try {
      const response = await fetch(`/api/servers/${server.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })

      const data: ActionResponse = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: data.message || `Server ${action} initiated`,
        })
        
        // Update server status optimistically
        const newStatus = action === 'start' ? 'STARTING' : 
                          action === 'stop' ? 'STOPPING' : 
                          action === 'restart' ? 'RESTARTING' : server.status
        
        setServer(prev => prev ? { ...prev, status: newStatus } : null)
        
        // Fetch updated status after a delay
        setTimeout(() => {
          fetchServerStatus()
        }, 2000)
      } else {
        toast({
          title: "Error",
          description: data.error || `Failed to ${action} server`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(`Failed to ${action} server:`, error)
      toast({
        title: "Error",
        description: `Network error while trying to ${action} server`,
        variant: "destructive",
      })
    } finally {
      setActionLoading('')
    }
  }

  // Lucia session fetch
  useEffect(() => {
    async function loadSession() {
      setAuthLoading(true)
      const luciaUser = await fetchLuciaSession()
      setUser(luciaUser)
      setAuthLoading(false)
    }
    loadSession()
  }, [])

  // Initial load
  useEffect(() => {
    if (!authLoading && user && serverId) {
      fetchServer()
    }
  }, [authLoading, user, serverId])

  // Auto-refresh server status every 30 seconds
  useEffect(() => {
    if (!server) return

    const interval = setInterval(() => {
      fetchServerStatus()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [server, serverId])

  // Redirect if not authenticated
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">Please sign in to access your servers</p>
          <Button asChild>
            <Link href="/auth/lucia/signin">Sign In</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading server...</span>
        </div>
      </div>
    )
  }

  if (!server) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Server Not Found</h1>
          <p className="text-muted-foreground mb-4">The server you're looking for doesn't exist or you don't have access to it.</p>
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'default' // green
      case 'stopped':
      case 'created':
        return 'secondary' // gray
      case 'starting':
      case 'stopping':
      case 'restarting':
        return 'outline' // yellow/orange
      case 'error':
      case 'dead':
        return 'destructive' // red
      default:
        return 'secondary'
    }
  }

  const isServerRunning = server.status.toLowerCase() === 'running'
  const isServerStopped = ['stopped', 'created', 'exited'].includes(server.status.toLowerCase())
  const isServerTransitioning = ['starting', 'stopping', 'restarting'].includes(server.status.toLowerCase())

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{server!.name}</h1>
            <p className="text-muted-foreground">
              {server!.software} • {server!.ram} RAM • {server!.storage} Storage
            </p>
            {server!.node && (
              <p className="text-sm text-muted-foreground mt-1">
                Node: {server!.node.name} ({server!.node.ip}) • Status: {server!.node.status}
              </p>
            )}
          </div>
          <div className="text-right">
            <Badge variant={getStatusColor(server!.status) as any} className="text-sm mb-2">
              {server!.status}
            </Badge>
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Server Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Server Controls</CardTitle>
          <CardDescription>Manage your server's state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button
              onClick={() => handleServerAction('start')}
              disabled={isServerRunning || isServerTransitioning || actionLoading === 'start'}
              className="flex items-center"
            >
              {actionLoading === 'start' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {actionLoading === 'start' ? 'Starting...' : 'Start'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleServerAction('stop')}
              disabled={isServerStopped || actionLoading === 'stop'}
              className="flex items-center"
            >
              {actionLoading === 'stop' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Square className="h-4 w-4 mr-2" />
              )}
              {actionLoading === 'stop' ? 'Stopping...' : 'Stop'}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleServerAction('restart')}
              disabled={isServerStopped || actionLoading === 'restart'}
              className="flex items-center"
            >
              {actionLoading === 'restart' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              {actionLoading === 'restart' ? 'Restarting...' : 'Restart'}
            </Button>
            <Button
              variant="outline"
              onClick={fetchServerStatus}
              className="flex items-center ml-auto"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Server Management Tabs */}
      <Tabs defaultValue="console" className="space-y-6">
        <TabsList>
          <TabsTrigger value="console">Console</TabsTrigger>
          <TabsTrigger value="files">File Manager</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="console">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Terminal className="h-5 w-5 mr-2" />
                Server Console
              </CardTitle>
              <CardDescription>View logs and execute commands</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm min-h-[400px] overflow-y-auto">
                <div className="text-blue-400">[{new Date().toLocaleTimeString()}] [INFO] MinecraftHost Console</div>
                <div className="text-green-400">[{new Date().toLocaleTimeString()}] [INFO] Server: {server!.name}</div>
                <div className="text-green-400">[{new Date().toLocaleTimeString()}] [INFO] Status: {server!.status}</div>
                <div className="text-green-400">[{new Date().toLocaleTimeString()}] [INFO] Software: {server!.software}</div>
                <div className="text-yellow-400">[{new Date().toLocaleTimeString()}] [WARN] Real-time console coming soon!</div>
                <div className="text-gray-400 mt-4">
                  ┌─ Console Features Coming Soon ─────────────────────────┐<br/>
                  │ • Real-time log streaming                              │<br/>
                  │ • Command execution                                    │<br/>
                  │ • Server performance monitoring                       │<br/>
                  │ • Auto-scroll and log filtering                       │<br/>
                  └────────────────────────────────────────────────────────┘
                </div>
              </div>
              <div className="mt-4 flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter command... (coming soon)"
                  className="flex-1 px-3 py-2 border rounded-md bg-muted"
                  disabled
                />
                <Button disabled>Send</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                File Manager
              </CardTitle>
              <CardDescription>Browse and edit your server files</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">File Manager</h3>
                <p className="text-muted-foreground mb-4">
                  Browse, edit, and upload files to your server. Coming soon with:
                </p>
                <div className="text-sm text-muted-foreground mb-6 space-y-1">
                  <p>• server.properties editor</p>
                  <p>• Plugin/mod management</p>
                  <p>• World file browser</p>
                  <p>• Drag & drop file upload</p>
                </div>
                <Button disabled variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Browse Files
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Server Settings
              </CardTitle>
              <CardDescription>Configure your server settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-4">Server Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Server Name</label>
                      <p className="font-medium bg-muted px-3 py-2 rounded-md">{server!.name}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Software</label>
                      <p className="font-medium bg-muted px-3 py-2 rounded-md capitalize">{server!.software}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">RAM</label>
                      <p className="font-medium bg-muted px-3 py-2 rounded-md">{server!.ram}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Storage</label>
                      <p className="font-medium bg-muted px-3 py-2 rounded-md">{server!.storage}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Container ID</label>
                      <p className="font-medium bg-muted px-3 py-2 rounded-md text-sm font-mono">
                        {server!.containerId || 'Not available'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Created</label>
                      <p className="font-medium bg-muted px-3 py-2 rounded-md">
                        {new Date(server!.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {server!.node && (
                  <div className="border-t pt-6">
                    <h4 className="font-semibold mb-4">Node Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Node Name</label>
                        <p className="font-medium bg-muted px-3 py-2 rounded-md">{server!.node!.name}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Node IP</label>
                        <p className="font-medium bg-muted px-3 py-2 rounded-md">{server!.node!.ip}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-2 text-destructive">Danger Zone</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete this server and all its data. This action cannot be undone.
                  </p>
                  <Button variant="destructive" disabled>
                    Delete Server (Coming Soon)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
