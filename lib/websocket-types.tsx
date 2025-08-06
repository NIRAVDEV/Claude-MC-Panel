// lib/websocket-types.ts
export interface WebSocketMessage {
  type: 
    // Incoming message types (from server)
    | 'error'
    | 'server_status' 
    | 'console_output'
    | 'notification'
    | 'authenticated'
    | 'subscribed'
    // Outgoing message types (to server)  
    | 'authenticate'
    | 'subscribe_server'
    | 'unsubscribe_server'
    | 'server_command'
    | 'ping'
    | 'pong'
  data?: any
  serverId?: string
  userId?: string
  timestamp?: string
  error?: string
  message?: string
  command?: string
}

// Separate types for better type safety
export interface IncomingWebSocketMessage extends WebSocketMessage {
  type: 'error' | 'server_status' | 'console_output' | 'notification' | 'authenticated' | 'subscribed'
  timestamp: string
}

export interface OutgoingWebSocketMessage extends Omit<WebSocketMessage, 'timestamp'> {
  type: 'authenticate' | 'subscribe_server' | 'unsubscribe_server' | 'server_command' | 'ping' | 'pong'
}

// Specific message interfaces for better type safety
export interface AuthenticateMessage extends OutgoingWebSocketMessage {
  type: 'authenticate'
  data: {
    userId: string
    token?: string
  }
}

export interface SubscribeServerMessage extends OutgoingWebSocketMessage {
  type: 'subscribe_server'
  serverId: string
}

export interface ServerCommandMessage extends OutgoingWebSocketMessage {
  type: 'server_command'
  serverId: string
  command: string
}

export interface ServerStatusMessage extends IncomingWebSocketMessage {
  type: 'server_status'
  serverId: string
  data: {
    status: string
    cpu?: number
    memory?: number
    players?: number
  }
}

export interface ConsoleOutputMessage extends IncomingWebSocketMessage {
  type: 'console_output'
  serverId: string
  data: {
    line: string
    level?: 'INFO' | 'WARN' | 'ERROR'
  }
}

export interface NotificationMessage extends IncomingWebSocketMessage {
  type: 'notification'
  data: {
    title: string
    message: string
    level: 'info' | 'warning' | 'error' | 'success'
  }
}