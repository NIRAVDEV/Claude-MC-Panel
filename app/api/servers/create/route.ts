// app/api/servers/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { lucia } from '@/lib/lucia'
// import { authOptions } from '@/lib/auth'
import { cookies } from 'next/headers'

// Types for Wings API communication
interface WingsCreateServerRequest {
  serverName: string
  userEmail: string
  software: string
  maxRAM?: number
  storage?: string
  type?: string
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
  const supportedSoftware = ['vanilla', 'paper', 'purpur', 'fabric', 'forge', 'spigot']
  return supportedSoftware.includes(software.toLowerCase())
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: CreateServerRequest = await request.json()
    const { name, software, maxRAM, storage, nodeId } = body

    // Validate required fields
    if (!name || !software || !maxRAM || !storage || !nodeId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: name, software, maxRAM, storage, nodeId' 
        },
        { status: 400 }
      )
    }

    // Validate server software
    if (!validateServerSoftware(software)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unsupported server software. Supported: vanilla, paper, purpur, fabric, forge, spigot' 
        },
        { status: 400 }
      )
    }

    // Get current user from session
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

    // Get user with current credits
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, credits: true, name: true }
    })

    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Calculate credit cost
    const creditCost = calculateCreditCost(maxRAM, storage)

    // Check if user has enough credits
    if (userData.credits < creditCost) {
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

    // Get target node information
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      select: { 
        id: true, 
        name: true, 
        ip: true, 
        port: true, 
        verificationToken: true,
        status: true 
      }
    })

    if (!node) {
      return NextResponse.json(
        { success: false, error: 'Node not found' },
        { status: 404 }
      )
    }

    if (node.status !== 'ONLINE') {
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
      return NextResponse.json(
        { success: false, error: 'Server with this name already exists' },
        { status: 409 }
      )
    }

    // Prepare Wings API request
    const nodeUrl = `http://${node.ip}:${node.port}`
    const wingsRequest: WingsCreateServerRequest = {
      serverName: name,
      userEmail: userData.email,
      software: software.toLowerCase(),
      maxRAM: parseInt(maxRAM, 10),
      storage,
      type: software.toLowerCase()
    }

    // Create server on Wings agent
    let wingsResponse: WingsCreateServerResponse
    try {
      wingsResponse = await createServerOnNode(nodeUrl, node.verificationToken, wingsRequest)
    } catch (error) {
      console.error('Wings server creation failed:', error)
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
    console.error('Server creation API error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve user's servers
export async function GET(request: NextRequest) {
  try {
    // Get current user from session
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

    // Get user's servers
    const servers = await prisma.server.findMany({
      where: { userId: user.id },
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