// app/api/servers/[serverId]/console/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { prisma } from '@/lib/prisma'
import { lucia } from '@/lib/lucia'

interface ConsoleMessage {
  type: 'init' | 'command' | 'log' | 'error' | 'status'
  serverId?: string
  serverName?: string
  userEmail?: string
  command?: string
  message?: string
  timestamp?: string
}

interface WingsConsolePayload {
  serverName: string
  userEmail: string
  command?: string
  action: string
}

// Store active WebSocket connections
const activeConnections = new Map<string, {
  ws: WebSocket
  wingsWs?: WebSocket
  serverId: string
  userId: string
}>()

async function validateServerAccess(serverId: string, userId: string) {
  const server = await prisma.server.findFirst({
    where: {
      id: serverId,
      userId: userId
    },
    include: {
      node: {
        select: {
          id: true,
          name: true,
          ip: true,
          port: true,
          verificationToken: true,
          status: true
        }
      },
      user: {
        select: {
          email: true
        }
      }
    }
  })

  if (!server) {
    throw new Error('Server not found or access denied')
  }

  if (server.node.status !== 'ONLINE') {
    throw new Error('Server node is not online')
  }

  return server
}

function createWingsWebSocketConnection(
  nodeUrl: string,
  nodeToken: string,
  serverName: string,
  userEmail: string,
  clientWs: WebSocket
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const wingsWsUrl = `ws://${nodeUrl.replace('http://', '')}/ws/console`
    const wingsWs = new WebSocket(wingsWsUrl, {
      headers: {
        'Authorization': `Bearer ${nodeToken}`
      }
    })

    wingsWs.on('open', () => {
      // Send initial payload to Wings
      const initPayload: WingsConsolePayload = {
        serverName,
        userEmail,
        action: 'init'
      }
      wingsWs.send(JSON.stringify(initPayload))
      resolve(wingsWs)
    })

    wingsWs.on('message', (data: Buffer) => {
      try {
        // Forward Wings messages to client
        const message: ConsoleMessage = {
          type: 'log',
          message: data.toString(),
          timestamp: new Date().toISOString()
        }
        
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify(message))
        }
      } catch (error) {
        console.error('Error processing Wings message:', error)
      }
    })

    wingsWs.on('error', (error) => {
      console.error('Wings WebSocket error:', error)
      const errorMessage: ConsoleMessage = {
        type: 'error',
        message: `Connection to server console failed: ${error.message}`,
        timestamp: new Date().toISOString()
      }
      
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(errorMessage))
      }
      reject(error)
    })

    wingsWs.on('close', () => {
      const statusMessage: ConsoleMessage = {
        type: 'status',
        message: 'Console connection closed',
        timestamp: new Date().toISOString()
      }
      
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(statusMessage))
      }
    })
  })
}

// WebSocket upgrade handler
export async function GET(request: NextRequest) {
  // Extract serverId from the URL pathname
  const url = new URL(request.url)
  // /api/servers/[serverId]/console
  // Split and get the serverId
  const pathParts = url.pathname.split('/')
  // Find the index of 'servers' and get the next part as serverId
  const serversIdx = pathParts.findIndex(p => p === 'servers')
  const serverId = serversIdx !== -1 ? pathParts[serversIdx + 1] : undefined
  if (!serverId) {
    return NextResponse.json({ error: 'Missing serverId in URL' }, { status: 400 })
  }

  try {
    // Check if this is a WebSocket upgrade request
    const upgradeHeader = request.headers.get('upgrade')
    if (upgradeHeader !== 'websocket') {
      return NextResponse.json(
        { error: 'This endpoint requires WebSocket upgrade' },
        { status: 426 }
      )
    }

    // Validate session from query params (since WebSocket headers are limited)
    const url = new URL(request.url)
    const sessionToken = url.searchParams.get('session')
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Missing session token' },
        { status: 401 }
      )
    }

    // Validate session
    const { user } = await lucia.validateSession(sessionToken)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Validate server access
    const server = await validateServerAccess(serverId, user.id)

    // Create WebSocket server for this connection
    const wss = new WebSocketServer({ 
      port: 0,  // Use dynamic port
      perMessageDeflate: false
    })

    wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      const connectionId = `${serverId}-${user.id}-${Date.now()}`
      
      try {
        // Store connection
        activeConnections.set(connectionId, {
          ws,
          serverId,
          userId: user.id
        })

        // Send initial status
        const initMessage: ConsoleMessage = {
          type: 'status',
          serverId,
          message: 'Connecting to server console...',
          timestamp: new Date().toISOString()
        }
        ws.send(JSON.stringify(initMessage))

        // Create Wings WebSocket connection
        const nodeUrl = `http://${server.node.ip}:${server.node.port}`
        const wingsWs = await createWingsWebSocketConnection(
          nodeUrl,
          server.node.verificationToken,
          server.name,
          server.user.email,
          ws
        )

        // Update connection with Wings WebSocket
        const connection = activeConnections.get(connectionId)
        if (connection) {
          connection.wingsWs = wingsWs
        }

        // Handle client messages (commands)
        ws.on('message', (data: Buffer) => {
          try {
            const clientMessage: ConsoleMessage = JSON.parse(data.toString())
            
            if (clientMessage.type === 'command' && clientMessage.command) {
              // Forward command to Wings
              const wingsPayload: WingsConsolePayload = {
                serverName: server.name,
                userEmail: server.user.email,
                command: clientMessage.command,
                action: 'command'
              }
              
              if (wingsWs && wingsWs.readyState === WebSocket.OPEN) {
                wingsWs.send(JSON.stringify(wingsPayload))
              }
            }
          } catch (error) {
            console.error('Error processing client message:', error)
            const errorMessage: ConsoleMessage = {
              type: 'error',
              message: 'Invalid command format',
              timestamp: new Date().toISOString()
            }
            ws.send(JSON.stringify(errorMessage))
          }
        })

        // Handle client disconnect
        ws.on('close', () => {
          const connection = activeConnections.get(connectionId)
          if (connection?.wingsWs) {
            connection.wingsWs.close()
          }
          activeConnections.delete(connectionId)
        })

        ws.on('error', (error) => {
          console.error('Client WebSocket error:', error)
          const connection = activeConnections.get(connectionId)
          if (connection?.wingsWs) {
            connection.wingsWs.close()
          }
          activeConnections.delete(connectionId)
        })

      } catch (error) {
        console.error('WebSocket connection error:', error)
        const errorMessage: ConsoleMessage = {
          type: 'error',
          message: `Failed to connect to server console: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        }
        ws.send(JSON.stringify(errorMessage))
        ws.close()
        activeConnections.delete(connectionId)
      }
    })

    return new Response(null, {
      status: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Accept': '', // This would be calculated properly in a real implementation
      }
    })

  } catch (error) {
    console.error('Console WebSocket setup error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to setup console connection'
      },
      { status: 500 }
    )
  }
}

// Alternative HTTP endpoint for environments that don't support WebSocket upgrades in API routes
export async function POST(request: NextRequest) {
  // Extract serverId from the URL pathname
  const url = new URL(request.url)
  const pathParts = url.pathname.split('/')
  const serversIdx = pathParts.findIndex(p => p === 'servers')
  const serverId = serversIdx !== -1 ? pathParts[serversIdx + 1] : undefined
  return NextResponse.json({
    message: 'WebSocket console connection required',
    endpoint: serverId ? `/api/servers/${serverId}/console` : undefined,
    instructions: 'Use WebSocket upgrade to connect to server console'
  })
}