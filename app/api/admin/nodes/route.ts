import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const nodes = await prisma.node.findMany({
      include: {
        _count: {
          select: {
            servers: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ nodes });
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nodes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, 
      location, 
      ipAddress, 
      maxMemory = 8192, 
      maxStorage = 100, 
      maxServers = 10 
    } = body;

    if (!name || !location || !ipAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: name, location, ipAddress' },
        { status: 400 }
      );
    }

    // Check if IP address is already used
    const existingNode = await prisma.node.findUnique({
      where: { ipAddress },
    });

    if (existingNode) {
      return NextResponse.json(
        { error: 'Node with this IP address already exists' },
        { status: 400 }
      );
    }

    const node = await prisma.node.create({
      data: {
        name,
        location,
        ipAddress,
        maxMemory,
        maxStorage,
        maxServers,
        status: 'ONLINE',
        usedMemory: 0,
        usedStorage: 0,
      },
      include: {
        _count: {
          select: {
            servers: true,
          },
        },
      },
    });

    return NextResponse.json({ node }, { status: 201 });
  } catch (error) {
    console.error('Error creating node:', error);
    return NextResponse.json(
      { error: 'Failed to create node' },
      { status: 500 }
    );
  }
}