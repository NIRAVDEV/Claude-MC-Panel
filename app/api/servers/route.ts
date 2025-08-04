import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = "force-dynamic"; // Important for Vercel builds

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const servers = await prisma.server.findMany({
      where: {
        ownerId: session.user.id,
      },
    });

    return NextResponse.json(servers, { status: 200 });
  } catch (err) {
    console.error('Error in /api/servers:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}