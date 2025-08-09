// websocket-bridge.js
const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    // Bridge server settings (what your frontend connects to)
    bridge: {
        port: 8444,
        host: '0.0.0.0'
    },
    
    // Wings agent settings (what we proxy to)
    wings: {
        host: 'localhost',
        port: 8080, // Your Wings agent port
        protocol: 'ws' // Wings uses plain WebSocket
    },
    
    // SSL settings for the bridge
    ssl: {
        enabled: true,
        cert: './certs/cert.pem',
        key: './certs/key.pem'
    }
};

// Create SSL certificates if they don't exist
function ensureSSLCerts() {
    const certPath = path.resolve(CONFIG.ssl.cert);
    const keyPath = path.resolve(CONFIG.ssl.key);
    
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        console.log('🔐 SSL certificates not found. Creating self-signed certificates...');
        
        const { execSync } = require('child_process');
        
        // Create certs directory
        const certsDir = path.dirname(certPath);
        if (!fs.existsSync(certsDir)) {
            fs.mkdirSync(certsDir, { recursive: true });
        }
        
        try {
            // Generate self-signed certificate
            execSync(`openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=WebSocketBridge/CN=localhost"`, {
                stdio: 'inherit'
            });
            console.log('✅ SSL certificates created successfully');
        } catch (error) {
            console.error('❌ Failed to create SSL certificates:', error.message);
            console.log('📝 Please install OpenSSL or create certificates manually');
            process.exit(1);
        }
    }
}

// Enhanced logging
function log(level, message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const levelEmoji = {
        'info': '📘',
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'debug': '🔍'
    };
    
    console.log(`${timestamp} ${levelEmoji[level] || '📘'} ${message}`);
    if (data) {
        console.log('   Data:', JSON.stringify(data, null, 2));
    }
}

// Connection tracking
const connections = new Map();
let connectionId = 0;

function createBridgeServer() {
    let server;
    let wss;

    if (CONFIG.ssl.enabled) {
        ensureSSLCerts();
        
        // Create HTTPS server with SSL
        const serverOptions = {
            cert: fs.readFileSync(CONFIG.ssl.cert),
            key: fs.readFileSync(CONFIG.ssl.key)
        };
        
        server = https.createServer(serverOptions);
        wss = new WebSocket.Server({ server });
        
        log('info', `🔒 WSS Bridge starting on port ${CONFIG.bridge.port} with SSL`);
    } else {
        // Create plain WebSocket server
        wss = new WebSocket.Server({ 
            port: CONFIG.bridge.port, 
            host: CONFIG.bridge.host 
        });
        
        log('info', `📡 WS Bridge starting on port ${CONFIG.bridge.port} without SSL`);
    }

    wss.on('connection', function connection(clientWs, req) {
        const connId = ++connectionId;
        const clientInfo = {
            id: connId,
            ip: req.socket.remoteAddress,
            userAgent: req.headers['user-agent'] || 'Unknown'
        };

        log('success', `New client connection #${connId}`, clientInfo);
        connections.set(connId, { client: clientWs, wings: null });

        // Handle client messages
        clientWs.on('message', function incoming(data) {
            try {
                const message = JSON.parse(data.toString());
                log('debug', `Client #${connId} message:`, message);

                const conn = connections.get(connId);
                
                // If this is the initial connection message, establish Wings connection
                if (message.action === 'connect' && !conn.wings) {
                    log('info', `Establishing Wings connection for client #${connId}`);
                    connectToWings(connId, message);
                } else if (conn.wings && conn.wings.readyState === WebSocket.OPEN) {
                    // Forward message to Wings
                    conn.wings.send(data);
                    log('debug', `Forwarded message from client #${connId} to Wings`);
                } else {
                    log('warning', `No Wings connection for client #${connId}, queuing message`);
                    // You could implement message queuing here if needed
                }
            } catch (error) {
                log('error', `Failed to parse message from client #${connId}:`, error.message);
                clientWs.send(JSON.stringify({
                    type: 'error',
                    message: '❌ Invalid message format'
                }));
            }
        });

        // Handle client disconnection
        clientWs.on('close', function close(code, reason) {
            log('info', `Client #${connId} disconnected`, { code, reason: reason.toString() });
            
            const conn = connections.get(connId);
            if (conn && conn.wings) {
                conn.wings.close();
                log('info', `Closed Wings connection for client #${connId}`);
            }
            
            connections.delete(connId);
        });

        // Handle client errors
        clientWs.on('error', function error(err) {
            log('error', `Client #${connId} error:`, err.message);
        });

        // Send initial connection confirmation
        clientWs.send(JSON.stringify({
            type: 'bridge_connected',
            message: `🌉 Connected to WebSocket Bridge #${connId}`,
            timestamp: new Date().toISOString()
        }));
    });

    // Start the server
    if (CONFIG.ssl.enabled && server) {
        server.listen(CONFIG.bridge.port, CONFIG.bridge.host, () => {
            log('success', `🚀 WSS Bridge running on https://${CONFIG.bridge.host}:${CONFIG.bridge.port}`);
            log('info', `🔗 Proxying to Wings at ws://${CONFIG.wings.host}:${CONFIG.wings.port}`);
        });
    } else if (!CONFIG.ssl.enabled) {
        log('success', `🚀 WS Bridge running on ws://${CONFIG.bridge.host}:${CONFIG.bridge.port}`);
        log('info', `🔗 Proxying to Wings at ws://${CONFIG.wings.host}:${CONFIG.wings.port}`);
    }

    return wss;
}

