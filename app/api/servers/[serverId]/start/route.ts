// app/api/servers/[serverId]/start/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-utils"

interface WingsResponse {
  status: string
  message?: string
  data?: any
}

async function sendWingsCommand(
  nodeIp: string,
  nodePort: number,
  nodeToken: string,
  serverId: string,
  serverName: string,
  userEmail: string,
  command: string,
  software?: string
): Promise<WingsResponse> {
  // 🔧 FIX: Use the actual Wings agent endpoints
  const wingsEndpoint = `http://${nodeIp}:${nodePort}/server/${command}`
  
  console.log(`Sending ${command} command to Wings endpoint: ${wingsEndpoint}`)
  
  // 🔧 FIX: Wings agent expects specific request format
  const requestBody = {
    serverName: serverName,
    userEmail: userEmail,
    nodeId: serverId, // Wings uses this as container identifier
    token: nodeToken,
    ...(software && { software }) // Include software for create commands
  }
  
  console.log('Wings request body:', requestBody)
  
  try {
    const response = await fetch(wingsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nodeToken}`,
      },
      body: JSON.stringify(requestBody),
    })

    console.log(`Wings API response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Wings API Error: ${response.status} - ${errorText}`)
      throw new Error(`Wings API Error: ${response.status} - ${errorText}`)
    }

    return await response.json() as WingsResponse
  } catch (error) {
    console.error('Wings API communication failed:', error)
    throw new Error(`Failed to communicate with Wings agent: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ serverId: string }> }
) {
  try {
    const { user } = await requireAuth()
    const { serverId } = await context.params

    console.log(`Starting server ${serverId} for user ${user.id}`)

    // Get server with node information
    const server = await prisma.server.findFirst({
      where: {
        id: serverId,
        userId: user.id,
      },
      include: {
        node: true
      }
    })

    if (!server) {
      console.error(`Server not found: ${serverId} for user ${user.id}`)
      return NextResponse.json(
        { error: "Server not found or access denied" },
        { status: 404 }
      )
    }

    if (!server.node) {
      console.error(`Server ${serverId} has no assigned node`)
      return NextResponse.json(
        { error: "Server has no assigned node" },
        { status: 400 }
      )
    }

    // 🔧 FIX: Check for ONLINE status (Wings agent uses different statuses)
    if (server.node.status !== 'ONLINE') {
      console.error(`Node ${server.node.name} is not online: ${server.node.status}`)
      return NextResponse.json(
        { error: `Node ${server.node.name} is not online` },
        { status: 503 }
      )
    }

    console.log(`Server ${serverId} is assigned to node: ${server.node.name} (${server.node.ip}:${server.node.port})`)

    // 🔧 FIX: Call Wings agent with correct parameters
    const result = await sendWingsCommand(
      server.node.ip,
      server.node.port,
      server.node.verificationToken,
      server.node.id, // Use node ID for Wings agent
      server.name,
      user.email || 'admin@example.com',
      'start'
    )

    // Update server status in database
    await prisma.server.update({
      where: { id: serverId },
      data: { status: 'STARTING' }
    })

    console.log(`Server ${serverId} start command sent successfully`)

    return NextResponse.json({
      success: true,
      message: "Server start command sent successfully",
      serverName: server.name,
      nodeName: server.node.name,
      wingsEndpoint: `${server.node.ip}:${server.node.port}`,
      result
    })

  } catch (error) {
    console.error("Start server API error:", error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to start server",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}