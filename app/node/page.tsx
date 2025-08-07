// ./app/node/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Plus, Server, MapPin, Users, Activity, Settings, Trash2, Edit, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'

interface Node {
  id: string
  name: string
  location: string
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | null | undefined
  maxServers: number
  currentServers?: number
  cpuUsage?: number
  ramUsage?: number
  diskUsage?: number
  verificationToken?: string
  createdAt: string
  updatedAt: string
  servers?: {
    id: string
    name: string
    status: string
  }[]
}

interface CreateNodeData {
  name: string
  description?: string
  location: string
  fqdn: string
  scheme: 'http' | 'https'
  behindProxy: boolean
  maintenanceMode: boolean
  maxServers: number
  totalMemory: number
  memoryOverallocation: number
  totalDiskSpace: number
  diskOverallocation: number
  daemonPort: number
  daemonSftpPort: number
  publicNode: boolean
}

export default function NodesPage() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [createFormData, setCreateFormData] = useState<CreateNodeData>({
    name: '',
    description: '',
    location: '',
    fqdn: '',
    scheme: 'https',
    behindProxy: false,
    maintenanceMode: false,
    maxServers: 10,
    totalMemory: 5120,
    memoryOverallocation: 0,
    totalDiskSpace: 102400,
    diskOverallocation: 0,
    daemonPort: 8080,
    daemonSftpPort: 2022,
    publicNode: true
  })

  // Status badge configuration with safe defaults
  const getStatusBadge = (status: string | null | undefined) => {
    const statusConfig = {
      ONLINE: {
        variant: 'default' as const,
        icon: Activity,
        color: 'text-green-600',
        label: 'Online'
      },
      OFFLINE: {
        variant: 'secondary' as const,
        icon: Server,
        color: 'text-gray-500',
        label: 'Offline'
      },
      MAINTENANCE: {
        variant: 'destructive' as const,
        icon: Settings,
        color: 'text-yellow-600',
        label: 'Maintenance'
      }
    }

    // Default to OFFLINE if status is null, undefined, or unknown
    const safeStatus = status && status in statusConfig ? status as keyof typeof statusConfig : 'OFFLINE'
    const config = statusConfig[safeStatus]
    const IconComponent = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    )
  }

  const fetchNodes = async () => {
    try {
      const response = await fetch('/api/admin/nodes')
      if (!response.ok) {
        throw new Error('Failed to fetch nodes')
      }
      const data = await response.json()
      setNodes(data)
    } catch (error) {
      console.error('Error fetching nodes:', error)
      toast({
        title: "Error",
        description: "Failed to fetch nodes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields and debug
    const requiredFields = [
      'name',
      'location',
      'fqdn',
      'scheme',
      'behindProxy',
      'maintenanceMode',
      'publicNode',
      'maxServers',
      'totalMemory',
      'memoryOverallocation',
      'totalDiskSpace',
      'diskOverallocation',
      'daemonPort',
      'daemonSftpPort',
    ]
    let missingFields: string[] = []
    for (const field of requiredFields) {
      const value = (createFormData as any)[field]
      if (
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (typeof value === 'number' && isNaN(value))
      ) {
        missingFields.push(field)
      }
    }
    // Debug: log payload and missing fields to console and show as plain string in toast
    const debugPayload = { ...createFormData, ip: createFormData.fqdn, port: createFormData.daemonPort };
    console.log('[Node Create] Payload:', debugPayload);
    if (missingFields.length > 0) {
      console.warn('[Node Create] Missing/Invalid fields:', missingFields);
    }
    toast({
      title: 'Debug Node Payload',
      description:
        'Payload: ' + JSON.stringify(debugPayload, null, 2) +
        (missingFields.length > 0 ? '\nMissing/Invalid: ' + missingFields.join(', ') : ''),
      variant: missingFields.length > 0 ? 'destructive' : 'default',
    })
    if (missingFields.length > 0) {
      return
    }

    try {
      const response = await fetch('/api/admin/nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...createFormData,
          ip: createFormData.fqdn, // Use fqdn as IP for now
          port: createFormData.daemonPort, // Map daemonPort to port for backend
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create node')
      }

      await response.json()
      toast({
        title: "Success",
        description: "Node created successfully",
      })
      setCreateDialogOpen(false)
      setCreateFormData({
        name: '',
        description: '',
        location: '',
        fqdn: '',
        scheme: 'https',
        behindProxy: false,
        maintenanceMode: false,
        maxServers: 10,
        totalMemory: 5120,
        memoryOverallocation: 0,
        totalDiskSpace: 102400,
        diskOverallocation: 0,
        daemonPort: 8080,
        daemonSftpPort: 2022,
        publicNode: true
      })
      fetchNodes()
    } catch (error) {
      console.error('Error creating node:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create node",
        variant: "destructive",
      })
    }
  }

  const handleEditNode = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedNode) return

    try {
      const response = await fetch(`/api/admin/nodes?id=${selectedNode.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: selectedNode.name,
          location: selectedNode.location,
          maxServers: selectedNode.maxServers,
          status: selectedNode.status
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update node')
      }

      toast({
        title: "Success",
        description: "Node updated successfully",
      })
      
      setEditDialogOpen(false)
      setSelectedNode(null)
      fetchNodes()
    } catch (error) {
      console.error('Error updating node:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update node",
        variant: "destructive",
      })
    }
  }

  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm('Are you sure you want to delete this node? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/nodes?id=${nodeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete node')
      }

      toast({
        title: "Success",
        description: "Node deleted successfully",
      })
      
      fetchNodes()
    } catch (error) {
      console.error('Error deleting node:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete node",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (node: Node) => {
    setSelectedNode(node)
    setEditDialogOpen(true)
  }

  const handleInputChange = (field: keyof CreateNodeData, value: string | number | boolean) => {
    setCreateFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleEditInputChange = (field: keyof Node, value: string | number) => {
    if (!selectedNode) return
    
    setSelectedNode(prev => prev ? ({
      ...prev,
      [field]: value
    }) : null)
  }

  useEffect(() => {
    fetchNodes()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  const totalNodes = nodes.length
  const onlineNodes = nodes.filter(node => node.status === 'ONLINE').length
  const totalServers = nodes.reduce((sum, node) => sum + (node.servers?.length || 0), 0)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Node Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your hosting infrastructure and server nodes
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Node
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Node</DialogTitle>
              <DialogDescription>
                Create a new local or remote node for servers to be installed to.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateNode} className="space-y-6">
              {/* Basic Details Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-blue-600">Basic Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={createFormData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g., node1"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Character limits: a-z A-Z 0-9 _ . and -, max 100 characters</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="location">Location *</Label>
                    <Select
                      value={createFormData.location}
                      onValueChange={(value) => handleInputChange('location', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us_east">US East</SelectItem>
                        <SelectItem value="us_west">US West</SelectItem>
                        <SelectItem value="eu_central">EU Central</SelectItem>
                        <SelectItem value="asia_pacific">Asia Pacific</SelectItem>
                        <SelectItem value="custom">Custom Location</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={createFormData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Enter description for this node..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label>Node Visibility</Label>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="public"
                          name="visibility"
                          checked={createFormData.publicNode}
                          onChange={() => handleInputChange('publicNode', true)}
                          className="mr-2"
                        />
                        <Label htmlFor="public">Public</Label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="private"
                          name="visibility"
                          checked={!createFormData.publicNode}
                          onChange={() => handleInputChange('publicNode', false)}
                          className="mr-2"
                        />
                        <Label htmlFor="private">Private</Label>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">By setting a node to private, you will be denying the ability to auto-deploy to this node.</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="fqdn">FQDN *</Label>
                    <Input
                      id="fqdn"
                      value={createFormData.fqdn}
                      onChange={(e) => handleInputChange('fqdn', e.target.value)}
                      placeholder="e.g., 192.168.1.37 or node.example.com"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Please enter domain name (e.g. node.example.com) to be used for connecting to the daemon. An IP address may be used only if you are not using SSL for this node.</p>
                  </div>
                </div>
              </div>

              {/* Configuration Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-blue-600">Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="totalMemory">Total Memory *</Label>
                    <div className="flex">
                      <Input
                        id="totalMemory"
                        type="number"
                        value={createFormData.totalMemory}
                        onChange={(e) => handleInputChange('totalMemory', parseInt(e.target.value) || 5120)}
                        min="1"
                        className="rounded-r-none"
                      />
                      <div className="bg-gray-100 dark:bg-gray-800 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r px-3 flex items-center text-sm">
                        MiB
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Enter the total amount of memory available for new servers.</p>
                  </div>

                  <div>
                    <Label htmlFor="memoryOverallocation">Memory Over-Allocation</Label>
                    <div className="flex">
                      <Input
                        id="memoryOverallocation"
                        type="number"
                        value={createFormData.memoryOverallocation}
                        onChange={(e) => handleInputChange('memoryOverallocation', parseInt(e.target.value) || 0)}
                        min="0"
                        max="100"
                        className="rounded-r-none"
                      />
                      <div className="bg-gray-100 dark:bg-gray-800 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r px-3 flex items-center text-sm">
                        %
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Enter the total amount of memory you would like to allow over-allocation of memory.</p>
                  </div>

                  <div>
                    <Label htmlFor="totalDiskSpace">Total Disk Space *</Label>
                    <div className="flex">
                      <Input
                        id="totalDiskSpace"
                        type="number"
                        value={createFormData.totalDiskSpace}
                        onChange={(e) => handleInputChange('totalDiskSpace', parseInt(e.target.value) || 102400)}
                        min="1"
                        className="rounded-r-none"
                      />
                      <div className="bg-gray-100 dark:bg-gray-800 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r px-3 flex items-center text-sm">
                        MiB
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Enter the total amount of disk space available for new servers.</p>
                  </div>

                  <div>
                    <Label htmlFor="diskOverallocation">Disk Over-Allocation</Label>
                    <div className="flex">
                      <Input
                        id="diskOverallocation"
                        type="number"
                        value={createFormData.diskOverallocation}
                        onChange={(e) => handleInputChange('diskOverallocation', parseInt(e.target.value) || 0)}
                        min="0"
                        max="100"
                        className="rounded-r-none"
                      />
                      <div className="bg-gray-100 dark:bg-gray-800 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r px-3 flex items-center text-sm">
                        %
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Enter the total amount of disk space you would like to allow over-allocation of disk space.</p>
                  </div>

                  <div>
                    <Label htmlFor="daemonPort">Daemon Port *</Label>
                    <Input
                      id="daemonPort"
                      type="number"
                      value={createFormData.daemonPort}
                      onChange={(e) => handleInputChange('daemonPort', parseInt(e.target.value) || 8080)}
                      min="1"
                      max="65535"
                    />
                    <p className="text-xs text-gray-500 mt-1">The daemon runs its own SFTP management container and does not use the SSHd process on the main physical server.</p>
                  </div>

                  <div>
                    <Label htmlFor="daemonSftpPort">Daemon SFTP Port *</Label>
                    <Input
                      id="daemonSftpPort"
                      type="number"
                      value={createFormData.daemonSftpPort}
                      onChange={(e) => handleInputChange('daemonSftpPort', parseInt(e.target.value) || 2022)}
                      min="1"
                      max="65535"
                    />
                    <p className="text-xs text-gray-500 mt-1">The daemon runs its own SFTP management container and does not use the SSHd process on the main physical server.</p>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-medium mb-3">Daemon Communication Settings</h4>
                  <div className="space-y-3">
                    <div>
                      <Label>Communicates Over SSL</Label>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="https"
                            name="scheme"
                            checked={createFormData.scheme === 'https'}
                            onChange={() => handleInputChange('scheme', 'https')}
                            className="mr-2"
                          />
                          <Label htmlFor="https">Use SSL Connection</Label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="http"
                            name="scheme"
                            checked={createFormData.scheme === 'http'}
                            onChange={() => handleInputChange('scheme', 'http')}
                            className="mr-2"
                          />
                          <Label htmlFor="http">Use HTTP Connection</Label>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">In most cases you should select to use a SSL connection. If using an IP Address or you do not wish to use SSL at all, select a HTTP connection.</p>
                    </div>

                    <div>
                      <Label>Behind Proxy</Label>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="no-proxy"
                            name="proxy"
                            checked={!createFormData.behindProxy}
                            onChange={() => handleInputChange('behindProxy', false)}
                            className="mr-2"
                          />
                          <Label htmlFor="no-proxy">Not Behind Proxy</Label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="behind-proxy"
                            name="proxy"
                            checked={createFormData.behindProxy}
                            onChange={() => handleInputChange('behindProxy', true)}
                            className="mr-2"
                          />
                          <Label htmlFor="behind-proxy">Behind Proxy</Label>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">If you are running the daemon behind a proxy such as Cloudflare, select this to have the daemon skip looking for certificates on boot.</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="maintenance"
                        checked={createFormData.maintenanceMode}
                        onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
                      />
                      <Label htmlFor="maintenance">Maintenance Mode</Label>
                    </div>
                    <p className="text-xs text-gray-500">If the node is marked as 'Under Maintenance' users won't be able to access servers on this node.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  Create Node
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCreateDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Nodes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalNodes}</p>
              </div>
              <Server className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Online Nodes</p>
                <p className="text-2xl font-bold text-green-600">{onlineNodes}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Servers</p>
                <p className="text-2xl font-bold text-purple-600">{totalServers}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nodes List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {nodes.map((node) => (
          <Card key={node.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{node.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {node.location}
                  </CardDescription>
                </div>
                {getStatusBadge(node.status)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Server Info */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Servers</span>
                <span className="font-medium">
                  {node.servers?.length || 0} / {node.maxServers}
                </span>
              </div>

              {/* Progress bar for server usage */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(((node.servers?.length || 0) / node.maxServers) * 100, 100)}%`
                  }}
                />
              </div>

              {/* Resource Usage (if available) */}
              {(node.cpuUsage !== undefined || node.ramUsage !== undefined) && (
                <div className="space-y-2">
                  {node.cpuUsage !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">CPU</span>
                      <span className="font-medium">{node.cpuUsage}%</span>
                    </div>
                  )}
                  {node.ramUsage !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">RAM</span>
                      <span className="font-medium">{node.ramUsage}%</span>
                    </div>
                  )}
                </div>
              )}

              {/* Verification Token Indicator */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Shield className="h-3 w-3" />
                <span>Secured with verification token</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(node)}
                  className="flex-1"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteNode(node.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {/* Active Servers */}
              {node.servers && node.servers.length > 0 && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Active Servers:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {node.servers.slice(0, 3).map((server) => (
                      <Badge key={server.id} variant="outline" className="text-xs">
                        {server.name}
                      </Badge>
                    ))}
                    {node.servers.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{node.servers.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {nodes.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">No Nodes Found</CardTitle>
            <CardDescription className="mb-4">
              Get started by adding your first server node to the platform.
            </CardDescription>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Node
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Node Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Node</DialogTitle>
            <DialogDescription>
              Update node information and settings.
            </DialogDescription>
          </DialogHeader>
          {selectedNode && (
            <form onSubmit={handleEditNode} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Node Name</Label>
                <Input
                  id="edit-name"
                  value={selectedNode.name}
                  onChange={(e) => handleEditInputChange('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={selectedNode.location}
                  onChange={(e) => handleEditInputChange('location', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-maxServers">Max Servers</Label>
                <Input
                  id="edit-maxServers"
                  type="number"
                  value={selectedNode.maxServers}
                  onChange={(e) => handleEditInputChange('maxServers', parseInt(e.target.value) || 10)}
                  min="1"
                  max="100"
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={selectedNode.status || 'OFFLINE'}
                  onValueChange={(value) => handleEditInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="OFFLINE">Offline</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">Update Node</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}