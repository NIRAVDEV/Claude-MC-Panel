import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-utils"

async function sendWingsRequest(
  nodeIp: string,
  nodePort: number,
  nodeToken: string,
  endpoint: string,
  method: string = 'GET',
  data?: any
) {
  const url = `http://${nodeIp}:${nodePort}${endpoint}`
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${nodeToken}`,
    }
  }
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data)
  }
  
  const response = await fetch(url, options)
  
  if (!response.ok) {
    throw new Error(`Wings API Error: ${response.status} - ${await response.text()}`)
  }
  
  return response
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ serverId: string }> }
) {
  try {
    const { user } = await requireAuth()
    const { serverId } = await context.params
    
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path') || '/'
    
    // Get server with node info
    const server = await prisma.server.findFirst({
      where: { id: serverId, userId: user.id },
      include: { node: true }
    })
    
    if (!server || !server.node) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 })
    }
    
    // Call Wings agent to list files
    const response = await sendWingsRequest(
      server.node.ip,
      server.node.port,
      server.node.verificationToken,
      `/files/list?serverName=${encodeURIComponent(server.name)}&userEmail=${encodeURIComponent(user.email || 'user@example.com')}&path=${encodeURIComponent(path)}`
    )
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('File listing error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list files" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ serverId: string }> }
) {
  try {
    const { user } = await requireAuth()
    const { serverId } = await context.params
    const { path } = await request.json()
    
    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 })
    }
    
    // Get server with node info
    const server = await prisma.server.findFirst({
      where: { id: serverId, userId: user.id },
      include: { node: true }
    })
    
    if (!server || !server.node) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 })
    }
    
    // Call Wings agent to delete file
    const response = await sendWingsRequest(
      server.node.ip,
      server.node.port,
      server.node.verificationToken,
      `/files/delete`,
      'POST',
      {
        serverName: server.name,
        userEmail: user.email || 'user@example.com',
        path,
        token: server.node.verificationToken
      }
    )
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('File deletion error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete file" },
      { status: 500 }
    )
  }
}