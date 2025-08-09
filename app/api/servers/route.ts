import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-utils"

interface WingsResponse {
  success: boolean
  message: string
  data?: any
}

async function sendWingsCommand(
  nodeUrl: string,
  nodeToken: string,
  serverId: string,
  command: string,
  data?: any
): Promise<WingsResponse> {
  console.log(`Sending ${command} command to node: ${nodeUrl}`)
  
  try {
    const response = await fetch(`${nodeUrl}/api/servers/${serverId}/${command}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nodeToken}`,
        'X-Node-Token': nodeToken
      },
      body: data ? JSON.stringify(data) : undefined,
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

// 💰 Server pricing configuration
const SERVER_COSTS = {
  512: 50,   // 512MB = 50 credits
  1024: 100, // 1GB = 100 credits
  2048: 200, // 2GB = 200 credits
  4096: 400, // 4GB = 400 credits
  8192: 800, // 8GB = 800 credits
} as const

function calculateServerCost(memoryMB: number): number {
  // Base cost calculation: 0.1 credits per MB
  const baseCost = Math.ceil(memoryMB * 0.1)
  
  // Use predefined costs if available, otherwise calculate
  return SERVER_COSTS[memoryMB as keyof typeof SERVER_COSTS] || baseCost
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth()
    const body = await request.json()
    
    // Extract data from request body
    const { 
      name, 
      type, 
      memory, 
      nodeId, // 🎯 NEW: Optional nodeId parameter
      version = "1.20.1",
      description = ""
    } = body

    console.log('Server creation request:', { name, type, memory, nodeId, userId: user.id })

    // Validate required fields
    if (!name || !type || !memory) {
      return NextResponse.json(
        { error: "Missing required fields: name, type, memory" },
        { status: 400 }
      )
    }

    // Validate memory is a number
    const memoryMB = parseInt(memory)
    if (isNaN(memoryMB) || memoryMB < 512) {
      return NextResponse.json(
        { error: "Memory must be a number (minimum 512MB)" },
        { status: 400 }
      )
    }

    // 💰 Calculate server creation cost
    const serverCost = calculateServerCost(memoryMB)
    console.log(`Server cost calculation: ${memoryMB}MB = ${serverCost} credits`)

    // 💰 Check if user has sufficient credits
    if (user.credits < serverCost) {
      return NextResponse.json(
        { 
          error: "Insufficient credits",
          required: serverCost,
          available: user.credits,
          shortfall: serverCost - user.credits
        },
        { status: 402 } // Payment Required
      )
    }

    let selectedNode;

    if (nodeId) {
      // 🎯 Use specific node if provided
      console.log(`Looking for specific node: ${nodeId}`)
      
      selectedNode = await prisma.node.findFirst({
        where: {
          id: nodeId,
          status: 'ONLINE'
        }
      })

      if (!selectedNode) {
        // List available nodes for debugging
        const availableNodes = await prisma.node.findMany({
          where: { status: 'ONLINE' },
          select: { id: true, name: true, status: true }
        })

        return NextResponse.json(
          { 
            error: "Selected node not found or inONLINE",
            nodeId,
            availableNodes
          },
          { status: 400 }
        )
      }

      console.log(`Selected specific node: ${selectedNode.name}`)
    } else {
      // 🎯 Auto-select an available node
      console.log('Auto-selecting available node...')
      
      selectedNode = await prisma.node.findFirst({
        where: {
          status: 'ONLINE'
        },
        orderBy: [
          { createdAt: 'asc' } // Simple round-robin selection
        ]
      })

      if (!selectedNode) {
        const allNodes = await prisma.node.findMany({
          select: { id: true, name: true, status: true }
        })

        return NextResponse.json(
          { 
            error: "No ONLINE nodes available",
            allNodes
          },
          { status: 503 }
        )
      }

      console.log(`Auto-selected node: ${selectedNode.name}`)
    }

    // Check node capacity (optional)
    const nodeServerCount = await prisma.server.count({
      where: {
        nodeId: selectedNode.id,
        status: { not: 'REMOVED' }
      }
    })

    console.log(`Node ${selectedNode.name} has ${nodeServerCount} servers`)

    // Generate a unique port
    const existingPorts = await prisma.server.findMany({
      where: {
        nodeId: selectedNode.id,
        status: { not: 'REMOVED' }
      },
      select: { port: true }
    })

    let port = 25565
    const usedPorts = new Set(existingPorts.map(s => s.port))
    
    while (usedPorts.has(port) && port < 35565) {
      port++
    }

    // Create server in database with proper node assignment
    console.log(`Creating server ${name} on node ${selectedNode.name}`)
    
    // 💰 Use database transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Deduct credits from user
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { 
          credits: { decrement: serverCost }
        }
      })

      console.log(`Deducted ${serverCost} credits from user ${user.id}. New balance: ${updatedUser.credits}`)

      // 2. Create server record
      const server = await tx.server.create({
        data: {
          name,
          software: type,
          ram: memory,
          status: 'CREATING',
          userId: user.id,
          nodeId: selectedNode.id, // 🎯 KEY: Assign to selected node
          port,
          version,
        },
        include: {
          node: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              credits: true
            }
          }
        }
      })

      // 3. Create transaction record for audit trail
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'SERVER_COST',
          amount: serverCost,
          description: `Server creation: ${name} (${memoryMB}MB)`,
          metadata: {
            serverId: server.id,
            serverName: name,
            memory: memoryMB,
            nodeId: selectedNode.id,
            nodeName: selectedNode.name
          }
        }
      })

      return { server, updatedUser }
    })

    const { server, updatedUser } = result
    console.log(`Server created in database with ID: ${server.id}`)
    console.log(`User ${user.id} new credit balance: ${updatedUser.credits}`)

    // Send creation command to the assigned node
    try {
      console.log(`Sending creation command to Wings agent at ${selectedNode.ip}:${selectedNode.port}`)
      
      const wingsData = {
        serverId: server.id,
        name: server.name,
        type: server.software,
        memory: server.ram,
        port: server.port,
        version: server.version,
        userId: user.id
      }

      const result = await sendWingsCommand(
        `${selectedNode.ip}:${port}`,
        selectedNode.verificationToken,
        server.id,
        'create',
        wingsData
      )

      // Update status to indicate Wings creation succeeded
      await prisma.server.update({
        where: { id: server.id },
        data: { 
          status: 'STOPPED',
          updatedAt: new Date()
        }
      })

      console.log(`Server ${server.id} created successfully on Wings agent`)

      return NextResponse.json({
        success: true,
        message: "Server created successfully",
        server: {
          id: server.id,
          name: server.name,
          type: server.software,
          ram: server.ram,
          status: 'STOPPED',
          port: server.port,
          version: server.version,
          node: {
            id: selectedNode.id,
            name: selectedNode.name,
            url: selectedNode.ip,
            port: selectedNode.port,
          },
          createdAt: server.createdAt
        },
        billing: {
          cost: serverCost,
          previousBalance: user.credits,
          newBalance: updatedUser.credits,
          transactionId: server.id // You might want to return actual transaction ID
        },
        wingsResult: result
      })

    } catch (wingsError) {
      // If Wings fails, we need to refund the user since server creation failed
      console.error(`Wings creation failed for server ${server.id}:`, wingsError)
      
      try {
        // Refund credits and mark server as failed
        await prisma.$transaction(async (tx) => {
          // Refund the credits
          await tx.user.update({
            where: { id: user.id },
            data: { 
              credits: { increment: serverCost }
            }
          })

          // Update server status to ERROR
          await tx.server.update({
            where: { id: server.id },
            data: { 
              status: 'ERROR',
              updatedAt: new Date()
            }
          })

          // Create refund transaction record
          await tx.transaction.create({
            data: {
              userId: user.id,
              type: "ADMIN_ADJUSTMENT",
              // type: "REFUND",
              amount: serverCost,
              description: `Refund: Server creation failed - ${name}`,
              metadata: {
                serverId: server.id,
                serverName: name,
                reason: 'Wings deployment failed',
                originalError: wingsError instanceof Error ? wingsError.message : 'Unknown error'
              }
            }
          })

        console.log(`Refunded ${serverCost} credits to user ${user.id} due to Wings failure`)
        }) // <-- Add this closing brace to end the async transaction function

      } catch (refundError) {
        console.error('Failed to refund credits after Wings failure:', refundError)
      }
      
      return NextResponse.json({
        success: false,
        error: "Server creation failed - credits have been refunded",
        server: {
          id: server.id,
          name: server.name,
          status: 'ERROR',
          node: selectedNode.name
        },
        billing: {
          refunded: serverCost,
          reason: 'Wings deployment failed'
        },
        details: wingsError instanceof Error ? wingsError.message : 'Unknown Wings error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Create server API error:", error)
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to create server",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET route to list servers
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth()

    const servers = await prisma.server.findMany({
      where: {
        userId: user.id,
        status: { not: 'REMOVED' }
      },
      include: {
        node: {
          select: {
            id: true,
            name: true,
            status: true,
            ip: true,
            port: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      servers: servers.map(server => ({
        id: server.id,
        name: server.name,
        type: server.software,
        ram: server.ram,
        status: server.status,
        port: server.port,
        version: server.version,
        node: server.node,
        createdAt: server.createdAt,
        updatedAt: server.updatedAt
      }))
    })

  } catch (error) {
    console.error("List servers API error:", error)
    return NextResponse.json(
      { error: "Failed to list servers" },
      { status: 500 }
    )
  }
}