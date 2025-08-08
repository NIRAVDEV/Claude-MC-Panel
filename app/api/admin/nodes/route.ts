// ./app/api/admin/nodes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'
import { validateRequest } from '@/lib/auth-utils'

// --- Debug helpers ---------------------------------------------------------
// Enable by adding ?debug=1 to the request or setting process.env.NODE_DEBUG_AUTH=true
function shouldDebug(req: NextRequest) {
  return process.env.NODE_DEBUG_AUTH === 'true' || req.nextUrl.searchParams.get('debug') === '1'
}

function redact<T extends Record<string, any> | null | undefined>(obj: T) {
  if (!obj) return null
  const clone: Record<string, any> = {}
  for (const k of Object.keys(obj)) {
    if (['password', 'hashedPassword', 'token'].includes(k.toLowerCase())) continue
    clone[k] = obj[k]
  }
  return clone
}

function logPhase(phase: string, req: NextRequest, extra: Record<string, any> = {}) {
  if (!shouldDebug(req)) return
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  const traceId = req.headers.get('x-trace-id') || Math.random().toString(36).slice(2, 10)
  // eslint-disable-next-line no-console
  console.log('[ADMIN_NODES_DEBUG]', JSON.stringify({
    phase,
    traceId,
    time: new Date().toISOString(),
    method: req.method,
    path: req.nextUrl.pathname + req.nextUrl.search,
    ip,
    ...extra
  }))
}

async function captureAuthState(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const lucia = await validateRequest()
    return {
      nextAuth: session ? {
        user: session.user ? redact({
          id: session.user.id,
          email: session.user.email,
          role: (session.user as any).role,
          name: session.user.name
        }) : null
      } : null,
      lucia: lucia.user ? redact({
        id: lucia.user.id,
        email: lucia.user.email,
        role: (lucia.user as any).role,
        name: lucia.user.name
      }) : null
    }
  } catch (e:any) {
    return { error: e?.message || 'auth state error' }
  }
}

// GET /api/admin/nodes - Get all nodes
export async function GET(request: NextRequest) {
  try {
  // Unconditional trace to verify handler execution
  // eslint-disable-next-line no-console
  console.log('[ADMIN_NODES_TRACE] ENTER GET', request.nextUrl.pathname + request.nextUrl.search)
    logPhase('GET:start', request)
    const authState = await captureAuthState(request)
    logPhase('GET:auth_state', request, { authState })

    const userRole = (authState.lucia as any)?.role || (authState.nextAuth as any)?.user?.role
    if (!userRole || userRole !== 'ADMIN') {
      logPhase('GET:unauthorized', request, { reason: 'no admin role in lucia or next-auth' })
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

  logPhase('GET:success', request, { count: nodes.length })
  return NextResponse.json(nodes)
  } catch (error) {
  logPhase('GET:error', request, { error: (error as Error).message })
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
  // eslint-disable-next-line no-console
  console.log('[ADMIN_NODES_TRACE] ENTER POST', request.nextUrl.pathname + request.nextUrl.search)
    logPhase('POST:start', request)
    const authState = await captureAuthState(request)
    logPhase('POST:auth_state', request, { authState })
    const userRole = (authState.lucia as any)?.role || (authState.nextAuth as any)?.user?.role
    if (!userRole || userRole !== 'ADMIN') {
      logPhase('POST:unauthorized', request, { reason: 'no admin role in lucia or next-auth' })
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
  logPhase('POST:body', request, { keys: Object.keys(body || {}), missingFields })
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
      logPhase('POST:duplicate_name', request, { name })
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

  logPhase('POST:created', request, { nodeId: node.id, name: node.name })
  return NextResponse.json(nodeResponse, { status: 201 })
  } catch (error) {
  logPhase('POST:error', request, { error: (error as Error).message })
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
  // eslint-disable-next-line no-console
  console.log('[ADMIN_NODES_TRACE] ENTER PUT', request.nextUrl.pathname + request.nextUrl.search)
    logPhase('PUT:start', request)
    const authState = await captureAuthState(request)
    logPhase('PUT:auth_state', request, { authState })
    const userRole = (authState.lucia as any)?.role || (authState.nextAuth as any)?.user?.role
    if (!userRole || userRole !== 'ADMIN') {
      logPhase('PUT:unauthorized', request, { reason: 'no admin role in lucia or next-auth' })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      logPhase('PUT:missing_id', request)
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
      logPhase('PUT:not_found', request, { id })
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
        logPhase('PUT:duplicate_name', request, { name, id, duplicateId: duplicateName.id })
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

  logPhase('PUT:updated', request, { id: updatedNode.id })
  return NextResponse.json(nodeResponse)
  } catch (error) {
  logPhase('PUT:error', request, { error: (error as Error).message })
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
  // eslint-disable-next-line no-console
  console.log('[ADMIN_NODES_TRACE] ENTER DELETE', request.nextUrl.pathname + request.nextUrl.search)
    logPhase('DELETE:start', request)
    const authState = await captureAuthState(request)
    logPhase('DELETE:auth_state', request, { authState })
    const userRole = (authState.lucia as any)?.role || (authState.nextAuth as any)?.user?.role
    if (!userRole || userRole !== 'ADMIN') {
      logPhase('DELETE:unauthorized', request, { reason: 'no admin role in lucia or next-auth' })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      logPhase('DELETE:missing_id', request)
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
      logPhase('DELETE:not_found', request, { id })
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      )
    }

    // Check if node has active servers
    if (existingNode.servers.length > 0) {
      logPhase('DELETE:has_servers', request, { id, serverCount: existingNode.servers.length })
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

  logPhase('DELETE:deleted', request, { id })
  return NextResponse.json({ message: 'Node deleted successfully' })
  } catch (error) {
  logPhase('DELETE:error', request, { error: (error as Error).message })
    console.error('Error deleting node:', error)
    console.log('Error deleting node:', error)
    return NextResponse.json(
      { error: 'Failed to delete node' },
      { status: 500 }
    )
  }
}