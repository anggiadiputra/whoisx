import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ServerType, ServerStatus } from '@prisma/client'

// GET /api/servers - List all servers with stats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all servers
    const servers = await prisma.server.findMany({
      orderBy: [
        { status: 'asc' },
        { expiryDate: 'asc' },
        { serverName: 'asc' }
      ],
      include: {
        domains: {
          select: {
            id: true,
            domain: true,
            status: true,
            expiryDate: true
          }
        }
      }
    })

    // Calculate days to expiry for each server
    const serversWithCalculatedExpiry = servers.map(server => {
      let daysToExpiry = null
      if (server.expiryDate) {
        const now = new Date()
        const expiryDate = new Date(server.expiryDate)
        
        // Set both dates to start of day for accurate day comparison
        const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const expiryStartOfDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
        
        const diffTime = expiryStartOfDay.getTime() - nowStartOfDay.getTime()
        daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }

      return {
        ...server,
        daysToExpiry,
        domainCount: server.domains.length
      }
    })

    // Calculate statistics
    const stats = {
      total: servers.length,
      active: servers.filter(s => {
        // Server is active if status is ACTIVE AND not expired
        if (s.status !== 'ACTIVE') return false
        if (!s.expiryDate) return true // No expiry date means active
        
        const now = new Date()
        const expiryDate = new Date(s.expiryDate)
        const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const expiryStartOfDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
        
        return expiryStartOfDay.getTime() >= nowStartOfDay.getTime() // Not expired
      }).length,
      expired: servers.filter(s => {
        if (!s.expiryDate) return false
        const now = new Date()
        const expiryDate = new Date(s.expiryDate)
        const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const expiryStartOfDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
        return expiryStartOfDay.getTime() < nowStartOfDay.getTime()
      }).length,
      expiring7: servers.filter(s => {
        if (!s.expiryDate) return false
        const now = new Date()
        const expiryDate = new Date(s.expiryDate)
        const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const expiryStartOfDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
        const diffTime = expiryStartOfDay.getTime() - nowStartOfDay.getTime()
        const daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return daysToExpiry > 0 && daysToExpiry <= 7 // Exclude expired (> 0)
      }).length,
      expiring30: servers.filter(s => {
        if (!s.expiryDate) return false
        const now = new Date()
        const expiryDate = new Date(s.expiryDate)
        const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const expiryStartOfDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
        const diffTime = expiryStartOfDay.getTime() - nowStartOfDay.getTime()
        const daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return daysToExpiry > 0 && daysToExpiry <= 30 // Exclude expired (> 0)
      }).length,
      hosting: servers.filter(s => s.serverType === 'HOSTING').length,
      vps: servers.filter(s => s.serverType === 'VPS').length
    }

    return NextResponse.json({
      success: true,
      servers: serversWithCalculatedExpiry,
      stats
    })

  } catch (error) {
    console.error('❌ Error fetching servers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/servers - Create new server
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - only ADMIN and STAFF can create servers
    const userRole = (session.user as any)?.role
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.serverName || !body.provider || !body.serverType) {
      return NextResponse.json(
        { error: 'Server name, provider, and server type are required' },
        { status: 400 }
      )
    }

    // Validate server type
    if (!Object.values(ServerType).includes(body.serverType)) {
      return NextResponse.json(
        { error: 'Invalid server type' },
        { status: 400 }
      )
    }

    // Calculate days to expiry if expiry date is provided
    let daysToExpiry = null
    if (body.expiryDate) {
      const now = new Date()
      const expiryDate = new Date(body.expiryDate)
      const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const expiryStartOfDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
      const diffTime = expiryStartOfDay.getTime() - nowStartOfDay.getTime()
      daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    // Create server
    const server = await prisma.server.create({
      data: {
        serverName: body.serverName.trim(),
        provider: body.provider.trim(),
        serverType: body.serverType,
        status: body.status || 'ACTIVE',
        createdDate: body.createdDate ? new Date(body.createdDate) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        daysToExpiry,
        username: body.username?.trim() || null,
        password: body.password?.trim() || null, // TODO: Encrypt in production
        notes: body.notes?.trim() || null
      }
    })

    // Assign domains if provided
    if (body.domainIds && Array.isArray(body.domainIds) && body.domainIds.length > 0) {
      await prisma.domain.updateMany({
        where: {
          id: { in: body.domainIds }
        },
        data: {
          serverId: server.id
        }
      })
      console.log(`✅ Assigned ${body.domainIds.length} domains to server:`, server.serverName)
    }

    console.log('✅ Server created successfully:', server.serverName)

    return NextResponse.json({
      success: true,
      message: 'Server created successfully',
      server
    })

  } catch (error) {
    console.error('❌ Error creating server:', error)
    return NextResponse.json(
      { error: 'Failed to create server' },
      { status: 500 }
    )
  }
}
