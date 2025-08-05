'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Server, Plus, Edit, Trash2, Activity, HardDrive, Cpu, MemoryStick, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';

interface Node {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'online' | 'offline' | 'maintenance';
  region: string;
  maxRam: number;
  maxStorage: number;
  usedRam: number;
  usedStorage: number;
  serverCount: number;
  cpuUsage: number;
  uptime: number;
  lastPing: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NodesPage = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 2376,
    region: '',
    maxRam: 16,
    maxStorage: 500,
    description: ''
  });

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      const response = await fetch('/api/admin/nodes');
      if (response.ok) {
        const data = await response.json();
        setNodes(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch nodes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Node created successfully",
        });
        fetchNodes();
        setIsCreateOpen(false);
        resetForm();
      } else {
        throw new Error('Failed to create node');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create node",
        variant: "destructive",
      });
    }
  };

  const handleUpdateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode) return;

    try {
      const response = await fetch(`/api/admin/nodes/${editingNode.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Node updated successfully",
        });
        fetchNodes();
        setEditingNode(null);
        resetForm();
      } else {
        throw new Error('Failed to update node');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update node",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm('Are you sure you want to delete this node?')) return;

    try {
      const response = await fetch(`/api/admin/nodes/${nodeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Node deleted successfully",
        });
        fetchNodes();
      } else {
        throw new Error('Failed to delete node');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete node",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      host: '',
      port: 2376,
      region: '',
      maxRam: 16,
      maxStorage: 500,
      description: ''
    });
  };

  const getStatusBadge = (status: Node['status']) => {
    const statusConfig = {
      online: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      offline: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      maintenance: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatBytes = (bytes: number) => {
    return `${bytes} GB`;
  };

  const formatUptime = (hours: number) => {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Node Management</h1>
          <p className="text-gray-600 mt-2">Manage hosting nodes and infrastructure</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Node
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Node</DialogTitle>
              <DialogDescription>
                Add a new hosting node to the platform
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateNode}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Node Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="US-East-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="region">Region</Label>
                    <Select value={formData.region} onValueChange={(value) => setFormData({ ...formData, region: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                        <SelectItem value="us-west-1">US West (N. California)</SelectItem>
                        <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                        <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="host">Host Address</Label>
                    <Input
                      id="host"
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      placeholder="192.168.1.100"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                      placeholder="2376"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxRam">Max RAM (GB)</Label>
                    <Input
                      id="maxRam"
                      type="number"
                      value={formData.maxRam}
                      onChange={(e) => setFormData({ ...formData, maxRam: parseInt(e.target.value) })}
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxStorage">Max Storage (GB)</Label>
                    <Input
                      id="maxStorage"
                      type="number"
                      value={formData.maxStorage}
                      onChange={(e) => setFormData({ ...formData, maxStorage: parseInt(e.target.value) })}
                      min="10"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Additional notes about this node..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Node</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nodes.map((node) => (
              <Card key={node.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">{node.name}</CardTitle>
                  {getStatusBadge(node.status)}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Region:</span>
                      <span className="font-medium">{node.region}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Host:</span>
                      <span className="font-mono text-xs">{node.host}:{node.port}</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MemoryStick className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">RAM: {node.usedRam}/{node.maxRam} GB</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(node.usedRam / node.maxRam) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Storage: {node.usedStorage}/{node.maxStorage} GB</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${(node.usedStorage / node.maxStorage) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Servers:</span>
                      <span className="font-medium">{node.serverCount}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Uptime:</span>
                      <span className="font-medium">{formatUptime(node.uptime)}</span>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingNode(node);
                          setFormData({
                            name: node.name,
                            host: node.host,
                            port: node.port,
                            region: node.region,
                            maxRam: node.maxRam,
                            maxStorage: node.maxStorage,
                            description: ''
                          });
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteNode(node.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {nodes.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Server className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No nodes configured</h3>
                <p className="text-gray-600 text-center mb-4">
                  Get started by adding your first hosting node to the platform.
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Node
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{nodes.length}</div>
                <p className="text-xs text-muted-foreground">
                  {nodes.filter(n => n.status === 'online').length} online
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total RAM</CardTitle>
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {nodes.reduce((acc, node) => acc + node.maxRam, 0)} GB
                </div>
                <p className="text-xs text-muted-foreground">
                  {nodes.reduce((acc, node) => acc + node.usedRam, 0)} GB used
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {nodes.reduce((acc, node) => acc + node.maxStorage, 0)} GB
                </div>
                <p className="text-xs text-muted-foreground">
                  {nodes.reduce((acc, node) => acc + node.usedStorage, 0)} GB used
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Servers</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {nodes.reduce((acc, node) => acc + node.serverCount, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all nodes
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Mode</CardTitle>
              <CardDescription>
                Manage node maintenance and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Maintenance mode features will be available in the next update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Node Dialog */}
      <Dialog open={!!editingNode} onOpenChange={() => setEditingNode(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Node</DialogTitle>
            <DialogDescription>
              Update node configuration
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateNode}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Node Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-region">Region</Label>
                  <Select value={formData.region} onValueChange={(value) => setFormData({ ...formData, region: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                      <SelectItem value="us-west-1">US West (N. California)</SelectItem>
                      <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                      <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-host">Host Address</Label>
                  <Input
                    id="edit-host"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-port">Port</Label>
                  <Input
                    id="edit-port"
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-maxRam">Max RAM (GB)</Label>
                  <Input
                    id="edit-maxRam"
                    type="number"
                    value={formData.maxRam}
                    onChange={(e) => setFormData({ ...formData, maxRam: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-maxStorage">Max Storage (GB)</Label>
                  <Input
                    id="edit-maxStorage"
                    type="number"
                    value={formData.maxStorage}
                    onChange={(e) => setFormData({ ...formData, maxStorage: parseInt(e.target.value) })}
                    min="10"
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingNode(null)}>
                Cancel
              </Button>
              <Button type="submit">Update Node</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NodesPage;