import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        credits: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get recent transactions
    const transactions = await prisma.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({ 
      credits: user.credits,
      transactions 
    });
  } catch (error) {
    console.error('Error fetching credits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, amount, description } = body;

    if (!action || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: action, amount' },
        { status: 400 }
      );
    }

    if (action !== 'earn' && action !== 'purchase') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "earn" or "purchase"' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    // Update user credits and create transaction in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user credits
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          credits: {
            increment: amount,
          },
        },
        select: {
          credits: true,
        },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: session.user.id,
          type: 'CREDIT',
          amount,
          description: description || `Credits ${action}ed`,
          status: 'COMPLETED',
        },
      });

      return { credits: updatedUser.credits, transaction };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error updating credits:', error);
    return NextResponse.json(
      { error: 'Failed to update credits' },
      { status: 500 }
    );
  }
}