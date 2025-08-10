import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { prisma } from '@/lib/prisma'

interface ServerSocket extends Socket {
  userId?: string
  serverId?: string
  nodeInfo?: {
    id: string
    ip: string
    port: number
    token: string
  }
}

interface ConsoleMessage {
  serverId: string
  command?: string
  type: 'command' | 'log' | 'system' | 'status'
  data: any
  timestamp: string
  userId: string
}

class SocketManager {
  private io: SocketIOServer
  private consoleRooms: Map<string, Set<string>> = new Map() // serverId -> Set<socketId>
  private serverProcesses: Map<string, any> = new Map() // serverId -> process info

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: ServerSocket) => {
      console.log(`🔌 New socket connection: ${socket.id}`)

      // Handle console connection
      socket.on('console:join', async (data) => {
        await this.handleConsoleJoin(socket, data)
      })

      // Handle command execution
      socket.on('console:command', async (data) => {
        await this.handleCommand(socket, data)
      })

      // Handle server control
      socket.on('server:control', async (data) => {
        await this.handleServerControl(socket, data)
      })

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket)
      })

      // Handle errors
      socket.on('error', (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error)
        socket.emit('console:error', { message: 'Connection error occurred' })
      })
    })
  }

  private async handleConsoleJoin(socket: ServerSocket, data: {
    serverId: string
    userId: string
    token: string
  }) {
    try {
      // Verify user access to server
      const server = await prisma.server.findFirst({
        where: {
          id: data.serverId,
          userId: data.userId
        },
        include: { node: true }
      })

      if (!server || !server.node) {
        socket.emit('console:error', { message: 'Server not found or no node assigned' })
        return
      }

      // Set socket properties
      socket.userId = data.userId
      socket.serverId = data.serverId
      socket.nodeInfo = {
        id: server.node.id,
        ip: server.node.ip,
        port: server.node.port,
        token: server.node.verificationToken
      }

      // Join console room
      const roomName = `console:${data.serverId}`
      socket.join(roomName)

      // Track connection
      if (!this.consoleRooms.has(data.serverId)) {
        this.consoleRooms.set(data.serverId, new Set())
      }
      this.consoleRooms.get(data.serverId)!.add(socket.id)

      console.log(`🎮 User ${data.userId} joined console for server ${data.serverId}`)

      // Send connection success
      socket.emit('console:connected', {
        serverId: data.serverId,
        serverName: server.name,
        nodeId: server.node.id,
        message: `Connected to ${server.name} console`
      })

      // Start streaming server logs
      await this.startLogStreaming(data.serverId, server, socket.nodeInfo)

      // Get current server status
      await this.updateServerStatus(data.serverId, socket.nodeInfo)

    } catch (error) {
      console.error('❌ Console join error:', error)
      socket.emit('console:error', { message: 'Failed to join console' })
    }
  }

  private async handleCommand(socket: ServerSocket, data: {
    command: string
    serverId: string
  }) {
    if (!socket.userId || !socket.nodeInfo || socket.serverId !== data.serverId) {
      socket.emit('console:error', { message: 'Unauthorized or invalid session' })
      return
    }

    try {
      console.log(`🎯 Executing command "${data.command}" on server ${data.serverId}`)

      // Broadcast command to room (for history)
      this.io.to(`console:${data.serverId}`).emit('console:message', {
        type: 'command',
        content: `> ${data.command}`,
        timestamp: new Date().toISOString(),
        userId: socket.userId
      })

      // Execute command via Wings agent
      const result = await this.executeServerCommand(data.serverId, data.command, socket.nodeInfo)

      if (result.success) {
        // Command output will come through log streaming
        socket.emit('console:command-sent', { message: 'Command executed' })
      } else {
        socket.emit('console:error', { message: result.error })
      }

    } catch (error) {
      console.error('❌ Command execution error:', error)
      socket.emit('console:error', { message: 'Failed to execute command' })
    }
  }

  private async handleServerControl(socket: ServerSocket, data: {
    action: 'start' | 'stop' | 'restart'
    serverId: string
  }) {
    if (!socket.userId || !socket.nodeInfo || socket.serverId !== data.serverId) {
      socket.emit('console:error', { message: 'Unauthorized' })
      return
    }

    try {
      console.log(`🎮 ${data.action} server ${data.serverId}`)

      // Broadcast system message
      this.io.to(`console:${data.serverId}`).emit('console:message', {
        type: 'system',
        content: `🎮 ${data.action.charAt(0).toUpperCase() + data.action.slice(1)} command initiated...`,
        timestamp: new Date().toISOString()
      })

      // Execute server control via Wings
      const result = await this.executeServerControl(data.serverId, data.action, socket.nodeInfo)

      if (result.success) {
        this.io.to(`console:${data.serverId}`).emit('console:message', {
          type: 'system',
          content: `✅ ${data.action.charAt(0).toUpperCase() + data.action.slice(1)} command executed successfully`,
          timestamp: new Date().toISOString()
        })

        // Update status after delay
        setTimeout(() => {
          this.updateServerStatus(data.serverId, socket.nodeInfo!)
        }, 2000)
      } else {
        this.io.to(`console:${data.serverId}`).emit('console:message', {
          type: 'system',
          content: `❌ Failed to ${data.action}: ${result.error}`,
          timestamp: new Date().toISOString()
        })
      }

    } catch (error) {
      console.error(`❌ Server control error:`, error)
      socket.emit('console:error', { message: `Failed to ${data.action} server` })
    }
  }

  private handleDisconnect(socket: ServerSocket) {
    console.log(`🔌 Socket disconnected: ${socket.id}`)

    if (socket.serverId) {
      const room = this.consoleRooms.get(socket.serverId)
      if (room) {
        room.delete(socket.id)
        if (room.size === 0) {
          // No more connections, stop log streaming
          this.stopLogStreaming(socket.serverId)
          this.consoleRooms.delete(socket.serverId)
        }
      }
    }
  }

  private async startLogStreaming(serverId: string, server: any, nodeInfo: any) {
    try {
      // Check if already streaming
      if (this.serverProcesses.has(serverId)) {
        return
      }

      const response = await fetch(`http://${nodeInfo.ip}:${nodeInfo.port}/console/start-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nodeInfo.token}`
        },
        body: JSON.stringify({
          serverId,
          serverName: server.name,
          containerId: this.buildContainerId(server.name, server.userId, nodeInfo.id)
        })
      })

      if (response.ok) {
        // Set up log polling or streaming
        this.setupLogPolling(serverId, nodeInfo)
      }

    } catch (error) {
      console.error('❌ Failed to start log streaming:', error)
    }
  }

  private setupLogPolling(serverId: string, nodeInfo: any) {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://${nodeInfo.ip}:${nodeInfo.port}/console/logs`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${nodeInfo.token}`,
            'Server-Id': serverId
          }
        })

        if (response.ok) {
          const logs = await response.json()
          
          logs.forEach((log: any) => {
            this.io.to(`console:${serverId}`).emit('console:message', {
              type: 'log',
              content: log.content,
              timestamp: log.timestamp
            })
          })
        }
      } catch (error) {
        console.error('❌ Log polling error:', error)
      }
    }, 1000) // Poll every second

    this.serverProcesses.set(serverId, { type: 'polling', interval })
  }

  private stopLogStreaming(serverId: string) {
    const process = this.serverProcesses.get(serverId)
    if (process) {
      if (process.interval) {
        clearInterval(process.interval)
      }
      this.serverProcesses.delete(serverId)
      console.log(`🛑 Stopped log streaming for server ${serverId}`)
    }
  }

  private async executeServerCommand(serverId: string, command: string, nodeInfo: any) {
    try {
      const response = await fetch(`http://${nodeInfo.ip}:${nodeInfo.port}/console/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nodeInfo.token}`
        },
        body: JSON.stringify({
          serverId,
          command
        })
      })

      if (response.ok) {
        const result = await response.json()
        return { success: true, result }
      } else {
        const error = await response.text()
        return { success: false, error }
      }
    } catch (error) {
      return { success: false, error: typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : String(error) }
    }
  }

  private async executeServerControl(serverId: string, action: string, nodeInfo: any) {
    try {
      const response = await fetch(`http://${nodeInfo.ip}:${nodeInfo.port}/server/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nodeInfo.token}`
        },
        body: JSON.stringify({ serverId })
      })

      if (response.ok) {
        return { success: true }
      } else {
        const error = await response.text()
        return { success: false, error }
      }
    } catch (error) {
      return { success: false, error: typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : String(error) }
    }
  }

  private async updateServerStatus(serverId: string, nodeInfo: any) {
    try {
      const response = await fetch(`http://${nodeInfo.ip}:${nodeInfo.port}/server/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${nodeInfo.token}`,
          'Server-Id': serverId
        }
      })

      if (response.ok) {
        const status = await response.json()
        this.io.to(`console:${serverId}`).emit('console:status', {
          status: status.status,
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('❌ Status update error:', error)
    }
  }

  private buildContainerId(serverName: string, userId: string, nodeId: string): string {
    return `mc-${serverName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${userId}-${nodeId}`
  }

  // Public method to broadcast messages
  public broadcastToServer(serverId: string, message: any) {
    this.io.to(`console:${serverId}`).emit('console:message', message)
  }
}

export let socketManager: SocketManager

export function initializeSocket(server: HTTPServer) {
  socketManager = new SocketManager(server)
  return socketManager
}