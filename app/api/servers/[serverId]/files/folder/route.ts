// app/api/servers/[serverId]/files/folder/route.ts
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

export async function POST(
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

    // Validate folder name (no special characters that could cause issues)
    const folderName = path.split('/').pop()
    if (!folderName || !/^[a-zA-Z0-9_.-]+$/.test(folderName)) {
      return NextResponse.json({ 
        error: "Invalid folder name. Use only letters, numbers, underscores, dots, and hyphens." 
      }, { status: 400 })
    }
    
    const server = await prisma.server.findFirst({
      where: { id: serverId, userId: user.id },
      include: { node: true }
    })
    
    if (!server || !server.node) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 })
    }
    
    const response = await sendWingsRequest(
      server.node.ip,
      server.node.port,
      server.node.verificationToken,
      `/files/create`,
      'POST',
      {
        serverName: server.name,
        userEmail: user.email || 'user@example.com',
        path,
        type: 'directory',
        token: server.node.verificationToken
      }
    )
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Folder creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create folder" },
      { status: 500 }
    )
  }
}