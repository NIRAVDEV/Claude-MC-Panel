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
const {
  name,
  ip,
  port,
  token,
  region,
  maxRam,
  maxStorage
}: {
  name: string,
  ip: string,
  port: number | string,
  token: string,
  region: string,
  maxRam: number | string,
  maxStorage: number | string
} = body

const node = await prisma.node.create({
  data: {
    name,
    ip,
    port: typeof port === "string" ? parseInt(port) : port,
    token,
    region,
    maxRam: typeof maxRam === "string" ? parseInt(maxRam) : maxRam,
    maxStorage: typeof maxStorage === "string" ? parseInt(maxStorage) : maxStorage
  }
})

    return NextResponse.json(node)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create node' }, { status: 500 })
  }
}
