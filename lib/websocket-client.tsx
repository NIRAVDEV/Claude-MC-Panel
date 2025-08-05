export interface WebSocketMessage {
  type: 'server_status' | 'console_output' | 'notification' | 'error' | 'authenticated' | 'subscribed';
  serverId?: string;
  data: any;
  timestamp: number;
}

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 5000;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;
  private url: string;
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map();
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = true;

  constructor(url: string = 'ws://localhost:3001') {
    this.url = url;
  }

  public connect(userId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.isConnecting = true;
      
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          // Authenticate if userId provided
          if (userId) {
            this.send({
              type: 'authenticate',
              userId,
              data: {},
              timestamp: Date.now()
            });
          }
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.ws = null;
          
          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect(userId);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private scheduleReconnect(userId?: string) {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect(userId).catch(console.error);
    }, this.reconnectInterval);
  }

  private handleMessage(message: WebSocketMessage) {
    const handlers = this.eventHandlers.get(message.type) || [];
    handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in WebSocket event handler:', error);
      }
    });

    // Also trigger 'message' event for all messages
    const messageHandlers = this.eventHandlers.get('message') || [];
    messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in WebSocket message handler:', error);
      }
    });
  }

  public on(event: string, handler: WebSocketEventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  public off(event: string, handler: WebSocketEventHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  public send(message: Omit<WebSocketMessage, 'timestamp'>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        ...message,
        timestamp: Date.now()
      }));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  public subscribeToServer(serverId: string) {
    this.send({
      type: 'subscribe_server',
      serverId,
      data: {}
    });
  }

  public sendServerCommand(serverId: string, command: string) {
    this.send({
      type: 'server_command',
      serverId,
      data: { command }
    });
  }

  public disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }
}

// Create a global instance
let globalWsClient: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
  if (!globalWsClient) {
    const wsUrl = process.env.NODE_ENV === 'development' 
      ? 'ws://localhost:3001' 
      : 'wss://your-websocket-service.com'; // Replace with your production WebSocket service
    
    globalWsClient = new WebSocketClient(wsUrl);
  }
  return globalWsClient;
}