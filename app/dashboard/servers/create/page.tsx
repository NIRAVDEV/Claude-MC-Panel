// app/dashboard/servers/create/page.tsx
'use client'

import { useState } from 'react'
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
  const { user: sessionUser } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    software: 'vanilla',
    maxRAM: '2GB',
    storage: '10GB',
    nodeId: 'cme2hzp880000626wm99cqqv2' // TODO: Replace with real node selection
  })

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
    const debugPayload = {
      ...formData,
      maxRAM: formData.maxRAM,
      storage: formData.storage,
  userEmail: sessionUser.email
    }
    console.log('[Server Create] Payload:', debugPayload)
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