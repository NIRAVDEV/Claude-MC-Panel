import { WebSocket } from 'ws';

export interface WebSocketMessage {
  type: 'server_status' | 'console_output' | 'notification' | 'error';
  serverId?: string;
  data: any;
  timestamp: number;
}

export interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  subscribedServers: Set<string>;
}

export class WebSocketServer {
  private static instance: WebSocketServer;
  private clients: Map<string, ConnectedClient> = new Map();
  private wss: any = null;

  private constructor() {}

  public static getInstance(): WebSocketServer {
    if (!WebSocketServer.instance) {
      WebSocketServer.instance = new WebSocketServer();
    }
    return WebSocketServer.instance;
  }

  public initialize(port: number = 3001) {
    if (typeof window !== 'undefined') {
      // Client-side, don't initialize server
      return;
    }

    try {
      // Only import ws on server-side
      const { WebSocketServer: WSS } = require('ws');
      
      this.wss = new WSS({ port });
      
      this.wss.on('connection', (ws: WebSocket, request: any) => {
        console.log('New WebSocket connection');
        
        ws.on('message', (message: Buffer) => {
          try {
            const data = JSON.parse(message.toString());
            this.handleMessage(ws, data);
          } catch (error) {
            console.error('Invalid WebSocket message:', error);
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: 'Invalid message format' },
              timestamp: Date.now()
            }));
          }
        });

        ws.on('close', () => {
          // Remove client from connected clients
          for (const [clientId, client] of this.clients.entries()) {
            if (client.ws === ws) {
              this.clients.delete(clientId);
              console.log(`Client ${clientId} disconnected`);
              break;
            }
          }
        });

        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
        });
      });

      console.log(`WebSocket server listening on port ${port}`);
    } catch (error) {
      console.error('Failed to initialize WebSocket server:', error);
    }
  }

  private handleMessage(ws: WebSocket, message: any) {
    const { type, userId, serverId, data } = message;

    switch (type) {
      case 'authenticate':
        if (userId) {
          this.clients.set(userId, {
            ws,
            userId,
            subscribedServers: new Set()
          });
          ws.send(JSON.stringify({
            type: 'authenticated',
            data: { userId },
            timestamp: Date.now()
          }));
        }
        break;

      case 'subscribe_server':
        const client = this.getClientByWs(ws);
        if (client && serverId) {
          client.subscribedServers.add(serverId);
          ws.send(JSON.stringify({
            type: 'subscribed',
            data: { serverId },
            timestamp: Date.now()
          }));
        }
        break;

      case 'server_command':
        this.handleServerCommand(ws, serverId, data);
        break;

      default:
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Unknown message type' },
          timestamp: Date.now()
        }));
    }
  }

  private getClientByWs(ws: WebSocket): ConnectedClient | undefined {
    for (const client of this.clients.values()) {
      if (client.ws === ws) {
        return client;
      }
    }
    return undefined;
  }

  private handleServerCommand(ws: WebSocket, serverId: string, data: any) {
    // Simulate server command execution
    const { command } = data;
    
    // In a real implementation, this would execute the command on the Docker container
    const response = {
      type: 'console_output',
      serverId,
      data: {
        output: `Executed command: ${command}`,
        timestamp: new Date().toISOString()
      },
      timestamp: Date.now()
    };

    ws.send(JSON.stringify(response));
  }

  public broadcastToServer(serverId: string, message: WebSocketMessage) {
    for (const client of this.clients.values()) {
      if (client.subscribedServers.has(serverId)) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('Failed to send message to client:', error);
        }
      }
    }
  }

  public broadcastToAll(message: WebSocketMessage) {
    for (const client of this.clients.values()) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to broadcast message:', error);
      }
    }
  }

  public updateServerStatus(serverId: string, status: string, data?: any) {
    this.broadcastToServer(serverId, {
      type: 'server_status',
      serverId,
      data: { status, ...data },
      timestamp: Date.now()
    });
  }

  public sendConsoleOutput(serverId: string, output: string) {
    this.broadcastToServer(serverId, {
      type: 'console_output',
      serverId,
      data: { output },
      timestamp: Date.now()
    });
  }

  public sendNotification(userId: string, message: string, type: 'info' | 'warning' | 'error' = 'info') {
    const client = this.clients.get(userId);
    if (client) {
      try {
        client.ws.send(JSON.stringify({
          type: 'notification',
          data: { message, notificationType: type },
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }
  }
}

// Export singleton instance
export const wsServer = WebSocketServer.getInstance();