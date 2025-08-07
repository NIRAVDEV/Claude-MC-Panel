// ./app/api/admin/nodes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

// GET /api/admin/nodes - Get all nodes
export async function GET(request: NextRequest) {
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
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(nodes)
  } catch (error) {
    console.error('Error fetching nodes:', error)
    console.log('Error fetching nodes:', error)
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
    const { name, ip, port, location, description, fqdn, scheme, behindProxy, maintenanceMode, publicNode, maxServers, totalMemory, memoryOverallocation, totalDiskSpace, diskOverallocation, daemonPort, daemonSftpPort } = body

    // Debug: log the received body and check for missing fields
    const requiredFields = {
      name, ip, port, location, description, fqdn, scheme, behindProxy, maintenanceMode, publicNode, maxServers, totalMemory, memoryOverallocation, totalDiskSpace, diskOverallocation, daemonPort, daemonSftpPort
    }
    const missingFields = Object.entries(requiredFields)
      .filter(([k, v]) => v === undefined || v === null || v === '' || (typeof v === 'number' && isNaN(v)))
      .map(([k]) => k)
    console.log('[API] /api/admin/nodes POST body:', body)
    if (missingFields.length > 0) {
      console.warn('[API] /api/admin/nodes missing fields:', missingFields)
      return NextResponse.json(
        { error: 'All required fields must be provided', missingFields, received: body },
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

    // If you have an endpoint/url field, check for that instead of host
    // Uncomment and modify this section based on your actual schema
    /*
    const existingNodeByEndpoint = await prisma.node.findFirst({
      where: { endpoint: body.endpoint }
    })

    if (existingNodeByEndpoint) {
      return NextResponse.json(
        { error: 'Node with this endpoint already exists' }, 
        { status: 409 }
      )
    }
    */

    // Generate verification token for the node
    const verificationToken = crypto.randomBytes(32).toString('hex')

    const node = await prisma.node.create({
      data: {
        name,
        ip: body.ip, // or body.ip if you want to keep both
        location: body.location,
        scheme: body.scheme,
        behindProxy: body.behindProxy,
        maintenanceMode: body.maintenanceMode,
        publicNode: body.publicNode,
        totalMemory: body.totalMemory,
        memoryOverallocation: body.memoryOverallocation,
        totalDiskSpace: body.totalDiskSpace,
        diskOverallocation: body.diskOverallocation,
        daemonPort: body.daemonPort,
        daemonSftpPort: body.daemonSftpPort,
        verificationToken,
        status: 'OFFLINE', // Default status
        // Add any other fields from your schema as needed
      }
    })

    // Don't return the verification token in the response for security
    const { verificationToken: _, ...nodeResponse } = node

    return NextResponse.json(nodeResponse, { status: 201 })
  } catch (error) {
    console.error('Error creating node:', error)
    console.log('Error creating node:', error)
    return NextResponse.json(
      { error: 'Failed to create node' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/nodes/[id] - Update a node
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Node ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, location, maxServers, status } = body

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

    // Check if another node with same name exists (excluding current node)
    if (name && name !== existingNode.name) {
      const duplicateName = await prisma.node.findFirst({
        where: {
          name,
          id: { not: id }
        }
      })

      if (duplicateName) {
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
        ...(location && { location }),
        ...(maxServers && { maxServers }),
        ...(status && { status }),
        updatedAt: new Date()
      }
    })

    // Don't return the verification token
    const { verificationToken: _, ...nodeResponse } = updatedNode

    return NextResponse.json(nodeResponse)
  } catch (error) {
    console.error('Error updating node:', error)
    console.log('Error updating node:', error)
    return NextResponse.json(
      { error: 'Failed to update node' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/nodes/[id] - Delete a node
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

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
    if (existingNode.servers.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete node with active servers. Please migrate or delete servers first.'
        },
        { status: 409 }
      )
    }

    await prisma.node.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Node deleted successfully' })
  } catch (error) {
    console.error('Error deleting node:', error)
    console.log('Error deleting node:', error)
    return NextResponse.json(
      { error: 'Failed to delete node' },
      { status: 500 }
    )
  }
}