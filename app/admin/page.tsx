// app/admin/page.tsx
'use client'

// Using lucia auth context instead of next-auth
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Server, Database, Settings, Plus, Eye, Trash2 } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  credits: number
  role: string
  createdAt: string
}

interface Node {
  id: string
  name: string
  ip: string
  port: number
  status: string
  maxRam: number
  usedRam: number
  maxStorage: number
  usedStorage: number
}

export default function AdminPage() {
  const { user: session, loading: statusLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [nodes, setNodes] = useState<Node[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!statusLoading && (!session || session.role !== 'ADMIN')) {
      router.push('/dashboard')
    }
  }, [statusLoading, session, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, nodesRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/nodes')
        ])
        
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setUsers(usersData)
        }
        
        if (nodesRes.ok) {
          const nodesData = await nodesRes.json()
          setNodes(nodesData)
        }
      } catch (error) {
        console.error('Failed to fetch admin data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.role === 'ADMIN') {
      fetchData()
    }
  }, [session])

  if (statusLoading || isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  if (!session || session.role !== 'ADMIN') {
    return null
  }

  const getNodeStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return 'success'
      case 'offline':
        return 'destructive'
      case 'maintenance':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">Manage your hosting platform</p>
      </div>

      {/* Admin Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <Users className="h-5 w-5 text-blue-500 mr-2" />
              {users.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <Server className="h-5 w-5 text-green-500 mr-2" />
              {nodes.filter(n => n.status === 'online').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <Database className="h-5 w-5 text-yellow-500 mr-2" />
              {users.reduce((sum, user) => sum + user.credits, 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center text-green-600">
              <Settings className="h-5 w-5 mr-2" />
              Online
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="nodes">Nodes</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage user accounts and credits</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <h4 className="font-semibold">{user.name}</h4>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                      <Badge variant="outline">{user.credits} credits</Badge>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nodes">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Node Management</CardTitle>
                  <CardDescription>Manage your server nodes</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Node
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {nodes.length === 0 ? (
                  <div className="text-center py-8">
                    <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No nodes configured</h3>
                    <p className="text-muted-foreground mb-4">Add your first node to start hosting servers</p>
                    <Button>Add Your First Node</Button>
                  </div>
                ) : (
                  nodes.map((node) => (
                    <div key={node.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Server className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <h4 className="font-semibold">{node.name}</h4>
                          <p className="text-sm text-muted-foreground">{node.ip}:{node.port}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getNodeStatusColor(node.status) as any}>
                          {node.status}
                        </Badge>
                        <Badge variant="outline">
                          {node.usedRam}GB / {node.maxRam}GB RAM
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure platform settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-4">Credit Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Credits per Ad View</label>
                      <p className="font-medium">5-10 credits</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Credits per Link Click</label>
                      <p className="font-medium">2-5 credits</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-4">Server Pricing</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">RAM Cost (per GB/month)</label>
                      <p className="font-medium">25 credits</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Storage Cost (per GB/month)</label>
                      <p className="font-medium">2 credits</p>
                    </div>
                  </div>
                </div>
                
                <Button disabled>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}