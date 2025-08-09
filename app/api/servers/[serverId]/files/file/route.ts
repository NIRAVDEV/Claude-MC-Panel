// app/api/servers/[serverId]/files/file/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-utils"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ serverId: string }> }
) {
  try {
    const { user } = await requireAuth()
    const { serverId } = await context.params
    const { path, content = '' } = await request.json()
    
    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 })
    }
    
    const server = await prisma.server.findFirst({
      where: { id: serverId, userId: user.id },
      include: { node: true }
    })
    
    if (!server || !server.node) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 })
    }
    
    const response = await fetch(`http://${server.node.ip}:${server.node.port}/files/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${server.node.verificationToken}`,
      },
      body: JSON.stringify({
        serverName: server.name,
        userEmail: user.email || 'user@example.com',
        path,
        type: 'file',
        content,
        token: server.node.verificationToken
      })
    })
    
    if (!response.ok) {
      throw new Error(`Wings API Error: ${response.status} - ${await response.text()}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('File creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create file" },
      { status: 500 }
    )
  }
}
