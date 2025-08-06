// app/dashboard/servers/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Play, Square, RotateCcw, Settings, FileText, Terminal } from 'lucide-react'
import Link from 'next/link'

interface Server {
  id: string
  name: string
  software: string
  ram: string
  storage: string
  status: string
  containerId?: string
}

export default function ServerManagePage({ params }: any) {
  const { data: session } = useSession()
  const [server, setServer] = useState<Server | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')

  useEffect(() => {
    const fetchServer = async () => {
      try {
        const response = await fetch(`/api/servers/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setServer(data)
        }
      } catch (error) {
        console.error('Failed to fetch server:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchServer()
  }, [params.id])

  const handleServerAction = async (action: string) => {
    if (!server || !session?.user?.email) return

    setActionLoading(action)
    try {
      const response = await fetch(`/api/servers/${server.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverName: server.name,
          userEmail: session.user.email
        })
      })

      if (response.ok) {
        // Refresh server status
        const updatedResponse = await fetch(`/api/servers/${params.id}`)
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json()
          setServer(updatedData)
        }
      }
    } catch (error) {
      console.error(`Failed to ${action} server:`, error)
    } finally {
      setActionLoading('')
    }
  }

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  if (!server) {
    return <div className="container mx-auto px-4 py-8">Server not found</div>
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
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{server.name}</h1>
            <p className="text-muted-foreground">
              {server.software} • {server.ram} RAM • {server.storage} Storage
            </p>
          </div>
          <Badge variant={getStatusColor(server.status) as any} className="text-sm">
            {server.status}
          </Badge>
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
              disabled={server.status === 'running' || actionLoading === 'start'}
              className="flex items-center"
            >
              <Play className="h-4 w-4 mr-2" />
              {actionLoading === 'start' ? 'Starting...' : 'Start'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleServerAction('stop')}
              disabled={server.status === 'stopped' || actionLoading === 'stop'}
              className="flex items-center"
            >
              <Square className="h-4 w-4 mr-2" />
              {actionLoading === 'stop' ? 'Stopping...' : 'Stop'}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleServerAction('restart')}
              disabled={server.status === 'stopped' || actionLoading === 'restart'}
              className="flex items-center"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {actionLoading === 'restart' ? 'Restarting...' : 'Restart'}
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
                <div>[INFO] Server starting...</div>
                <div>[INFO] Loading world...</div>
                <div>[INFO] Done! Server is running</div>
                <div className="text-yellow-400">[WARN] Console integration coming soon!</div>
              </div>
              <div className="mt-4 flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter command..."
                  className="flex-1 px-3 py-2 border rounded-md"
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
                <p className="text-muted-foreground mb-4">File management interface coming soon!</p>
                <Button disabled variant="outline">Browse Files</Button>
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
                  <h4 className="font-semibold mb-2">Server Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Server Name</label>
                      <p className="font-medium">{server.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Software</label>
                      <p className="font-medium">{server.software}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">RAM</label>
                      <p className="font-medium">{server.ram}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Storage</label>
                      <p className="font-medium">{server.storage}</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-2 text-destructive">Danger Zone</h4>
                  <Button variant="destructive" disabled>
                    Delete Server
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

// (removed duplicate local definition of Tabs components)
// Please ensure that the Tabs components are defined in '@/components/ui/tabs' and imported from there.