// hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react'
import { 
  IncomingWebSocketMessage, 
  OutgoingWebSocketMessage,
  AuthenticateMessage,
  SubscribeServerMessage,
  ServerCommandMessage 
} from '@/lib/websocket-types'

interface UseWebSocketOptions {
  url?: string
  userId?: string
  autoConnect?: boolean
  reconnectAttempts?: number
  reconnectDelay?: number
}

interface UseWebSocketReturn {
  socket: WebSocket | null
  isConnected: boolean
  isAuthenticated: boolean
  error: string | null
  lastMessage: IncomingWebSocketMessage | null
  sendMessage: (message: OutgoingWebSocketMessage) => void
  authenticate: (userId: string) => void
  subscribeToServer: (serverId: string) => void
  unsubscribeFromServer: (serverId: string) => void
  sendServerCommand: (serverId: string, command: string) => void
  connect: () => void
  disconnect: () => void
  reconnect: () => void
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = '/api/ws',
    userId,
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000
  } = options

  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastMessage, setLastMessage] = useState<IncomingWebSocketMessage | null>(null)
  
  const reconnectCount = useRef(0)
  const reconnectTimer = useRef<NodeJS.Timeout>()
  const shouldReconnect = useRef(true)

  const getWebSocketUrl = () => {
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
      return url
    }
    
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000'
    return `${protocol}//${host}${url.startsWith('/') ? url : `/${url}`}`
  }

  const connect = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      return
    }

    try {
      const wsUrl = getWebSocketUrl()
      const newSocket = new WebSocket(wsUrl)

      newSocket.onopen = () => {
        console.log('WebSocket connected')
        setSocket(newSocket)
        setIsConnected(true)
        setError(null)
        reconnectCount.current = 0

        // Auto-authenticate if userId is provided
        if (userId) {
          authenticate(userId, newSocket)
        }
      }

      newSocket.onmessage = (event) => {
        try {
          const message: IncomingWebSocketMessage = JSON.parse(event.data)
          setLastMessage(message)

          // Handle authentication response
          if (message.type === 'authenticated') {
            setIsAuthenticated(true)
          }

          // Handle errors
          if (message.type === 'error') {
            setError(message.error || 'WebSocket error')
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
          setError('Failed to parse message')
        }
      }

      newSocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setSocket(null)
        setIsConnected(false)
        setIsAuthenticated(false)

        if (shouldReconnect.current && reconnectCount.current < reconnectAttempts) {
          scheduleReconnect()
        }
      }

      newSocket.onerror = (event) => {
        console.error('WebSocket error:', event)
        setError('Connection error')
      }

    } catch (err) {
      console.error('Error creating WebSocket:', err)
      setError('Failed to create connection')
      scheduleReconnect()
    }
  }

  const scheduleReconnect = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
    }

    const delay = reconnectDelay * Math.pow(2, reconnectCount.current)
    
    reconnectTimer.current = setTimeout(() => {
      reconnectCount.current++
      connect()
    }, delay)
  }

  const sendMessage = (message: OutgoingWebSocketMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message))
      } catch (err) {
        console.error('Error sending message:', err)
        setError('Failed to send message')
      }
    } else {
      console.warn('WebSocket not connected')
      setError('Not connected')
    }
  }

  const authenticate = (userId: string, targetSocket?: WebSocket) => {
    const message: AuthenticateMessage = {
      type: 'authenticate',
      data: { userId }
    }

    if (targetSocket) {
      targetSocket.send(JSON.stringify(message))
    } else {
      sendMessage(message)
    }
  }

  const subscribeToServer = (serverId: string) => {
    const message: SubscribeServerMessage = {
      type: 'subscribe_server',
      serverId
    }
    sendMessage(message)
  }

  const unsubscribeFromServer = (serverId: string) => {
    const message: OutgoingWebSocketMessage = {
      type: 'unsubscribe_server',
      serverId
    }
    sendMessage(message)
  }

  const sendServerCommand = (serverId: string, command: string) => {
    const message: ServerCommandMessage = {
      type: 'server_command',
      serverId,
      command
    }
    sendMessage(message)
  }

  const disconnect = () => {
    shouldReconnect.current = false
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
    }
    if (socket) {
      socket.close(1000, 'Manual disconnect')
    }
  }

  const reconnect = () => {
    shouldReconnect.current = true
    reconnectCount.current = 0
    disconnect()
    setTimeout(connect, 100)
  }

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      shouldReconnect.current = false
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
      }
      if (socket) {
        socket.close(1000, 'Component unmounting')
      }
    }
  }, [])

  // Re-authenticate when userId changes
  useEffect(() => {
    if (isConnected && userId && !isAuthenticated) {
      authenticate(userId)
    }
  }, [isConnected, userId])

  return {
    socket,
    isConnected,
    isAuthenticated,
    error,
    lastMessage,
    sendMessage,
    authenticate: (uid: string) => authenticate(uid),
    subscribeToServer,
    unsubscribeFromServer,
    sendServerCommand,
    connect,
    disconnect,
    reconnect
  }
}

// Specialized hook for server management
export function useServerWebSocket(serverId: string, userId?: string) {
  const ws = useWebSocket({ userId })
  const [serverStatus, setServerStatus] = useState<any>(null)
  const [consoleLines, setConsoleLines] = useState<string[]>([])

  useEffect(() => {
    if (!serverId || !ws.isAuthenticated) return

    // Subscribe to server
    ws.subscribeToServer(serverId)

    return () => {
      ws.unsubscribeFromServer(serverId)
    }
  }, [serverId, ws.isAuthenticated])

  // Handle incoming messages
  useEffect(() => {
    if (!ws.lastMessage || ws.lastMessage.serverId !== serverId) return

    const message = ws.lastMessage

    switch (message.type) {
      case 'server_status':
        setServerStatus(message.data)
        break
      case 'console_output':
        setConsoleLines(prev => [...prev, message.data.line].slice(-100)) // Keep last 100 lines
        break
    }
  }, [ws.lastMessage, serverId])

  return {
    ...ws,
    serverStatus,
    consoleLines,
    sendCommand: (command: string) => ws.sendServerCommand(serverId, command),
    clearConsole: () => setConsoleLines([])
  }
}