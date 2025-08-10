import { NextRequest, NextResponse } from 'next/server'
import { Server as HTTPServer } from 'http'
import { initializeSocket } from '@/lib/socket'

export async function GET(request: NextRequest) {
  const res = NextResponse.next()
  
  if (!(global as any).socketInitialized) {
    console.log('🚀 Initializing Socket.IO server...')
    
    // Get the server instance from Next.js
    const server = (global as any).server
    if (server) {
      (global as any).io = initializeSocket(server)
      ;(global as any).socketInitialized = true
      console.log('✅ Socket.IO server initialized')
    }
  }
  
  return NextResponse.json({ status: 'Socket.IO ready' })
}