import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin() // Only admins can see debug info

    const servers = await prisma.server.findMany({
      include: {
        node: true,
        user: {
          select: {
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const nodes = await prisma.node.findMany({
      include: {
        _count: {
          select: {
            servers: true
          }
        }
      },
      select: {
        id: true,
        name: true,
        status: true,
        url: true,
        _count: true
      }
    })

    return NextResponse.json({
      servers: servers.map(server => ({
        id: server.id,
        name: server.name,
        status: server.status,
        nodeId: server.nodeId,
        nodeName: server.node?.name || 'UNASSIGNED',
        nodeStatus: server.node?.status || 'MISSING',
        nodeUrl: server.node?.url || 'N/A',
        userEmail: server.user.email
      })),
      nodes: nodes.map(node => ({
        id: node.id,
        name: node.name,
        status: node.status,
        url: node.url,
        serverCount: node._count.servers
      })),
      summary: {
        totalServers: servers.length,
        serversWithoutNodes: servers.filter(s => !s.node).length,
        serversWithInactiveNodes: servers.filter(s => s.node?.status !== 'ONLINE').length,
        totalNodes: nodes.length,
        activeNodes: nodes.filter(n => n.status === 'ONLINE').length
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get debug info" },
      { status: 500 }
    )
  }
}