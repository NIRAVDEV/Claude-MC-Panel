import { NextRequest } from 'next/server';
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import prisma from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth'; // your lucia helper

// This runs once on server startup
const wss = new WebSocketServer({ noServer: true });

// Connection handler for frontend
wss.on('connection', (client, req) => {
  client.on('message', async (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      if (data.action === 'subscribe_logs') {
        const user = await verifyAuthToken(data.authToken);
        if (!user) {
          client.send(JSON.stringify({ error: 'Unauthorized' }));
          client.close();
          return;
        }

        // Verify server ownership
        const server = await prisma.server.findUnique({
          where: { id: data.serverId },
          include: { node: true }
        });

        if (!server || server.userId !== user.id) {
          client.send(JSON.stringify({ error: 'Not your server' }));
          return;
        }

        // Connect to Agent WS
        const agentUrl = `${server.node.scheme}://${server.node.ip}:${server.node.daemonPort}/ws/console`;
        const agentWs = new WebSocket(agentUrl, {
          headers: { 'x-verification-token': server.node.verificationToken }
        });

        agentWs.on('message', (logData) => {
          client.send(JSON.stringify({ type: 'log', data: logData.toString() }));
        });

        agentWs.on('close', () => client.close());

      }
    } catch (err) {
      console.error(err);
    }
  });
});

export const config = {
  runtime: 'nodejs',
};

export function GET(req: NextRequest) {
  const { socket } = (req as any);
  wss.handleUpgrade(req, socket, Buffer.alloc(0), (ws) => {
    wss.emit('connection', ws, req);
  });
}