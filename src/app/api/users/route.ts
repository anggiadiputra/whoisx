import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, UserStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

// GET /api/users - List all users with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only ADMIN can view users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Build where clause
    const where: any = {}
    
    if (role) {
      where.role = role as UserRole
    }
    
    if (status) {
      where.status = status as UserStatus
    }
    
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          email: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ]
    }
    
    // Build orderBy clause
    const orderBy: any = {}
    orderBy[sortBy] = sortOrder
    
    const users = await prisma.user.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        _count: {
          select: {
            sessions: true
          }
        }
      }
    })

    // Calculate stats
    const totalUsers = await prisma.user.count()
    const activeUsers = await prisma.user.count({
      where: { status: 'ACTIVE' }
    })
    const adminUsers = await prisma.user.count({
      where: { role: 'ADMIN' }
    })
    const staffUsers = await prisma.user.count({
      where: { role: 'STAFF' }
    })
    const financeUsers = await prisma.user.count({
      where: { role: 'FINANCE' }
    })
    const suspendedUsers = await prisma.user.count({
      where: { status: 'SUSPENDED' }
    })

    const stats = {
      total: totalUsers,
      active: activeUsers,
      admin: adminUsers,
      staff: staffUsers,
      finance: financeUsers,
      suspended: suspendedUsers
    }

    return NextResponse.json({
      success: true,
      users,
      stats
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only ADMIN can create users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, role, status, password } = body

    // Validation
    if (!name || !email || !role || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, role, and password are required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: role as UserRole,
        status: (status as UserStatus) || 'ACTIVE',
        passwordHash
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // console.log(`✅ User created successfully: ${user.name} (${user.email})`)

    return NextResponse.json({
      success: true,
      user
    })

  } catch (error) {
    console.error('❌ Error creating user:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
