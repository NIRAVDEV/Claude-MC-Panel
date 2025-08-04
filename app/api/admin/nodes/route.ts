// app/api/admin/nodes/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const token = crypto.randomBytes(32).toString("hex");

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const nodes = await prisma.node.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(nodes)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch nodes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, ip, port, token, region, maxRam, maxStorage } = body

    const node = await prisma.node.create({
      data: {
        name,
        ip,
        port: parseInt(port),
        token: parseString(token),
        region,
        maxRam: parseInt(maxRam),
        maxStorage: parseInt(maxStorage),
      }
    })

    return NextResponse.json(node)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create node' }, { status: 500 })
  }
}
