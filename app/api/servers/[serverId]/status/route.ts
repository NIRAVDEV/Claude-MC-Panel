// app/api/servers/[serverId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { lucia } from '@/lib/lucia'
import { cookies } from 'next/headers'

interface WingsStatusResponse {
  status: string
  message?: string
}

async function getServerStatusFromWings(
  nodeUrl: string,
  nodeToken: string,
  serverName: string,
  userEmail: string,
  nodeId: string
): Promise<string> {
  try {
    const params = new URLSearchParams({
      serverName,
      userEmail,
      nodeId // Include nodeId in the request
    })

    // Remove port 25575 from nodeUrl if present
    const sanitizedNodeUrl = nodeUrl.replace(/:25575$/, '')

    const response = await fetch(`${sanitizedNodeUrl}/server/status?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${nodeToken}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Wings API Error: ${response.status} - ${errorText}`)
    }

    const data: WingsStatusResponse = await response.json()
    return data.message || 'unknown'

  } catch (error) {
    console.error('Wings status check failed:', error)
    return 'error'
  }
}

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

  return server
}

// Map Docker status to our internal status
function mapDockerStatus(dockerStatus: string): string {
  switch (dockerStatus.toLowerCase().trim()) {
    case 'running':
      return 'RUNNING'
    case 'exited':
    case 'stopped':
      return 'STOPPED'
    case 'created':
      return 'CREATED'
    case 'restarting':
      return 'RESTARTING'
    case 'paused':
      return 'PAUSED'
    case 'dead':
      return 'DEAD'
    default:
      return 'UNKNOWN'
  }
}

export async function GET(request: NextRequest) {
  try {
    // Extract serverId from the URL pathname
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const serversIdx = pathParts.findIndex(p => p === 'servers')
    const serverId = serversIdx !== -1 ? pathParts[serversIdx + 1] : undefined
    if (!serverId) {
      return NextResponse.json({ success: false, error: 'Missing serverId in URL' }, { status: 400 })
    }

    // Validate authentication
    const cookieStore = cookies()
    const sessionId = (await cookieStore).get(lucia.sessionCookieName)?.value ?? null
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { user } = await lucia.validateSession(sessionId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Validate server access
    const server = await validateServerAccess(serverId, user.id)

    // If node is offline, return cached status
    if (server.node.status !== 'ONLINE') {
      return NextResponse.json({
        success: true,
        serverId: serverId,
        status: 'OFFLINE',
        lastUpdated: server.updatedAt,
        nodeStatus: server.node.status,
        cached: true
      })
    }

    const nodeUrl = `http://${server.node.ip}:${server.node.port}`
    const dockerStatus = await getServerStatusFromWings(
      nodeUrl,
      server.node.verificationToken,
      server.name,
      server.user.email,
      server.node.id
    )

    // Map Docker status to our internal status
    const mappedStatus = mapDockerStatus(dockerStatus)

    // Update database with current status if it changed
    let updatedServer = server
    if (mappedStatus !== server.status && mappedStatus !== 'UNKNOWN') {
      updatedServer = await prisma.server.update({
        where: { id: serverId },
        data: { 
          status: mappedStatus as any, // Cast to any if ServerStatus enum is not imported
          updatedAt: new Date()
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
      }) as typeof server // Type assertion to match the type of `server`
    }

    return NextResponse.json({
      success: true,
      serverId: serverId,
      status: mappedStatus,
      dockerStatus: dockerStatus,
      lastUpdated: updatedServer.updatedAt,
      nodeStatus: server.node.status,
      cached: false,
      server: {
        id: server.id,
        name: server.name,
        software: server.software,
        ram: server.ram,
        storage: server.storage,
        containerId: server.containerId,
        node: {
          id: server.node.id,
          name: server.node.name,
          ip: server.node.ip,
          status: server.node.status
        }
      }
    })

  } catch (error) {
    console.error('Get server status API error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}