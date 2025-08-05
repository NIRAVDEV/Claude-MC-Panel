import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Starting database seed via API...');

    // Clear existing data (be careful in production!)
    await prisma.transaction.deleteMany();
    await prisma.server.deleteMany();
    await prisma.node.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    console.log('🗑️  Cleared existing data');

    // Create demo users (without hashed passwords - will be handled by auth system)
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@minecrafthost.com',
        name: 'Admin User',
        role: 'ADMIN',
        credits: 10000,
      },
    });

    const regularUser = await prisma.user.create({
      data: {
        email: 'user@minecrafthost.com',
        name: 'Regular User',
        role: 'USER',
        credits: 500,
      },
    });

    console.log('👥 Created demo users');

    // Create demo nodes (remove location field)
    const nodes = await Promise.all([
      prisma.node.create({
        data: {
          name: 'US-East-1',
          ipAddress: '192.168.1.100',
          maxMemory: 16384,
          maxStorage: 500,
          maxServers: 20,
          usedMemory: 2048,
          usedStorage: 50,
          status: 'ONLINE',
        },
      }),
      prisma.node.create({
        data: {
          name: 'EU-West-1',
          ipAddress: '192.168.1.101',
          maxMemory: 12288,
          maxStorage: 300,
          maxServers: 15,
          usedMemory: 1024,
          usedStorage: 30,
          status: 'ONLINE',
        },
      }),
      prisma.node.create({
        data: {
          name: 'Asia-Pacific',
          ipAddress: '192.168.1.102',
          maxMemory: 8192,
          maxStorage: 200,
          maxServers: 10,
          usedMemory: 512,
          usedStorage: 20,
          status: 'MAINTENANCE',
        },
      }),
    ]);

    console.log('🖥️  Created demo nodes');

    // Create demo servers (remove plan field)
    const servers = await Promise.all([
      prisma.server.create({
        data: {
          name: 'My Survival Server',
          status: 'RUNNING',
          port: 25565,
          userId: regularUser.id,
          nodeId: nodes[0].id,
          dockerContainerId: 'container-' + Math.random().toString(36).substr(2, 9),
          version: '1.20.1',
          plugins: ['EssentialsX', 'WorldEdit', 'LuckPerms'],
        },
      }),
      prisma.server.create({
        data: {
          name: 'Creative Build Server',
          status: 'STOPPED',
          port: 25566,
          userId: regularUser.id,
          nodeId: nodes[1].id,
          dockerContainerId: 'container-' + Math.random().toString(36).substr(2, 9),
          version: '1.20.1',
          plugins: ['WorldEdit', 'FastAsyncWorldEdit', 'VoxelSniper'],
        },
      }),
      prisma.server.create({
        data: {
          name: 'Admin Test Server',
          status: 'RUNNING',
          port: 25567,
          userId: adminUser.id,
          nodeId: nodes[0].id,
          dockerContainerId: 'container-' + Math.random().toString(36).substr(2, 9),
          version: '1.19.4',
          plugins: ['Essentials'],
        },
      }),
    ]);

    console.log('🎮 Created demo servers');

    // Create demo transactions (fix transaction types)
    const transactions = await Promise.all([
      prisma.transaction.create({
        data: {
          userId: regularUser.id,
          type: 'EARN',
          amount: 500,
          description: 'Welcome bonus',
          status: 'COMPLETED',
        },
      }),
      prisma.transaction.create({
        data: {
          userId: regularUser.id,
          type: 'SPEND',
          amount: 200,
          description: 'Server creation: My Survival Server',
          status: 'COMPLETED',
        },
      }),
      prisma.transaction.create({
        data: {
          userId: regularUser.id,
          type: 'EARN',
          amount: 100,
          description: 'Completed survey',
          status: 'COMPLETED',
        },
      }),
      prisma.transaction.create({
        data: {
          userId: adminUser.id,
          type: 'EARN',
          amount: 10000,
          description: 'Admin credits',
          status: 'COMPLETED',
        },
      }),
    ]);

    console.log('💰 Created demo transactions');

    // Skip server logs since the model doesn't exist
    console.log('📝 Skipped server logs (model not in schema)');

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      data: {
        users: {
          admin: { email: 'admin@minecrafthost.com', note: 'Set up password via auth system' },
          user: { email: 'user@minecrafthost.com', note: 'Set up password via auth system' }
        },
        counts: {
          users: 2,
          nodes: nodes.length,
          servers: servers.length,
          transactions: transactions.length
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Database seed endpoint',
    usage: 'Send a POST request to this endpoint to seed the database',
    demo_accounts: {
      admin: { email: 'admin@minecrafthost.com', note: 'Set up password via auth system' },
      user: { email: 'user@minecrafthost.com', note: 'Set up password via auth system' }
    }
  });
}