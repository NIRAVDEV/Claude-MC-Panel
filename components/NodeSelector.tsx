'use client'

import { useState, useEffect } from 'react'

interface Node {
  id: string
  name: string
  status: string
  url: string
  serverCount: number
  maxServers: number
}

interface NodeSelectorProps {
  selectedNodeId: string | null
  onNodeSelect: (nodeId: string | null) => void
  disabled?: boolean
}

export default function NodeSelector({ selectedNodeId, onNodeSelect, disabled }: NodeSelectorProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNodes()
  }, [])

  const fetchNodes = async () => {
    try {
      const response = await fetch('/api/nodes')
      if (response.ok) {
        const data = await response.json()
        setNodes(data.nodes || [])
      } else {
        setError('Failed to load nodes')
      }
    } catch (err) {
      setError('Network error loading nodes')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Node Selection
        </label>
        <div className="p-3 border border-gray-300 rounded-md">
          <div className="animate-pulse text-gray-500">Loading nodes...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Node Selection
        </label>
        <div className="p-3 border border-red-300 rounded-md bg-red-50">
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      </div>
    )
  }

  const activeNodes = nodes.filter(node => node.status === 'ACTIVE')

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Node Selection
      </label>
      
      <div className="space-y-2">
        {/* Auto-select option */}
        <label className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
          <input
            type="radio"
            name="nodeSelection"
            value=""
            checked={!selectedNodeId}
            onChange={() => onNodeSelect(null)}
            disabled={disabled}
            className="mr-3"
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900">Auto-select (Recommended)</div>
            <div className="text-sm text-gray-600">
              Automatically choose the best available node
            </div>
          </div>
        </label>

        {/* Specific node options */}
        {activeNodes.map((node) => (
          <label
            key={node.id}
            className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="radio"
              name="nodeSelection"
              value={node.id}
              checked={selectedNodeId === node.id}
              onChange={() => onNodeSelect(node.id)}
              disabled={disabled}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900">{node.name}</div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {node.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    {node.serverCount}/{node.maxServers || '∞'} servers
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {node.url}
              </div>
            </div>
          </label>
        ))}
      </div>

      {activeNodes.length === 0 && (
        <div className="p-3 border border-yellow-300 rounded-md bg-yellow-50">
          <div className="text-yellow-800 text-sm">
            ⚠️ No active nodes available. Please contact support.
          </div>
        </div>
      )}
    </div>
  )
}