function connectToWings(connId, initMessage) {
    const wingsUrl = `${CONFIG.wings.protocol}://${CONFIG.wings.host}:${CONFIG.wings.port}/ws/console`;
    
    log('info', `Connecting to Wings for client #${connId}:`, wingsUrl);
    
    const wingsWs = new WebSocket(wingsUrl);
    const conn = connections.get(connId);
    
    if (!conn) {
        log('error', `Connection #${connId} not found`);
        return;
    }

    wingsWs.on('open', function open() {
        log('success', `Wings connection established for client #${connId}`);
        
        // Store Wings WebSocket
        conn.wings = wingsWs;
        
        // Send initial connection message to Wings
        wingsWs.send(JSON.stringify(initMessage));
        
        // Notify client of successful connection
        conn.client.send(JSON.stringify({
            type: 'wings_connected',
            message: '✅ Connected to Wings agent',
            timestamp: new Date().toISOString()
        }));
    });

    wingsWs.on('message', function incoming(data) {
        // Forward all Wings messages to client
        if (conn.client.readyState === WebSocket.OPEN) {
            conn.client.send(data);
            log('debug', `Forwarded message from Wings to client #${connId}`);
        }
    });

    wingsWs.on('close', function close(code, reason) {
        log('warning', `Wings connection closed for client #${connId}`, { code, reason });
        
        // Notify client about Wings disconnection
        if (conn.client.readyState === WebSocket.OPEN) {
            conn.client.send(JSON.stringify({
                type: 'wings_disconnected',
                message: `⚠️ Wings connection lost (${code}: ${reason})`,
                timestamp: new Date().toISOString()
            }));
        }
        
        conn.wings = null;
    });

    wingsWs.on('error', function error(err) {
        log('error', `Wings connection error for client #${connId}:`, err.message);
        
        // Notify client about Wings error
        if (conn.client.readyState === WebSocket.OPEN) {
            conn.client.send(JSON.stringify({
                type: 'wings_error',
                message: `❌ Wings connection error: ${err.message}`,
                timestamp: new Date().toISOString()
            }));
        }
    });
}

// Health check endpoint (optional)
function createHealthServer() {
    const http = require('http');
    
    const healthServer = http.createServer((req, res) => {
        if (req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                uptime: process.uptime(),
                connections: connections.size,
                timestamp: new Date().toISOString()
            }));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });
    
    healthServer.listen(CONFIG.bridge.port + 1, () => {
        log('info', `🏥 Health check available at http://localhost:${CONFIG.bridge.port + 1}/health`);
    });
}

// Graceful shutdown
process.on('SIGINT', () => {
    log('info', '🛑 Shutting down WebSocket bridge...');
    
    // Close all connections
    connections.forEach((conn, id) => {
        if (conn.client) conn.client.close();
        if (conn.wings) conn.wings.close();
    });
    
    process.exit(0);
});

// Start the bridge
log('info', '🌉 Starting WebSocket Bridge...');
log('info', 'Configuration:', CONFIG);

const bridgeServer = createBridgeServer();
createHealthServer();

// Export for testing
module.exports = { createBridgeServer, CONFIG };