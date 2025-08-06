// lib/websocket-client.tsx
'use client'
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { 
  WebSocketMessage, 
  IncomingWebSocketMessage, 
  OutgoingWebSocketMessage,
  AuthenticateMessage,
  SubscribeServerMessage, 
  ServerCommandMessage 
} from './websocket-types'

interface WebSocketContextType {
  isConnected: boolean
  isAuthenticated: boolean
  subscribe: (serverId: string) => void
  unsubscribe: (serverId: string) => void
  sendCommand: (serverId: string, command: string) => void
  addMessageListener: (callback: (message: IncomingWebSocketMessage) => void) => () => void
  reconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

interface WebSocketProviderProps {
  children: ReactNode
  userId?: string
}

export function WebSocketProvider({ children, userId }: WebSocketProviderProps) {
  const ws = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const messageListeners = useRef<Set<(message: IncomingWebSocketMessage) => void>>(new Set())
  const reconnectTimer = useRef<NodeJS.Timeout>()
  
  const maxReconnectAttempts = 5
  const reconnectDelay = 1000

  const connect = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/ws`
      
      ws.current = new WebSocket(wsUrl)
      
      ws.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setReconnectAttempts(0)
        
        // Authenticate if userId is available
        if (userId) {
          authenticate(userId)
        }
      }
      
      ws.current.onmessage = (event) => {
        try {
          const message: IncomingWebSocketMessage = JSON.parse(event.data)
          
          // Handle authentication response
          if (message.type === 'authenticated') {
            setIsAuthenticated(true)
            console.log('WebSocket authenticated')
          }
          
          // Notify all listeners
          messageListeners.current.forEach(listener => {
            try {
              listener(message)
            } catch (error) {
              console.error('Error in message listener:', error)
            }
          })
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
      
      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        setIsAuthenticated(false)
        
        // Only attempt reconnection if it wasn't a manual close
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect()
        }
      }
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      scheduleReconnect()
    }
  }

  const scheduleReconnect = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
    }
    
    const delay = reconnectDelay * Math.pow(2, reconnectAttempts) // Exponential backoff
    
    reconnectTimer.current = setTimeout(() => {
      console.log(`Attempting to reconnect... (${reconnectAttempts + 1}/${maxReconnectAttempts})`)
      setReconnectAttempts(prev => prev + 1)
      connect()
    }, delay)
  }

  const sendMessage = (message: OutgoingWebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify(message))
      } catch (error) {
        console.error('Error sending WebSocket message:', error)
      }
    } else {
      console.warn('WebSocket not connected, message not sent:', message)
    }
  }

  const authenticate = (userId: string) => {
    const message: AuthenticateMessage = {
      type: 'authenticate',
      data: {
        userId
      }
    }
    sendMessage(message)
  }

  const subscribe = (serverId: string) => {
    const message: SubscribeServerMessage = {
      type: 'subscribe_server',
      serverId
    }
    sendMessage(message)
  }

  const unsubscribe = (serverId: string) => {
    const message: OutgoingWebSocketMessage = {
      type: 'unsubscribe_server',
      serverId
    }
    sendMessage(message)
  }

  const sendCommand = (serverId: string, command: string) => {
    const message: ServerCommandMessage = {
      type: 'server_command',
      serverId,
      command
    }
    sendMessage(message)
  }

  const addMessageListener = (callback: (message: IncomingWebSocketMessage) => void) => {
    messageListeners.current.add(callback)
    
    // Return cleanup function
    return () => {
      messageListeners.current.delete(callback)
    }
  }

  const reconnect = () => {
    if (ws.current) {
      ws.current.close()
    }
    setReconnectAttempts(0)
    connect()
  }

  // Connect on mount
  useEffect(() => {
    connect()
    
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
      }
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting')
      }
    }
  }, [])

  // Re-authenticate when userId changes
  useEffect(() => {
    if (isConnected && userId && !isAuthenticated) {
      authenticate(userId)
    }
  }, [isConnected, userId, isAuthenticated])

  const contextValue: WebSocketContextType = {
    isConnected,
    isAuthenticated,
    subscribe,
    unsubscribe,
    sendCommand,
    addMessageListener,
    reconnect
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket(): WebSocketContextType {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

// Hook for server-specific WebSocket functionality
export function useServerWebSocket(serverId?: string) {
  const ws = useWebSocket()
  const [serverStatus, setServerStatus] = useState<any>(null)
  const [consoleOutput, setConsoleOutput] = useState<string[]>([])

  useEffect(() => {
    if (!serverId || !ws.isAuthenticated) return

    // Subscribe to server events
    ws.subscribe(serverId)

    // Set up message listener
    const cleanup = ws.addMessageListener((message) => {
      if (message.serverId !== serverId) return

      switch (message.type) {
        case 'server_status':
          setServerStatus(message.data)
          break
        case 'console_output':
          setConsoleOutput(prev => [...prev, message.data.line].slice(-100)) // Keep last 100 lines
          break
      }
    })

    // Cleanup on unmount or serverId change
    return () => {
      ws.unsubscribe(serverId)
      cleanup()
    }
  }, [serverId, ws.isAuthenticated])

  return {
    serverStatus,
    consoleOutput,
    sendCommand: (command: string) => {
      if (serverId) {
        ws.sendCommand(serverId, command)
      }
    },
    clearConsole: () => setConsoleOutput([])
  }
}