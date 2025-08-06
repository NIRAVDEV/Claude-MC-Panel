// app/api/admin/nodes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * NODE MODEL FIELD EXPLANATION:
 * 
 * - host: Can be IP address OR FQDN (Fully Qualified Domain Name)
 *   Examples: "192.168.1.100", "node1.minecrafthost.com"
 * 
 * - ipAddress: The actual IP address of the node (resolved from FQDN if needed)
 *   Always an IP: "192.168.1.100"
 * 
 * - port: The DAEMON port for our hosting service communication (NOT SSH)
 *   Default: 2022 (custom daemon), NOT 22 (SSH)
 *   This is the port our hosting panel communicates with the node daemon
 * 
 * - location: Physical/logical location of the node
 *   Examples: "US-East", "Europe-Germany", "Asia-Singapore"
 */

// GET /api/admin/nodes - Get all nodes
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const nodes = await prisma.node.findMany({
      include: {
        servers: {
          select: {
            id: true,
            name: true,
            status: true,
          }
        },
        _count: {
          select: {
            servers: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Add computed fields for better admin overview
    const nodesWithStats = nodes.map(node => ({
      ...node,
      serverCount: node._count.servers,
      utilizationRam: Math.round((node.servers.length * 1024 / node.maxRam) * 100), // Rough estimate
      // utilizationServers: Math.round((node.servers.length / node.maxServers) * 100)
    }))

    return NextResponse.json(nodesWithStats)
  } catch (error) {
    console.error('Error fetching nodes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch nodes' },
      { status: 500 }
    )
  }
}

// POST /api/admin/nodes - Create a new node
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      name, 
      host,        // Can be IP or FQDN
      port,        // Daemon port (default 2022, NOT SSH port 22)
      ipAddress,   // Resolved IP address
      location,    // Geographic/logical location
      maxRam, 
      maxDisk, 
     // maxServers, 
      isActive 
    } = body

    // Validate required fields
    if (!name || !host) {
      return NextResponse.json(
        { error: 'Name and host (IP or FQDN) are required' },
        { status: 400 }
      )
    }

    // Validate host format (basic check for IP or domain)
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
    
    if (!ipRegex.test(host) && !domainRegex.test(host)) {
      return NextResponse.json(
        { error: 'Host must be a valid IP address or FQDN' },
        { status: 400 }
      )
    }

    // Check if node with same name already exists
    const existingNodeByName = await prisma.node.findFirst({
      where: { name }
    })

    if (existingNodeByName) {
      return NextResponse.json(
        { error: 'Node with this name already exists' },
        { status: 409 }
      )
    }

    // Check if node with same host already exists
    const existingNodeByHost = await prisma.node.findFirst({
      where: { host }
    })

    if (existingNodeByHost) {
      return NextResponse.json(
        { error: 'Node with this host already exists' },
        { status: 409 }
      )
    }

    // If ipAddress is not provided and host is an IP, use host as ipAddress
    let resolvedIpAddress = ipAddress
    if (!resolvedIpAddress && ipRegex.test(host)) {
      resolvedIpAddress = host
    }

    // Create the node with proper field understanding
    const node = await prisma.node.create({
      data: {
        name,
        host,                                    // IP or FQDN
        port: port || 2022,                     // Daemon port (NOT SSH port)
        ipAddress: resolvedIpAddress || null,   // Actual IP address
        location: location || null,             // Geographic location
        maxRam: maxRam || 8192,                // Default 8GB RAM
        maxDisk: maxDisk || 100,               // Default 100GB disk
        // maxServers: maxServers || 10,          // Default 10 servers
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        servers: {
          select: {
            id: true,
            name: true,
            status: true,
          }
        }
      }
    })

    return NextResponse.json(node, { status: 201 })
  } catch (error) {
    console.error('Error creating node:', error)
    return NextResponse.json(
      { error: 'Failed to create node' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/nodes - Update a node
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      id, 
      name, 
      host, 
      port, 
      ipAddress, 
      location, 
      maxRam, 
      maxDisk, 
      // maxServers, 
      isActive 
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Node ID is required' },
        { status: 400 }
      )
    }

    // Check if node exists
    const existingNode = await prisma.node.findUnique({
      where: { id }
    })

    if (!existingNode) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      )
    }

    // Validate host format if being updated
    if (host) {
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
      
      if (!ipRegex.test(host) && !domainRegex.test(host)) {
        return NextResponse.json(
          { error: 'Host must be a valid IP address or FQDN' },
          { status: 400 }
        )
      }
    }

    // Check for conflicts
    if (name && name !== existingNode.name) {
      const nameConflict = await prisma.node.findFirst({
        where: { 
          name,
          id: { not: id }
        }
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Node with this name already exists' },
          { status: 409 }
        )
      }
    }

    if (host && host !== existingNode.host) {
      const hostConflict = await prisma.node.findFirst({
        where: { 
          host,
          id: { not: id }
        }
      })

      if (hostConflict) {
        return NextResponse.json(
          { error: 'Node with this host already exists' },
          { status: 409 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (host !== undefined) updateData.host = host
    if (port !== undefined) updateData.port = port
    if (ipAddress !== undefined) updateData.ipAddress = ipAddress
    if (location !== undefined) updateData.location = location
    if (maxRam !== undefined) updateData.maxRam = maxRam
    if (maxDisk !== undefined) updateData.maxDisk = maxDisk
   // if (maxServers !== undefined) 
 // updateData.maxServers = maxServers
    if (isActive !== undefined) updateData.isActive = isActive

    const updatedNode = await prisma.node.update({
      where: { id },
      data: updateData,
      include: {
        servers: {
          select: {
            id: true,
            name: true,
            status: true,
          }
        }
      }
    })

    return NextResponse.json(updatedNode)
  } catch (error) {
    console.error('Error updating node:', error)
    return NextResponse.json(
      { error: 'Failed to update node' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/nodes - Delete a node
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Node ID is required' },
        { status: 400 }
      )
    }

    // Check if node exists
    const existingNode = await prisma.node.findUnique({
      where: { id },
      include: {
        servers: true
      }
    })

    if (!existingNode) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      )
    }

    // Check if node has any servers (active or inactive)
    if (existingNode.servers.length > 0) {
      const activeServers = existingNode.servers.filter(server => 
        server.status === 'RUNNING' || server.status === 'STARTING'
      )

      if (activeServers.length > 0) {
        return NextResponse.json(
          { 
            error: 'Cannot delete node with active servers. Please stop servers first.',
            activeServers: activeServers.length,
            totalServers: existingNode.servers.length
          },
          { status: 400 }
        )
      }

      // If there are inactive servers, warn but allow deletion
      return NextResponse.json(
        { 
          error: 'Node has inactive servers. Are you sure you want to delete? This will remove all associated servers.',
          totalServers: existingNode.servers.length
        },
        { status: 400 }
      )
    }

    // Delete the node (cascade will handle related records)
    await prisma.node.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Node deleted successfully',
      deletedNode: {
        id: existingNode.id,
        name: existingNode.name,
        host: existingNode.host
      }
    })
  } catch (error) {
    console.error('Error deleting node:', error)
    return NextResponse.json(
      { error: 'Failed to delete node' },
      { status: 500 }
    )
  }
}