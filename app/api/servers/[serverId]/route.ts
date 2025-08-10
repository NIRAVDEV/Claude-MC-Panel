// app/api/servers/[serverId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { lucia } from '@/lib/lucia'
import { cookies } from 'next/headers'

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
          status: true
        }
      },
      user: {
        select: {
          name: true,
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

// GET single server details
// Next.js route handler signature simplified to only accept request; derive serverId from URL
export async function GET(request: NextRequest) {
  try {
    // Extract serverId from pathname (supports nested route folder)
    const url = new URL(request.url)
    const parts = url.pathname.split('/')
    const serversIdx = parts.findIndex(p => p === 'servers')
    const serverId = serversIdx !== -1 ? parts[serversIdx + 1] : undefined
    if (!serverId) {
      return NextResponse.json(
        { success: false, error: 'Missing serverId in URL' },
        { status: 400 }
      )
    }
    // Validate authentication
  const cookieStore = cookies()
  const sessionId = (await cookieStore).get(lucia.sessionCookieName)?.value ?? null
    console.log('[API/servers/[serverId]] sessionId:', sessionId)
    if (!sessionId) {
      console.warn('[API/servers/[serverId]] No session cookie found')
      return NextResponse.json(
        { success: false, error: 'Not authenticated', debug: { sessionId } },
        { status: 401 }
      )
    }

    const { user } = await lucia.validateSession(sessionId)
    console.log('[API/servers/[serverId]] lucia.validateSession result:', user)
    if (!user) {
      console.warn('[API/servers/[serverId]] Invalid session for sessionId:', sessionId)
      return NextResponse.json(
        { success: false, error: 'Invalid session', debug: { sessionId } },
        { status: 401 }
      )
    }

    // Get server with validation
    const server = await validateServerAccess(serverId, user.id)

    // Return server details
    return NextResponse.json({
      success: true,
      server: {
        id: server.id,
        name: server.name,
        software: server.software,
        ram: server.ram,
        storage: server.storage,
        status: server.status,
        containerId: server.containerId,
        node: server.node,
        createdAt: server.createdAt.toISOString(),
        updatedAt: server.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Get server API error:', error)
    
    if (error instanceof Error && error.message === 'Server not found or access denied') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// PUT - Update server settings
export async function PUT(request: NextRequest) {
  try {
    // serverId from params context previously; now extract from URL
    const url = new URL(request.url)
    const parts = url.pathname.split('/')
    const serversIdx = parts.findIndex(p => p === 'servers')
    const serverId = serversIdx !== -1 ? parts[serversIdx + 1] : undefined
    if (!serverId) {
      return NextResponse.json(
        { success: false, error: 'Missing serverId in URL' },
        { status: 400 }
      )
    }
    const body = await request.json()

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
    await validateServerAccess(serverId, user.id)

    // Extract updatable fields
    const { name } = body
    const updateData: any = { updatedAt: new Date() }

    if (name && typeof name === 'string' && name.trim().length > 0) {
      // Check if new name is unique for this user
      const existingServer = await prisma.server.findFirst({
        where: {
          name: name.trim(),
          userId: user.id,
          id: { not: serverId }
        }
      })

      if (existingServer) {
        return NextResponse.json(
          { success: false, error: 'Server name already exists' },
          { status: 409 }
        )
      }

      updateData.name = name.trim()
    }

    // Update server
    const updatedServer = await prisma.server.update({
      where: { id: serverId },
      data: updateData,
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
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Server updated successfully',
      server: {
        id: updatedServer.id,
        name: updatedServer.name,
        software: updatedServer.software,
        ram: updatedServer.ram,
        storage: updatedServer.storage,
        status: updatedServer.status,
        containerId: updatedServer.containerId,
        node: updatedServer.node,
        createdAt: updatedServer.createdAt.toISOString(),
        updatedAt: updatedServer.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Update server API error:', error)
    
    if (error instanceof Error && error.message === 'Server not found or access denied') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete server (with Wings cleanup)
export async function DELETE(request: NextRequest) {
  try {
    // Extract serverId from URL
    const url = new URL(request.url)
    const parts = url.pathname.split('/')
    const serversIdx = parts.findIndex(p => p === 'servers')
    const serverId = serversIdx !== -1 ? parts[serversIdx + 1] : undefined
    if (!serverId) {
      return NextResponse.json(
        { success: false, error: 'Missing serverId in URL' },
        { status: 400 }
      )
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

    // Get server with validation
    const server = await validateServerAccess(serverId, user.id)

    // TODO: Add Wings agent integration to delete container
    // For now, we'll just delete from database
    // In production, you would:
    // 1. Stop the container if running
    // 2. Remove the container
    // 3. Clean up server files
    // 4. Then delete from database

    // Delete server from database
    await prisma.$transaction(async (tx: { transaction: { deleteMany: (arg0: { where: { id: string } }) => any }; server: { delete: (arg0: { where: { id: string } }) => any } }) => {
      // Delete related records first (if any)
      await tx.transaction.deleteMany({
        where: { id: serverId }
      })

      // Delete the server
      await tx.server.delete({
        where: { id: serverId }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Server deleted successfully'
    })

  } catch (error) {
    console.error('Delete server API error:', error)
    
    if (error instanceof Error && error.message === 'Server not found or access denied') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}