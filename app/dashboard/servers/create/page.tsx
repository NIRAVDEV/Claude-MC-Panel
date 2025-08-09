'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NodeSelector from '@/components/NodeSelector'

export default function CreateServerForm() {
  const [formData, setFormData] = useState({
    name: '',
    type: 'vanilla',
    memory: '1024',
    version: '1.20.1',
    description: ''
  })
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const requestBody = {
        ...formData,
        nodeId: selectedNodeId, // 🎯 Include selected nodeId
        memory: parseInt(formData.memory)
      }

      console.log('Creating server with data:', requestBody)

      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('Server created successfully:', data.server)
        router.push('/dashboard')
      } else {
        setError(data.error || 'Failed to create server')
        console.error('Server creation failed:', data)
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Create server error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Server</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Server Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Server Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="My Minecraft Server"
          />
        </div>

        {/* Server Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Server Type *
          </label>
          <select
            id="type"
            name="type"
            required
            value={formData.type}
            onChange={handleChange}
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="vanilla">Vanilla</option>
            <option value="spigot">Spigot</option>
            <option value="paper">Paper</option>
            <option value="purpur">Purpur</option>
            <option value="leaf">Leaf</option>
            <option value="forge">Forge</option>
            <option value="fabric">Fabric</option>
          </select>
        </div>

        {/* Memory */}
        <div>
          <label htmlFor="memory" className="block text-sm font-medium text-gray-700">
            Memory (MB) *
          </label>
          <select
            id="memory"
            name="memory"
            required
            value={formData.memory}
            onChange={handleChange}
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="512">512 MB</option>
            <option value="1024">1 GB</option>
            <option value="2048">2 GB</option>
            <option value="4096">4 GB</option>
            <option value="8192">8 GB</option>
          </select>
        </div>

        {/* Version */}
        <div>
          <label htmlFor="version" className="block text-sm font-medium text-gray-700">
            Minecraft Version
          </label>
          <input
            id="version"
            name="version"
            type="text"
            value={formData.version}
            onChange={handleChange}
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="1.20.1"
          />
        </div>

        {/* Node Selection - NEW */}
        <NodeSelector
          selectedNodeId={selectedNodeId}
          onNodeSelect={setSelectedNodeId}
          disabled={loading}
        />

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe your server..."
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Creating Server...' : 'Create Server'}
        </button>
      </form>
    </div>
  )
}