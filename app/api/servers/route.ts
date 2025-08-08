import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
import { lucia } from '@/lib/lucia';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Lucia authentication
    const cookieStore = cookies()
    const sessionId = (await cookieStore).get(lucia.sessionCookieName)?.value ?? null
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = await lucia.validateSession(sessionId)
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const servers = await prisma.server.findMany({
      where: {
        userId: user.id,
      },
      include: {
        node: {
          select: {
            name: true,
            location: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ servers });
  } catch (error) {
    console.error('Error fetching servers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch servers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Lucia authentication
    const cookieStore = cookies()
    const sessionId = (await cookieStore).get(lucia.sessionCookieName)?.value ?? null
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user: sessionUser } = await lucia.validateSession(sessionId)
    
    if (!sessionUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { name, plan, nodeId } = body;

    if (!name || !plan || !nodeId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, plan, nodeId' },
        { status: 400 }
      );
    }

    // Check if user has enough credits
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { credits: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Simple pricing logic (can be enhanced)
    const planCosts = {
      starter: 100,
      basic: 200,
      premium: 500,
    };

    const cost = planCosts[plan as keyof typeof planCosts] || 100;

    if (user.credits < cost) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 400 }
      );
    }

    // Create server and deduct credits in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the server
      const server = await tx.server.create({
        data: {
          name,
          // plan,
          nodeId,
          userId: sessionUser.id,
          status: 'CREATING',
          port: Math.floor(Math.random() * (65535 - 25565) + 25565), // Random port
        },
        include: {
          node: {
            select: {
              name: true,
              location: true,
            },
          },
        },
      });

      // Deduct credits
      await tx.user.update({
        where: { id: sessionUser.id },
        data: {
          credits: {
            decrement: cost,
          },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: sessionUser.id,
          type: 'SERVER_COST',
          amount: cost,
          description: `Server creation: ${name}`,
          status: 'COMPLETED',
        },
      });

      return server;
    });

    return NextResponse.json({ server: result }, { status: 201 });
  } catch (error) {
    console.error('Error creating server:', error);
    return NextResponse.json(
      { error: 'Failed to create server' },
      { status: 500 }
    );
  }
}