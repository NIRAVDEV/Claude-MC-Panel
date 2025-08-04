// app/api/credits/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TransactionType } from '@prisma/client' // ✅ Add this line

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, amount } = body

   const { campaignId } = await req.json();

const campaign = await prisma.adCampaign.findUnique({
  where: { id: campaignId },
});

if (!campaign) {
  return new Response("Campaign not found", { status: 404 });
}

    let credits = 0
    let description = ''

    switch (type) {
      case 'ad_view':
        credits = Math.floor(Math.random() * 6) + 5 // 5-10 credits
        description = 'Ad view reward'
        break
      case 'link_click':
        credits = Math.floor(Math.random() * 4) + 2 // 2-5 credits
        description = 'Link click reward'
        break
      default:
        return NextResponse.json({ error: 'Invalid credit type' }, { status: 400 })
    }

    // Update user credits
    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        credits: {
          increment: credits
        }
      }
    })

    // Record transaction
    await prisma.transaction.create({
  data: {
    userId: user.id,
    type: type === 'ad_view' ? TransactionType.EARNED_AD : TransactionType.EARNED_TASK,
    amount: 0,
    credits,
    status: 'COMPLETED',
    description
  }
})

    // Record ad view
    const existingInteraction = await prisma.userAdInteraction.findUnique({
  where: {
    userId_campaignId: {
      userId: user.id,
      campaignId: campaign.id,
    },
  },
});

if (existingInteraction) {
  return new Response("You already claimed this campaign!", { status: 400 });
}

// Give credits & create record
await prisma.userAdInteraction.create({
  data: {
    userId: user.id,
    campaignId: campaign.id,
    creditsEarned: campaign.credits,
  },
});

// Optionally: update user credits
await prisma.user.update({
  where: { id: user.id },
  data: { credits: { increment: campaign.credits } },
});

    return NextResponse.json({ credits: user.credits, earned: credits })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to award credits' }, { status: 500 })
  }
}