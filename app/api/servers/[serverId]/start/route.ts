// app/api/servers/[serverId]/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { lucia } from '@/lib/lucia'
import { cookies } from 'next/headers'

interface WingsControlRequest {
  serverName: string
  userEmail: string
}

interface WingsResponse {
  status: string
  message?: string
}

async function sendWingsCommand(
  nodeUrl: string, 
  nodeToken: string, 
  endpoint: string, 
  data: WingsControlRequest
): Promise<WingsResponse> {
  try {
    const response = await fetch(`${nodeUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nodeToken}`
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Wings API Error: ${response.status} - ${errorText}`)
    }

    return await response.json() as WingsResponse
  } catch (error) {
    console.error('Wings API communication failed:', error)
    throw new Error(`Failed to communicate with Wings agent: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

  if (server.node.status !== 'ONLINE') {
    throw new Error('Server node is not online')
  }

  return server
}

// START SERVER ENDPOINT
export async function POST(request: NextRequest) {
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
    const nodeUrl = `http://${server.node.ip}:${server.node.port}`
    console.log(`Starting server ${server.name} at ${nodeUrl}`)

    // Send start command to Wings agent
    const wingsResponse = await sendWingsCommand(
      nodeUrl,
      server.node.verificationToken,
      '/server/start',
      {
        serverName: server.name,
        userEmail: server.user.email
      }
    )

    if (wingsResponse.status !== 'ok') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to start server',
          wingsError: wingsResponse.message 
        },
        { status: 500 }
      )
    }

    // Update server status in database
    await prisma.server.update({
      where: { id: serverId },
      data: { 
        status: 'STARTING',
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Server start command sent successfully',
      serverId: serverId
    })

  } catch (error) {
    console.error('Start server API error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}