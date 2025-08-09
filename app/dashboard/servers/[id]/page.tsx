// app/servers/[serverId]/page.tsx
import { ServerConsole } from '@/components/ServerConsole'
import { FileManager } from '@/components/FileManager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Server, HardDrive, Cpu, MapPin } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'

interface ServerPageProps {
  params: Promise<{ serverId: string }>
}

export default async function ServerPage({ params }: ServerPageProps) {
  const { user } = await requireAuth()
  const { serverId } = await params

  const server = await prisma.server.findFirst({
    where: {
      id: serverId,
      userId: user.id,
    },
    include: {
      node: true,
      user: {
        select: {
          email: true,
          name: true
        }
      }
    }
  })

  if (!server) {
    redirect('/dashboard')
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running': return 'bg-green-500'
      case 'starting': return 'bg-yellow-500'
      case 'stopped': return 'bg-red-500'
      case 'stopping': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  const getNodeStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online': return 'text-green-600'
      case 'offline': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Server Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{server.name}</h1>
            <p className="text-gray-600">Server ID: {server.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${getStatusColor(server.status)} text-white`}>
              {server.status.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Server Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="w-4 h-4" />
              Type
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold">{server.software}</p>
            <p className="text-sm text-gray-600">v{server.version}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Memory
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold">{server.ram} MB</p>
            <p className="text-sm text-gray-600">Allocated RAM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Storage
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold">{server.storage} MB</p>
            <p className="text-sm text-gray-600">Disk Space</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Node
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-lg font-bold">{server.node?.name || 'No Node'}</p>
            <p className={`text-sm ${getNodeStatusColor(server.node?.status || 'offline')}`}>
              {server.node?.status?.toUpperCase() || 'OFFLINE'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs - THIS IS WHERE THE CONSOLE IS ADDED */}
      {server.node ? (
        <Tabs defaultValue="console" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="console">Console</TabsTrigger>
            <TabsTrigger value="files">File Manager</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* CONSOLE TAB - This is the key part */}
          <TabsContent value="console" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Server Console</CardTitle>
                <CardDescription>
                  Real-time server console with command execution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ServerConsole
                  serverId={server.id}
                  serverName={server.name}
                  userEmail={user.email || 'user@example.com'}
                  nodeId={server.node.id}
                  nodeIp={server.node.ip}
                  nodePort={server.node.port}
                  nodeToken={server.node.verificationToken}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* FILE MANAGER TAB */}
          <TabsContent value="files" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>File Manager</CardTitle>
                <CardDescription>
                  Browse, edit, and manage your server files
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <FileManager
                  serverId={server.id}
                  serverName={server.name}
                  userEmail={user.email || 'user@example.com'}
                  nodeId={server.node.id}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Server Settings</CardTitle>
                <CardDescription>
                  Configure your server settings and properties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Server Name</label>
                    <input
                      type="text"
                      value={server.name}
                      className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Memory (MB)</label>
                      <input
                        type="number"
                        value={server.ram}
                        className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Storage (MB)</label>
                      <input
                        type="number"
                        value={server.storage}
                        className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Server Type</label>
                    <select 
                      value={server.software}
                      className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled
                    >
                      <option value="minecraft">Minecraft</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Software Version</label>
                    <input
                      type="text"
                      value={server.version}
                      className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Node Information</h4>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Node:</span>
                          <span className="ml-2 font-medium">{server.node.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <span className={`ml-2 font-medium ${getNodeStatusColor(server.node.status)}`}>
                            {server.node.status.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Location:</span>
                          <span className="ml-2 font-medium">{server.node.location || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Endpoint:</span>
                          <span className="ml-2 font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                            {server.node.ip}:{server.node.port}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Server className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Node Assigned</h3>
            <p className="text-gray-600 mb-4">
              This server doesn't have a node assigned yet. Please contact support.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}