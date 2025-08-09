'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Terminal, Send, Power, RotateCcw, Wifi, WifiOff } from 'lucide-react'

interface ConsoleProps {
  serverId: string
  serverName: string
  userEmail: string
  nodeId: string
  nodeIp: string
  nodePort: number
  nodeToken: string
}

interface LogEntry {
  timestamp: string
  content: string
  type: 'log' | 'command' | 'system'
}

export function ServerConsole({ 
  serverId, 
  serverName, 
  userEmail, 
  nodeId, 
  nodeIp, 
  nodePort, 
  nodeToken 
}: ConsoleProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [command, setCommand] = useState('')
  const [connected, setConnected] = useState(false)
  const [serverStatus, setServerStatus] = useState('unknown')
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  
  const wsRef = useRef<WebSocket | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const maxReconnectAttempts = 5

  const addLog = useCallback((content: string, type: 'log' | 'command' | 'system' = 'log') => {
    const newLog: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      content,
      type
    }
    setLogs(prev => [...prev.slice(-500), newLog]) // Keep last 500 logs
  }, [])

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return // Already connected
    }

    // Connect to local WebSocket bridge instead of directly to Wings
    const bridgeUrl = process.env.NODE_ENV === 'development' 
      ? 'ws://localhost:8080/ws/console'  // Local development
      : 'wss://your-bridge-domain.com:8444/ws/console' // Production bridge
      
    addLog(`🌉 Connecting to bridge: ${bridgeUrl}...`, 'system')
    
    wsRef.current = new WebSocket(bridgeUrl)

    wsRef.current.onopen = () => {
      setConnected(true)
      setReconnectAttempts(0)
      addLog('🌉 Connected to WebSocket bridge', 'system')
      
      // Send initial connection payload (bridge will forward to Wings)
      const initPayload = {
        serverName,
        userEmail,
        nodeId,
        action: 'connect',
        token: nodeToken
      }
      
      wsRef.current?.send(JSON.stringify(initPayload))
    }

    wsRef.current.onmessage = (event) => {
      try {
        // Try to parse as JSON first (for bridge/system messages)
        const data = JSON.parse(event.data)
        
        if (data.type === 'bridge_connected') {
          addLog('🌉 ' + data.message, 'system')
          return
        }
        if (data.type === 'wings_connected') {
          addLog('✅ ' + data.message, 'system')
          return
        }
        if (data.type === 'wings_disconnected') {
          addLog('⚠️ ' + data.message, 'system')
          return
        }
        if (data.type === 'wings_error') {
          addLog('❌ ' + data.message, 'system')
          return
        }
        if (data.type === 'status') {
          setServerStatus(data.status)
          return
        }
        if (data.type === 'system') {
          addLog(data.message, 'system')
          return
        }
        if (data.type === 'error') {
          addLog(data.message, 'system')
          return
        }
      } catch {
        // Not JSON, treat as regular log content from Wings
      }
      
      // Regular log content from Wings (forwarded through bridge)
      addLog(event.data, 'log')
    }

    wsRef.current.onclose = (event) => {
      setConnected(false)
      
      if (event.wasClean) {
        addLog('🔌 Console disconnected', 'system')
      } else {
        addLog(`❌ Connection lost (${event.code}: ${event.reason})`, 'system')
        
        // Auto-reconnect logic
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000) // Exponential backoff
          addLog(`🔄 Reconnecting in ${delay/1000}s... (${reconnectAttempts + 1}/${maxReconnectAttempts})`, 'system')
          
          setTimeout(() => {
            setReconnectAttempts(prev => prev + 1)
            connectWebSocket()
          }, delay)
        } else {
          addLog('❌ Max reconnection attempts reached', 'system')
        }
      }
    }

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error)
      addLog('❌ WebSocket connection error', 'system')
    }
  }, [nodeIp, nodePort, serverName, userEmail, nodeId, nodeToken, reconnectAttempts, addLog])

  const sendCommand = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog('❌ Not connected to server', 'system')
      return
    }

    if (!command.trim()) return

    const commandPayload = {
      action: 'command',
      command: command.trim(),
      token: nodeToken
    }

    addLog(`> ${command.trim()}`, 'command')
    wsRef.current.send(JSON.stringify(commandPayload))
    setCommand('')
  }, [command, nodeToken, addLog])

  const sendServerAction = useCallback(async (action: 'start' | 'stop' | 'restart') => {
    try {
      addLog(`🎮 Sending ${action} command...`, 'system')
      const response = await fetch(`/api/servers/${serverId}/${action}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        addLog(`✅ ${action.charAt(0).toUpperCase() + action.slice(1)} command sent successfully`, 'system')
      } else {
        const error = await response.text()
        addLog(`❌ Failed to ${action} server: ${error}`, 'system')
      }
    } catch (error) {
      addLog(`❌ Error sending ${action} command: ${error}`, 'system')
    }
  }, [serverId, addLog])

  const clearLogs = useCallback(() => {
    setLogs([])
    addLog('🧹 Console cleared', 'system')
  }, [addLog])

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  // Connect on mount
  useEffect(() => {
    connectWebSocket()
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted')
      }
    }
  }, [connectWebSocket])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running': return 'text-green-500'
      case 'stopped': return 'text-red-500'
      case 'starting': return 'text-yellow-500'
      case 'stopping': return 'text-orange-500'
      default: return 'text-gray-500'
    }
  }

  const getLogEntryClass = (type: LogEntry['type']) => {
    switch (type) {
      case 'command': return 'text-blue-400 font-semibold'
      case 'system': return 'text-yellow-400'
      case 'log': default: return 'text-green-400'
    }
  }

  return (
    <div className="bg-gray-900 text-white font-mono text-sm rounded-lg overflow-hidden shadow-xl">
      {/* Status Bar */}
      <div className="bg-gray-800 p-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-green-400" />
          <span className="font-semibold">{serverName} Console</span>
          <div className="flex items-center gap-2">
            {connected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-xs ${connected ? 'text-green-500' : 'text-red-500'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Status:</span>
          <span className={`text-xs font-semibold ${getStatusColor(serverStatus)}`}>
            {serverStatus.toUpperCase()}
          </span>
          
          {/* Server Control Buttons */}
          <div className="flex gap-1 ml-4">
            <button
              onClick={() => sendServerAction('start')}
              disabled={serverStatus === 'running'}
              className="p-1 text-green-500 hover:bg-gray-700 rounded disabled:text-gray-600 disabled:cursor-not-allowed"
              title="Start Server"
            >
              <Power className="w-4 h-4" />
            </button>
            <button
              onClick={() => sendServerAction('stop')}
              disabled={serverStatus === 'stopped'}
              className="p-1 text-red-500 hover:bg-gray-700 rounded disabled:text-gray-600 disabled:cursor-not-allowed"
              title="Stop Server"
            >
              <Power className="w-4 h-4 rotate-180" />
            </button>
            <button
              onClick={() => sendServerAction('restart')}
              className="p-1 text-yellow-500 hover:bg-gray-700 rounded"
              title="Restart Server"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={clearLogs}
              className="p-1 text-gray-400 hover:bg-gray-700 rounded ml-2"
              title="Clear Console"
            >
              🧹
            </button>
          </div>
        </div>
      </div>

      {/* Console Logs */}
      <div 
        ref={terminalRef}
        className="h-96 p-4 overflow-y-auto bg-black scrollbar-thin scrollbar-thumb-gray-600"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Console ready. Waiting for server logs...</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex gap-2 mb-1">
              <span className="text-gray-500 text-xs shrink-0 w-20">
                {log.timestamp}
              </span>
              <span className={`whitespace-pre-wrap break-all ${getLogEntryClass(log.type)}`}>
                {log.content}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Command Input */}
      <div className="bg-gray-800 p-3 flex gap-2 border-t border-gray-700">
        <span className="text-gray-400 flex items-center">$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              sendCommand()
            }
          }}
          placeholder={connected ? "Enter server command..." : "Not connected"}
          className="flex-1 bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-800 disabled:text-gray-500"
          disabled={!connected}
        />
        <button
          onClick={sendCommand}
          disabled={!connected || !command.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </div>
    </div>
  )
}