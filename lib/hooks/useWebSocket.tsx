import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketClient, WebSocketMessage, getWebSocketClient } from '@/lib/websocket-client';

export interface UseWebSocketOptions {
  userId?: string;
  autoConnect?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  connectionState: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (message: Omit<WebSocketMessage, 'timestamp'>) => void;
  subscribeToServer: (serverId: string) => void;
  sendServerCommand: (serverId: string, command: string) => void;
  lastMessage: WebSocketMessage | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    userId,
    autoConnect = true,
    onMessage,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const wsClient = useRef<WebSocketClient | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebSocket client
  useEffect(() => {
    wsClient.current = getWebSocketClient();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Set up event handlers
  useEffect(() => {
    if (!wsClient.current) return;

    const client = wsClient.current;

    // Connection state handler
    const handleConnectionChange = () => {
      const state = client.getConnectionState();
      setConnectionState(state);
      setIsConnected(state === 'connected');
      
      if (state === 'connected') {
        onConnect?.();
      } else if (state === 'disconnected') {
        onDisconnect?.();
      }
    };

    // Message handler
    const handleMessage = (message: WebSocketMessage) => {
      setLastMessage(message);
      onMessage?.(message);
    };

    // Set up event listeners
    client.on('message', handleMessage);
    client.on('authenticated', handleConnectionChange);
    client.on('error', (message) => {
      onError?.(new Event(message.data.message || 'WebSocket error'));
    });

    // Check connection state periodically
    const stateInterval = setInterval(handleConnectionChange, 1000);

    return () => {
      clearInterval(stateInterval);
      client.off('message', handleMessage);
    };
  }, [onMessage, onConnect, onDisconnect, onError]);

  // Auto-connect
  useEffect(() => {
    if (autoConnect && wsClient.current && !isConnected) {
      connect();
    }
  }, [autoConnect]);

  const connect = useCallback(async () => {
    if (!wsClient.current) return;
    
    try {
      await wsClient.current.connect(userId);
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      onError?.(error as Event);
    }
  }, [userId, onError]);

  const disconnect = useCallback(() => {
    if (wsClient.current) {
      wsClient.current.disconnect();
    }
  }, []);

  const send = useCallback((message: Omit<WebSocketMessage, 'timestamp'>) => {
    if (wsClient.current) {
      wsClient.current.send(message);
    }
  }, []);

  const subscribeToServer = useCallback((serverId: string) => {
    if (wsClient.current) {
      wsClient.current.subscribeToServer(serverId);
    }
  }, []);

  const sendServerCommand = useCallback((serverId: string, command: string) => {
    if (wsClient.current) {
      wsClient.current.sendServerCommand(serverId, command);
    }
  }, []);

  return {
    isConnected,
    connectionState,
    connect,
    disconnect,
    send,
    subscribeToServer,
    sendServerCommand,
    lastMessage,
  };
}

// Specialized hook for server console
export function useServerConsole(serverId: string) {
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);

  const { isConnected, subscribeToServer, sendServerCommand } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'console_output' && message.serverId === serverId) {
        setConsoleOutput(prev => [...prev, message.data.output]);
        setIsExecutingCommand(false);
      }
    },
  });

  useEffect(() => {
    if (isConnected) {
      subscribeToServer(serverId);
    }
  }, [isConnected, serverId, subscribeToServer]);

  const executeCommand = useCallback((command: string) => {
    if (isConnected && command.trim()) {
      setIsExecutingCommand(true);
      setConsoleOutput(prev => [...prev, `> ${command}`]);
      sendServerCommand(serverId, command);
    }
  }, [isConnected, serverId, sendServerCommand]);

  const clearConsole = useCallback(() => {
    setConsoleOutput([]);
  }, []);

  return {
    consoleOutput,
    executeCommand,
    clearConsole,
    isExecutingCommand,
    isConnected,
  };
}