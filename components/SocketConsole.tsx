'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Terminal, Send, Power, RotateCcw, Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { io, Socket } from 'socket.io-client'

interface ConsoleProps {
  serverId: string
  serverName: string
  userId: string
  nodeId: string
}

interface LogEntry {
  id: string
  timestamp: string
  content: string
  type: 'log' | 'command' | 'system' | 'error'
  userId?: string
}

export function SocketConsole({ serverId, serverName, userId, nodeId }: ConsoleProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [command, setCommand] = useState('')
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [serverStatus, setServerStatus] = useState<string>('unknown')
  const [error, setError] = useState<string | null>(null)
  
  const terminalRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const commandHistoryRef = useRef<string[]>([])
  const historyIndexRef = useRef<number>(-1)

  const addLog = useCallback((content: string, type: LogEntry['type'] = 'log', userId?: string) => {
    const newLog: LogEntry = {
      id: Date.now() + Math.random().toString(),
      timestamp: new Date().toISOString(),
      content,
      type,
      userId
    }
    setLogs(prev => [...prev.slice(-500), newLog]) // Keep last 500 logs
  }, [])

  const connectSocket = useCallback(() => {
    if (socket?.connected) return

    setConnecting(true)
    setError(null)

    const newSocket = io({
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    })

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('🔌 Socket connected:', newSocket.id)
      setConnected(true)
      setConnecting(false)
      setError(null)

      // Join console room
      newSocket.emit('console:join', {
        serverId,
        userId,
        token: 'your-auth-token' // Get from your auth context
      })
    })

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason)
      setConnected(false)
      addLog(`🔌 Disconnected: ${reason}`, 'system')

      // Auto-reconnect logic
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return
      }

      // Client-side disconnect or network issue, attempt reconnect
      reconnectTimeoutRef.current = setTimeout(() => {
        addLog('🔄 Attempting to reconnect...', 'system')
        connectSocket()
      }, 3000)
    })

    // Console event handlers
    newSocket.on('console:connected', (data) => {
      console.log('🎮 Console connected:', data)
      addLog(`✅ Connected to ${data.serverName} console`, 'system')
    })

    newSocket.on('console:message', (data) => {
      addLog(data.content, data.type, data.userId)
    })

    newSocket.on('console:status', (data) => {
      setServerStatus(data.status)
      addLog(`📊 Server status: ${data.status.toUpperCase()}`, 'system')
    })

    newSocket.on('console:command-sent', (data) => {
      // Command acknowledged
    })

    newSocket.on('console:error', (data) => {
      console.error('❌ Console error:', data)
      addLog(`❌ ${data.message}`, 'error')
      setError(data.message)
    })

    // Connection error handlers
    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error)
      setConnecting(false)
      setError('Failed to connect to server')
      addLog(`❌ Connection error: ${error.message}`, 'error')
    })

    setSocket(newSocket)
  }, [serverId, userId, addLog])

  const disconnectSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (socket) {
      socket.disconnect()
      setSocket(null)
    }
    
    setConnected(false)
    setConnecting(false)
  }, [socket])

  const sendCommand = useCallback(() => {
    if (!socket || !connected || !command.trim()) return

    const cmd = command.trim()
    
    // Add to command history
    commandHistoryRef.current = [cmd, ...commandHistoryRef.current.slice(0, 19)] // Keep last 20 commands
    historyIndexRef.current = -1

    socket.emit('console:command', {
      command: cmd,
      serverId
    })

    setCommand('')
  }, [socket, connected, command, serverId])

  const sendServerControl = useCallback((action: 'start' | 'stop' | 'restart') => {
    if (!socket || !connected) return

    socket.emit('server:control', {
      action,
      serverId
    })
  }, [socket, connected, serverId])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendCommand()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const history = commandHistoryRef.current
      if (history.length > 0) {
        const newIndex = Math.min(historyIndexRef.current + 1, history.length - 1)
        historyIndexRef.current = newIndex
        setCommand(history[newIndex] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const history = commandHistoryRef.current
      if (historyIndexRef.current >= 0) {
        const newIndex = historyIndexRef.current - 1
        historyIndexRef.current = newIndex
        setCommand(newIndex >= 0 ? history[newIndex] : '')
      }
    }
  }, [sendCommand])

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
    // Initialize socket endpoint
    fetch('/api/socket').then(() => {
      connectSocket()
    })

    return () => {
      disconnectSocket()
    }
  }, [connectSocket, disconnectSocket])

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
      case 'error': return 'text-red-400'
      case 'log': default: return 'text-green-400'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="bg-gray-900 text-white font-mono text-sm rounded-lg overflow-hidden shadow-xl">
      {/* Status Bar */}
      <div className="bg-gray-800 p-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-green-400" />
          <span className="font-semibold">{serverName} Console</span>
          
          <div className="flex items-center gap-2">
            {connecting ? (
              <>
                <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-yellow-500">Connecting...</span>
              </>
            ) : connected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-500">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-500">Disconnected</span>
              </>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-1 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">{error}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Status:</span>
          <span className={`text-xs font-semibold ${getStatusColor(serverStatus)}`}>
            {serverStatus.toUpperCase()}
          </span>
          
          {/* Server Control Buttons */}
          <div className="flex gap-1 ml-4">
            <button
              onClick={() => sendServerControl('start')}
              disabled={!connected || serverStatus === 'running'}
              className="p-1 text-green-500 hover:bg-gray-700 rounded disabled:text-gray-600 disabled:cursor-not-allowed"
              title="Start Server"
            >
              <Power className="w-4 h-4" />
            </button>
            <button
              onClick={() => sendServerControl('stop')}
              disabled={!connected || serverStatus === 'stopped'}
              className="p-1 text-red-500 hover:bg-gray-700 rounded disabled:text-gray-600 disabled:cursor-not-allowed"
              title="Stop Server"
            >
              <Power className="w-4 h-4 rotate-180" />
            </button>
            <button
              onClick={() => sendServerControl('restart')}
              disabled={!connected}
              className="p-1 text-yellow-500 hover:bg-gray-700 rounded disabled:text-gray-600 disabled:cursor-not-allowed"
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
            <button
              onClick={connected ? disconnectSocket : connectSocket}
              disabled={connecting}
              className="p-1 text-blue-400 hover:bg-gray-700 rounded disabled:text-gray-600"
              title={connected ? "Disconnect" : "Reconnect"}
            >
              {connected ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
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
            <p>Console ready. {connected ? 'Waiting for server logs...' : 'Connect to view logs.'}</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-2 mb-1">
              <span className="text-gray-500 text-xs shrink-0 w-20">
                {formatTimestamp(log.timestamp)}
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
          onKeyDown={handleKeyPress}
          placeholder={connected ? "Enter server command... (↑/↓ for history)" : "Not connected"}
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