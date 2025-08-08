// app/dashboard/servers/create/page.tsx
'use client'

import { useState, useEffect } from 'react'
// Switched from next-auth to internal auth context (Lucia)
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from '@/components/ui/use-toast'

export default function CreateServerPage() {
  const PREFERRED_NODE_ID = 'cme32gymz0000657n282dau6u'
  const { user: sessionUser } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  interface NodeOption {
    id: string
    name: string
    status?: string
    ip?: string
  }
  const [nodes, setNodes] = useState<NodeOption[]>([])
  const [nodesLoading, setNodesLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    software: 'vanilla',
    maxRAM: '2GB',
    storage: '10GB',
    nodeId: PREFERRED_NODE_ID // initial preferred; will validate after fetch
  })

  // Fetch available nodes (admin route) and set default node
  useEffect(() => {
    async function loadNodes() {
      if (!sessionUser) return
      try {
        const res = await fetch('/api/admin/nodes?debug=1', { credentials: 'include' })
        if (!res.ok) {
          console.warn('[Server Create] Failed to fetch nodes', res.status)
          setNodes([])
          return
        }
        const data = await res.json()
        const mapped = Array.isArray(data) ? data.map((n: any) => ({ id: n.id, name: n.name, status: n.status, ip: n.ip })) : []
        setNodes(mapped)
        // Auto-select desired node if exists, else first online, else first
  const preferred = mapped.find(n => n.id === PREFERRED_NODE_ID)
        const online = mapped.find(n => (n.status || '').toUpperCase() === 'ONLINE')
  const first = mapped[0]
  const chosen = preferred?.id || online?.id || first?.id || ''
  setFormData(prev => ({ ...prev, nodeId: chosen }))
  console.log('[Server Create] Loaded nodes:', mapped, 'Chosen nodeId:', chosen, 'Preferred exists:', !!preferred)

        // Debugging logs to verify preferred node existence
        console.log('[Server Create] Preferred Node ID:', PREFERRED_NODE_ID);
        console.log('[Server Create] Fetched Nodes:', mapped);
        console.log('[Server Create] Preferred Node Exists:', !!preferred);
      } catch (e) {
        console.error('[Server Create] Error fetching nodes', e)
        setNodes([])
      } finally {
        setNodesLoading(false)
      }
    }
    loadNodes()
  }, [sessionUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
  if (!sessionUser?.email) return

    // Debug: check required fields and log payload
  const requiredFields = ['name', 'software', 'maxRAM', 'storage', 'nodeId']
    let missingFields: string[] = []
    for (const field of requiredFields) {
      const value = (formData as any)[field]
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(field)
      }
    }
    // Send maxRAM and storage as strings with 'GB' suffix (e.g., '2GB')
    // Enforce preferred node if it exists in list
    const preferredExists = nodes.some(n => n.id === PREFERRED_NODE_ID)
    const effectiveNodeId = preferredExists ? PREFERRED_NODE_ID : formData.nodeId
    if (preferredExists && formData.nodeId !== PREFERRED_NODE_ID) {
      console.warn('[Server Create] Overriding selected nodeId with preferred:', PREFERRED_NODE_ID)
    }
    const debugPayload = {
      ...formData,
      nodeId: "cme32gymz0000657n282dau6u", // use computed effective node id (preferred override or user selection)
      maxRAM: formData.maxRAM,
      storage: formData.storage,
    }
    console.log('[Server Create] Payload:', debugPayload, 'Selected form nodeId:', formData.nodeId, 'Effective nodeId:', effectiveNodeId)
    if (missingFields.length > 0) {
      console.warn('[Server Create] Missing/Invalid fields:', missingFields)
    }
    toast({
      title: 'Debug Server Payload',
      description:
        'Payload: ' + JSON.stringify(debugPayload, null, 2) +
        (missingFields.length > 0 ? '\nMissing/Invalid: ' + missingFields.join(', ') : ''),
      variant: missingFields.length > 0 ? 'destructive' : 'default',
    })
    if (missingFields.length > 0) {
      return
    }

    setIsLoading(true)
    try {
      console.log('[Server Create] Sending request to /api/servers/create...')
      const response = await fetch('/api/servers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(debugPayload)
      })
      console.log('[Server Create] Response status:', response.status)
      let responseBody
      let rawText = ''
      try {
        responseBody = await response.clone().json()
        console.log('[Server Create] Response body (JSON):', responseBody)
      } catch (jsonErr) {
        try {
          rawText = await response.clone().text()
          console.warn('[Server Create] Response body (raw text):', rawText)
        } catch (textErr) {
          console.warn('[Server Create] Could not parse response as JSON or text:', jsonErr, textErr)
        }
        responseBody = null
      }

      if (response.ok) {
        router.push('/dashboard')
      } else {
        console.error('Failed to create server', response.status, responseBody || rawText)
      }
    } catch (error) {
      console.error('Error creating server:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getCreditCost = () => {
  const ramCost = parseInt(formData.maxRAM) * 25
  const storageCost = parseInt(formData.storage) * 2
  return ramCost + storageCost
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
        <h1 className="text-3xl font-bold">Create New Server</h1>
        <p className="text-muted-foreground">Set up your Minecraft server</p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Server Configuration</CardTitle>
            <CardDescription>
              Configure your server settings. Monthly cost: {getCreditCost()} credits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Server Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Awesome Server"
                  required
                />
              </div>

              <div>
                <Label htmlFor="software">Server Software</Label>
                <Select value={formData.software} onValueChange={(value) => setFormData({ ...formData, software: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vanilla">Vanilla</SelectItem>
                    <SelectItem value="paper">Paper</SelectItem>
                    <SelectItem value="purpur">Purpur</SelectItem>
                    <SelectItem value="leaf">Leaf</SelectItem>
                    <SelectItem value="spigot">Spigot</SelectItem>
                    <SelectItem value="forge">Forge</SelectItem>
                    <SelectItem value="fabric">Fabric</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="maxRAM">RAM</Label>
                <Select value={formData.maxRAM} onValueChange={(value) => setFormData({ ...formData, maxRAM: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2GB">2GB (50 credits/month)</SelectItem>
                    <SelectItem value="4GB">4GB (100 credits/month)</SelectItem>
                    <SelectItem value="6GB">6GB (150 credits/month)</SelectItem>
                    <SelectItem value="8GB">8GB (200 credits/month)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="storage">Storage</Label>
                <Select value={formData.storage} onValueChange={(value) => setFormData({ ...formData, storage: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10GB">10GB (20 credits/month)</SelectItem>
                    <SelectItem value="25GB">25GB (50 credits/month)</SelectItem>
                    <SelectItem value="50GB">50GB (100 credits/month)</SelectItem>
                    <SelectItem value="100GB">100GB (200 credits/month)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="nodeId">Node</Label>
                <Select value={formData.nodeId} onValueChange={(value) => setFormData({ ...formData, nodeId: value })} disabled={nodesLoading || nodes.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={nodesLoading ? 'Loading nodes...' : nodes.length ? 'Select node' : 'No nodes available'} />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.map(n => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.name} ({(n.status || 'UNKNOWN').toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.nodeId && formData.nodeId !== PREFERRED_NODE_ID && (
                  <p className="text-xs text-muted-foreground mt-1">Selected node differs from preferred {PREFERRED_NODE_ID}</p>
                )}
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Monthly Cost Breakdown</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>RAM ({formData.maxRAM})</span>
                    <span>{parseInt(formData.maxRAM) * 25} credits</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage ({formData.storage})</span>
                    <span>{parseInt(formData.storage) * 2} credits</span>
                  </div>
                  <div className="border-t pt-1 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{getCreditCost()} credits/month</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating Server...' : 'Create Server'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}