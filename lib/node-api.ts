// lib/node-api.ts
export class NodeAPI {
  private baseUrl: string
  private token: string

  constructor(nodeIp: string, nodePort: number, token: string) {
    this.baseUrl = `http://${nodeIp}:${nodePort}`
    this.token = token
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    return response.json()
  }

  async createServer(data: {
    serverName: string
    userEmail: string
    software: string
    ram: string
    storage: string
  }) {
    return this.request('/server/create', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async startServer(serverName: string, userEmail: string) {
    return this.request('/server/start', {
      method: 'POST',
      body: JSON.stringify({ serverName, userEmail }),
    })
  }

  async stopServer(serverName: string, userEmail: string) {
    return this.request('/server/stop', {
      method: 'POST',
      body: JSON.stringify({ serverName, userEmail }),
    })
  }

  async restartServer(serverName: string, userEmail: string) {
    return this.request('/server/restart', {
      method: 'POST',
      body: JSON.stringify({ serverName, userEmail }),
    })
  }

  async getServerStatus(serverName: string, userEmail: string) {
    const params = new URLSearchParams({ serverName, userEmail })
    return this.request(`/server/status?${params}`)
  }

  async getNodeStatus() {
    return this.request('/node/status')
  }
}