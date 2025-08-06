import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (be careful in production!)
  await prisma.transaction.deleteMany();
  await prisma.server.deleteMany();
  await prisma.node.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Cleared existing data');

  // Create demo users (with passwordHash if your schema requires it)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@minecrafthost.com',
      name: 'Admin User',
      role: 'ADMIN',
      credits: 10000,
      passwordHash: await bcrypt.hash('adminpassword', 10),
    },
  });

  const regularUser = await prisma.user.create({
    data: {
      email: 'user@minecrafthost.com',
      name: 'Regular User',
      role: 'USER',
      credits: 500,
      passwordHash: await bcrypt.hash('userpassword', 10),
    },
  });

  console.log('👥 Created demo users');

  // Create demo nodes
  const nodes = await Promise.all([
    prisma.node.create({
      data: {
        name: 'US-East-1',
        host: '192.168.1.100',
        maxRam: 16384,
        maxDisk : 500,
        // usedRam: 2048,
        // usedStorage: 50,
        // status: 'ONLINE',
      },
    }),
    prisma.node.create({
      data: {
        name: 'EU-West-1',
        host: '192.168.1.101',
        maxRam: 12288,
        maxDisk : 300,
        // usedRam: 1024,
        // usedStorage: 30,
        // status: 'ONLINE',
      },
    }),
    prisma.node.create({
      data: {
        name: 'Asia-Pacific',
        host: '192.168.1.102',
        maxRam: 8192,
        maxDisk : 200,
        // usedRam: 512,
        // usedStorage: 20,
        // status: 'MAINTENANCE',
      },
    }),
  ]);

  console.log('🖥️  Created demo nodes');

  // Create demo servers
  const servers = await Promise.all([
    prisma.server.create({
      data: {
        name: 'My Survival Server',
        status: 'RUNNING',
        port: 25565,
        userId: regularUser.id,
        nodeId: nodes[0].id,
        // dockerContainerId: 'container-' + Math.random().toString(36).substr(2, 9),
        version: '1.20.1',
        // plugins: ['EssentialsX', 'WorldEdit', 'LuckPerms'],
      },
    }),
    prisma.server.create({
      data: {
        name: 'Creative Build Server',
        status: 'STOPPED',
        port: 25566,
        userId: regularUser.id,
        nodeId: nodes[1].id,
        // dockerContainerId: 'container-' + Math.random().toString(36).substr(2, 9),
        version: '1.20.1',
        // plugins: ['WorldEdit', 'FastAsyncWorldEdit', 'VoxelSniper'],
      },
    }),
    prisma.server.create({
      data: {
        name: 'Admin Test Server',
        status: 'RUNNING',
        port: 25567,
        userId: adminUser.id,
        nodeId: nodes[0].id,
        // dockerContainerId: 'container-' + Math.random().toString(36).substr(2, 9),
        version: '1.19.4',
        // plugins: ['Essentials'],
      },
    }),
  ]);

  console.log('🎮 Created demo servers');

  // Create demo transactions
  const transactions = await Promise.all([
    prisma.transaction.create({
      data: {
        userId: regularUser.id,
        type: 'TASK_REWARD',
        amount: 500,
        description: 'Welcome bonus',
        // status: 'COMPLETED',
      },
    }),
    prisma.transaction.create({
      data: {
        userId: regularUser.id,
        type: 'SERVER_PAYMENT',
        amount: 200,
        description: 'Server creation: My Survival Server',
        // status: 'COMPLETED',
      },
    }),
    prisma.transaction.create({
      data: {
        userId: regularUser.id,
        type: 'TASK_REWARD',
        amount: 100,
        description: 'Completed survey',
        // status: 'COMPLETED',
      },
    }),
    prisma.transaction.create({
      data: {
        userId: adminUser.id,
        type: 'REFUND',
        amount: 10000,
        description: 'Admin credits',
        // status: 'COMPLETED',
      },
    }),
  ]);

  console.log('💰 Created demo transactions');

  console.log('✅ Database seeded successfully!');
  console.log('\n🔑 Demo Accounts:');
  console.log('Admin: admin@minecrafthost.com / adminpassword');
  console.log('User:  user@minecrafthost.com / userpassword');
  console.log('\n🚀 You can now start the application!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  console.log('🌱 Database seed script completed.');