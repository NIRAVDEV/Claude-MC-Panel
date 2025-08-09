// components/ServerConsole.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { Terminal } from 'lucide-react'

interface ConsoleProps {
  serverId: string
  serverName: string
  nodeToken: string
  nodeUrl: string
}

export function ServerConsole({ serverId, serverName, nodeToken, nodeUrl }: ConsoleProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [command, setCommand] = useState('')
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    connectWebSocket()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const connectWebSocket = () => {
    const wsUrl = `ws://${nodeUrl}/ws/console`
    wsRef.current = new WebSocket(wsUrl)

    wsRef.current.onopen = () => {
      setConnected(true)
      // Send initial connection payload
      wsRef.current?.send(JSON.stringify({
        serverName,
        userEmail: 'user@example.com', // Get from auth
        nodeId: 'node-id', // Get from server data
        action: 'connect',
        token: nodeToken
      }))
    }

    wsRef.current.onmessage = (event) => {
      const logLine = event.data
      setLogs(prev => [...prev, logLine])
      
      // Auto-scroll to bottom
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight
      }
    }

    wsRef.current.onclose = () => {
      setConnected(false)
      setTimeout(connectWebSocket, 5000) // Reconnect
    }
  }

  const sendCommand = () => {
    if (wsRef.current && command.trim()) {
      wsRef.current.send(JSON.stringify({
        action: 'command',
        command: command.trim(),
        token: nodeToken
      }))
      setCommand('')
    }
  }

  return (
    <div className="bg-gray-900 text-green-400 font-mono text-sm">
      {/* Status Bar */}
      <div className="bg-gray-800 p-2 flex items-center gap-2">
        <Terminal className="w-4 h-4" />
        <span>Console: {serverName}</span>
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-xs">{connected ? 'Connected' : 'Disconnected'}</span>
      </div>

      {/* Console Logs */}
      <div 
        ref={terminalRef}
        className="h-96 p-4 overflow-y-auto bg-black"
      >
        {logs.map((log, index) => (
          <div key={index} className="whitespace-pre-wrap">
            {log}
          </div>
        ))}
      </div>

      {/* Command Input */}
      <div className="bg-gray-800 p-2 flex gap-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendCommand()}
          placeholder="Enter server command..."
          className="flex-1 bg-gray-700 text-white px-3 py-1 rounded"
          disabled={!connected}
        />
        <button
          onClick={sendCommand}
          disabled={!connected || !command.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-1 rounded"
        >
          Send
        </button>
      </div>
    </div>
  )
}
