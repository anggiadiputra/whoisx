import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, UserStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

// GET /api/users/[id] - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only ADMIN can view user details, or user can view their own profile
    if (session.user.role !== 'ADMIN' && session.user.id !== id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user
    })

  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only ADMIN can update users, or user can update their own profile (limited fields)
    const isAdmin = session.user.role === 'ADMIN'
    const isOwnProfile = session.user.id === id

    if (!isAdmin && !isOwnProfile) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, role, status, password, currentPassword } = body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true
      }
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    // Name can be updated by admin or own profile
    if (name !== undefined) {
      updateData.name = name
    }

    // Email validation and update
    if (email !== undefined && email !== existingUser.email) {
      if (!isAdmin && !isOwnProfile) {
        return NextResponse.json(
          { success: false, error: 'Cannot update email' },
          { status: 403 }
        )
      }

      // Check if new email already exists
      const emailExists = await prisma.user.findUnique({
        where: { email }
      })

      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 400 }
        )
      }

      updateData.email = email
      updateData.emailVerified = null // Reset email verification
    }

    // Role and status can only be updated by admin
    if (isAdmin) {
      if (role !== undefined) {
        updateData.role = role as UserRole
      }
      if (status !== undefined) {
        updateData.status = status as UserStatus
      }
    }

    // Password update
    if (password) {
      // If updating own profile, require current password
      if (isOwnProfile && !isAdmin) {
        if (!currentPassword) {
          return NextResponse.json(
            { success: false, error: 'Current password is required' },
            { status: 400 }
          )
        }

        // Verify current password
        if (existingUser.passwordHash) {
          const isValidPassword = await bcrypt.compare(currentPassword, existingUser.passwordHash)
          if (!isValidPassword) {
            return NextResponse.json(
              { success: false, error: 'Current password is incorrect' },
              { status: 400 }
            )
          }
        }
      }

      // Hash new password
      updateData.passwordHash = await bcrypt.hash(password, 12)
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true
      }
    })

    // console.log(`✅ User updated successfully: ${user.name} (${user.email})`)

    return NextResponse.json({
      success: true,
      user
    })

  } catch (error) {
    console.error('❌ Error updating user:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only ADMIN can delete users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Prevent deleting self
    if (session.user.id === id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id }
    })

    // console.log(`✅ User deleted successfully: ${existingUser.name} (${existingUser.email})`)

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('❌ Error deleting user:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
