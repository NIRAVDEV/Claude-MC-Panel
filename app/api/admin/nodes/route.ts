// app/api/admin/nodes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(nodes)
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
      host, 
      port, 
      ipAddress, 
      location, 
      maxRam, 
      maxDisk, 
      maxServers, 
      isActive 
    } = body

    // Validate required fields
    if (!name || !host) {
      return NextResponse.json(
        { error: 'Name and host are required' },
        { status: 400 }
      )
    }

    // Check if node with same name already exists
    const existingNode = await prisma.node.findFirst({
      where: { name }
    })

    if (existingNode) {
      return NextResponse.json(
        { error: 'Node with this name already exists' },
        { status: 409 }
      )
    }

    // Create the node with all available fields
    const node = await prisma.node.create({
      data: {
        name,
        host,
        port: port || 22, // Default SSH port
        ipAddress: ipAddress || null, // Optional field
        location: location || null, // Optional field
        maxRam: maxRam || 8192, // Default 8GB
        maxDisk: maxDisk || 100, // Default 100GB
        maxServers: maxServers || 10, // Default 10 servers
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
      maxServers, 
      isActive 
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Node ID is required' },
        { status: 400 }
      )
    }

    // Check if node exists using id (which should be unique)
    const existingNode = await prisma.node.findUnique({
      where: { id }
    })

    if (!existingNode) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      )
    }

    // Check if name is being changed and conflicts with another node
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

    const updatedNode = await prisma.node.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(host && { host }),
        ...(port !== undefined && { port }),
        ...(ipAddress !== undefined && { ipAddress }),
        ...(location !== undefined && { location }),
        ...(maxRam !== undefined && { maxRam }),
        ...(maxDisk !== undefined && { maxDisk }),
        ...(maxServers !== undefined && { maxServers }),
        ...(isActive !== undefined && { isActive }),
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

    // Check if node has active servers
    const activeServers = existingNode.servers.filter(server => 
      server.status === 'RUNNING' || server.status === 'STARTING'
    )

    if (activeServers.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete node with active servers. Please stop or migrate servers first.',
          activeServers: activeServers.length
        },
        { status: 400 }
      )
    }

    // Delete the node (cascade will handle related records)
    await prisma.node.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Node deleted successfully' })
  } catch (error) {
    console.error('Error deleting node:', error)
}
  
return NextResponse.json()
}
      