// app/api/servers/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { validateRequest } from '@/lib/auth-utils'
import { cookies } from 'next/headers'

// Types for Wings API communication
interface WingsCreateServerRequest {
  serverName: string
  userEmail: string
  software: string
  maxRAM?: number
  storage?: string
  type?: string
  nodeId?: string
}

interface WingsCreateServerResponse {
  status: string
  serverId?: string
  message?: string
}

// Types for our API
interface CreateServerRequest {
  name: string
  software: string
  maxRAM: string
  storage: string
  nodeId: string
  userEmail?: string // client should not rely on this; server determines from auth
}

interface ServerCreationError extends Error {
  statusCode?: number
}

// Wings Agent Communication Helper
async function createServerOnNode(nodeUrl: string, nodeToken: string, serverData: WingsCreateServerRequest): Promise<WingsCreateServerResponse> {
  try {
    const response = await fetch(`${nodeUrl}/server/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nodeToken}`
      },
      body: JSON.stringify(serverData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Wings API Error: ${response.status} - ${errorText}`)
    }

    return await response.json() as WingsCreateServerResponse
  } catch (error) {
    console.error('Wings API communication failed:', error)
    throw new Error(`Failed to communicate with Wings agent: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Credit Cost Calculation
function calculateCreditCost(ram: string, storage: string): number {
  const ramGB = parseInt(ram.replace('G', ''))
  const storageGB = parseInt(storage.replace('G', ''))
  
  // Cost calculation: 10 credits per GB RAM + 2 credits per GB storage (monthly)
  return (ramGB * 10) + (storageGB * 2)
}

// Validate Server Software
function validateServerSoftware(software: string): boolean {
  const supportedSoftware = ['vanilla', 'paper', 'purpur', 'fabric', 'forge', 'spigot', 'leaf']
  return supportedSoftware.includes(software.toLowerCase())
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: CreateServerRequest = await request.json()
    console.log('[API/servers/create] Incoming request body:', body)
    const { name, software, maxRAM, storage, nodeId } = body

    // Validate required fields
    if (!name || !software || !maxRAM || !storage || !nodeId) {
      console.warn('[API/servers/create] Missing required fields:', { name, software, maxRAM, storage, nodeId })
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: name, software, maxRAM, storage, nodeId',
          received: body
        },
        { status: 400 }
      )
    }

    // Validate server software
    if (!validateServerSoftware(software)) {
      console.warn('[API/servers/create] Unsupported server software:', software)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unsupported server software. Supported: vanilla, paper, purpur, fabric, forge, spigot',
          received: software
        },
        { status: 400 }
      )
    }

    // Determine authenticated user via Lucia first, fallback to next-auth
    const luciaResult = await validateRequest()
    const nextAuthSession = await getServerSession(authOptions)
    const luciaUser = luciaResult.user
    const nextAuthEmail = nextAuthSession?.user?.email

    console.log('[API/servers/create] Auth state:', {
      luciaUser: luciaUser ? { id: luciaUser.id, email: luciaUser.email, role: (luciaUser as any).role } : null,
      nextAuthEmail,
      bodyUserEmail: body.userEmail
    })

    const effectiveEmail = luciaUser?.email || nextAuthEmail
    if (!effectiveEmail) {
      console.warn('[API/servers/create] No authenticated email from lucia or next-auth')
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Get user with current credits
    const userData = await prisma.user.findUnique({
      where: { email: effectiveEmail },
      select: { id: true, email: true, credits: true, name: true, role: true }
    })

    if (!userData) {
      console.warn('[API/servers/create] User not found in DB for email:', effectiveEmail)
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }
    const user = userData

    // Calculate credit cost
    const creditCost = calculateCreditCost(maxRAM, storage)

    // Check if user has enough credits
    if (userData.credits < creditCost) {
      console.warn('[API/servers/create] Insufficient credits:', { required: creditCost, available: userData.credits })
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient credits. Required: ${creditCost}, Available: ${userData.credits}`,
          required: creditCost,
          available: userData.credits
        },
        { status: 402 }
      )
    }

    // Validate nodeId existence
    const node = await prisma.node.findUnique({
      where: { id: body.nodeId },
    })

    if (!node) {
      return NextResponse.json({
        error: 'Node not found',
      }, { status: 404 })
    }

    if (node.status !== 'ONLINE') {
      console.warn('[API/servers/create] Node not online:', node)
      return NextResponse.json(
        { success: false, error: 'Selected node is not online' },
        { status: 503 }
      )
    }

    // Check if server name already exists for this user
    const existingServer = await prisma.server.findFirst({
      where: {
        name,
        userId: user.id
      }
    })

    if (existingServer) {
      console.warn('[API/servers/create] Server with this name already exists:', name)
      return NextResponse.json(
        { success: false, error: 'Server with this name already exists' },
        { status: 409 }
      )
    }

    // Prepare Wings API request
    const nodeUrl = `http://${node.ip}:${node.port}`
    const wingsRequest: WingsCreateServerRequest = {
      serverName: name,
      userEmail: userData.email, // authoritative email
      software: software.toLowerCase(),
      maxRAM: parseInt(maxRAM, 10),
      storage,
      type: software.toLowerCase(),
      nodeId // placeholder, will be set later
    }

    // Create server on Wings agent
    let wingsResponse: WingsCreateServerResponse
    try {
      wingsResponse = await createServerOnNode(nodeUrl, node.verificationToken, wingsRequest)
    } catch (error) {
      console.error('[API/servers/create] Wings server creation failed:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create server on node',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

    // Verify Wings response
    if (wingsResponse.status !== 'ok' || !wingsResponse.serverId) {
      console.warn('[API/servers/create] Wings agent failed to create server:', wingsResponse)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wings agent failed to create server',
          wingsError: wingsResponse.message 
        },
        { status: 500 }
      )
    }

    // Create database transaction for server creation and credit deduction
    const result = await prisma.$transaction(async (tx) => {
      // Create server record
      const newServer = await tx.server.create({
        data: {
          name,
          software,
          ram: parseInt(maxRAM, 10),
          storage: parseInt(storage, 10),
          status: 'STOPPED',
          containerId: wingsResponse.serverId!,
          userId: user.id,
          nodeId: node.id,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          user: {
            select: { name: true, email: true }
          },
          node: {
            select: { name: true, ip: true }
          }
        }
      })

      // Deduct credits from user
      await tx.user.update({
        where: { id: user.id },
        data: {
          credits: {
            decrement: creditCost
          }
        }
      })

      // Log credit transaction
      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: -creditCost,
          type: 'SERVER_COST',
          description: `Server creation: ${name}`,
        //   serverId: newServer.id
        }
      })

      return newServer
    })

    // Return successful response
    return NextResponse.json({
      success: true,
      message: 'Server created successfully',
      server: {
        id: result.id,
        name: result.name,
        software: result.software,
        ram: result.ram,
        storage: result.storage,
        status: result.status,
        containerId: result.containerId,
        // node: result.node,
        createdAt: result.createdAt
      },
      creditsDeducted: creditCost,
      remainingCredits: userData.credits - creditCost
    })

  } catch (error) {
    console.error('[API/servers/create] Unhandled error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve user's servers
export async function GET(request: NextRequest) {
  try {
    // Get current user from NextAuth session
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      console.warn('[API/servers/create][GET] No NextAuth session found')
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user data
    const userData = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!userData) {
      console.warn('[API/servers/create][GET] User not found:', session.user.email)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user's servers
    const servers = await prisma.server.findMany({
      where: { userId: userData.id },
      include: {
        node: {
          select: { 
            id: true, 
            name: true, 
            ip: true, 
            port: true, 
            status: true 
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      servers: servers.map(server => ({
        id: server.id,
        name: server.name,
        software: server.software,
        ram: server.ram,
        storage: server.storage,
        status: server.status,
        containerId: server.containerId,
        node: server.node,
        createdAt: server.createdAt,
        updatedAt: server.updatedAt
      }))
    })

  } catch (error) {
    console.error('Get servers API error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}