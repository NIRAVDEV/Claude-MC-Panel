// Utility to extract serverId from the URL
function getServerIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/servers\/([^/]+)\/files/)
  return match ? match[1] : null
}
// app/api/servers/[serverId]/files/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { lucia } from '@/lib/lucia'
import { cookies } from 'next/headers'

interface WingsFileRequest {
  path: string
  content?: string
}

interface WingsFileResponse {
  status: string
  message?: string
  content?: string
}

async function sendWingsFileRequest(
  nodeUrl: string,
  nodeToken: string,
  method: string,
  path?: string,
  content?: string
): Promise<WingsFileResponse | Buffer> {
  try {
    let url = `${nodeUrl}/file_manager`
    let requestInit: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${nodeToken}`
      }
    }

    if (method === 'GET' && path) {
      url += `?path=${encodeURIComponent(path)}`
    } else if (method === 'POST') {
      requestInit.headers = {
        ...requestInit.headers,
        'Content-Type': 'application/json'
      }
      requestInit.body = JSON.stringify({ path, content })
    }

    const response = await fetch(url, requestInit)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Wings API Error: ${response.status} - ${errorText}`)
    }

    // For GET requests, might return file content directly
    if (method === 'GET') {
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        return await response.json() as WingsFileResponse
      } else {
        return Buffer.from(await response.arrayBuffer())
      }
    }

    return await response.json() as WingsFileResponse
  } catch (error) {
    console.error('Wings file API communication failed:', error)
    throw new Error(`Failed to communicate with Wings agent: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function validateServerAccess(serverId: string, userId: string) {
  const server = await prisma.server.findFirst({
    where: {
      id: serverId,
      userId: userId
    },
    include: {
      node: {
        select: {
          id: true,
          name: true,
          ip: true,
          port: true,
          verificationToken: true,
          status: true
        }
      },
      user: {
        select: {
          email: true
        }
      }
    }
  })

  if (!server) {
    throw new Error('Server not found or access denied')
  }

  if (server.node.status !== 'ONLINE') {
    throw new Error('Server node is not online')
  }

  return server
}

// GET - Read file content
export async function GET(request: NextRequest) {
  try {
    const serverId = getServerIdFromUrl(request)
    if (!serverId) {
      return NextResponse.json({ success: false, error: 'Missing serverId in URL' }, { status: 400 })
    }
    const url = new URL(request.url)
    const filePath = url.searchParams.get('path')

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'Missing file path parameter' },
        { status: 400 }
      )
    }

    // Validate authentication
    const cookieStore = cookies()
    const sessionId = (await cookieStore).get(lucia.sessionCookieName)?.value ?? null
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { user } = await lucia.validateSession(sessionId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Validate server access
    const server = await validateServerAccess(serverId, user.id)
    const nodeUrl = `http://${server.node.ip}:${server.node.port}`

    // Build server-specific file path
    const userId = server.user.email.split('@')[0]
    const containerId = `${server.name}-${userId}`.replace(/[^a-zA-Z0-9.-]/g, '')
    const serverFilePath = `${containerId}/${filePath}`

    // Get file content from Wings agent
    const wingsResponse = await sendWingsFileRequest(
      nodeUrl,
      server.node.verificationToken,
      'GET',
      serverFilePath
    )

    // Handle binary content
    if (Buffer.isBuffer(wingsResponse)) {
      return new NextResponse(new Uint8Array(wingsResponse), {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${filePath.split('/').pop()}"`
        }
      })
    }

    // Handle JSON response
    const fileResponse = wingsResponse as WingsFileResponse
    if (fileResponse.content !== undefined) {
      return NextResponse.json({
        success: true,
        path: filePath,
        content: fileResponse.content,
        serverId: serverId
      })
    }

    return NextResponse.json(
      { success: false, error: 'File not found or unreadable' },
      { status: 404 }
    )

  } catch (error) {
    console.error('File read API error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// POST - Write file content
export async function POST(request: NextRequest) {
  try {
    const serverId = getServerIdFromUrl(request)
    if (!serverId) {
      return NextResponse.json({ success: false, error: 'Missing serverId in URL' }, { status: 400 })
    }
    const { path: filePath, content } = await request.json()

    if (!filePath || content === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing file path or content' },
        { status: 400 }
      )
    }

    // Validate authentication
    const cookieStore = cookies()
    const sessionId = (await cookieStore).get(lucia.sessionCookieName)?.value ?? null
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { user } = await lucia.validateSession(sessionId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Validate server access
    const server = await validateServerAccess(serverId, user.id)
    const nodeUrl = `http://${server.node.ip}:${server.node.port}`

    // Build server-specific file path
    const userId = server.user.email.split('@')[0]
    const containerId = `${server.name}-${userId}`.replace(/[^a-zA-Z0-9.-]/g, '')
    const serverFilePath = `${containerId}/${filePath}`

    // Send file content to Wings agent
    const wingsResponse = await sendWingsFileRequest(
      nodeUrl,
      server.node.verificationToken,
      'POST',
      serverFilePath,
      content
    ) as WingsFileResponse

    if (wingsResponse.status !== 'ok') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to write file',
          wingsError: wingsResponse.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'File written successfully',
      path: filePath,
      serverId: serverId
    })

  } catch (error) {
    console.error('File write API error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// PUT - Upload file (multipart form data)
export async function PUT(request: NextRequest) {
  try {
    const serverId = getServerIdFromUrl(request)
    if (!serverId) {
      return NextResponse.json({ success: false, error: 'Missing serverId in URL' }, { status: 400 })
    }

    // Validate authentication
    const cookieStore = cookies()
    const sessionId = (await cookieStore).get(lucia.sessionCookieName)?.value ?? null
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { user } = await lucia.validateSession(sessionId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Validate server access
    const server = await validateServerAccess(serverId, user.id)
    const nodeUrl = `http://${server.node.ip}:${server.node.port}`

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const uploadPath = formData.get('path') as string

    if (!file || !uploadPath) {
      return NextResponse.json(
        { success: false, error: 'Missing file or upload path' },
        { status: 400 }
      )
    }

    // Build server-specific upload path
    const userId = server.user.email.split('@')[0]
    const containerId = `${server.name}-${userId}`.replace(/[^a-zA-Z0-9.-]/g, '')
    const serverUploadPath = `${containerId}/${uploadPath}`

    // Create new FormData for Wings agent
    const wingsFormData = new FormData()
    wingsFormData.append('file', file)
    wingsFormData.append('path', serverUploadPath)

    // Send file to Wings agent
    const response = await fetch(`${nodeUrl}/file/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${server.node.verificationToken}`
      },
      body: wingsFormData
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Wings upload failed: ${response.status} - ${errorText}`)
    }

    const wingsResponse: WingsFileResponse = await response.json()

    if (wingsResponse.status !== 'ok') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to upload file',
          wingsError: wingsResponse.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      filename: file.name,
      path: uploadPath,
      serverId: serverId
    })

  } catch (error) {
    console.error('File upload API error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}