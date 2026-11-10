import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kamu perlu masuk dulu' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ error: 'Gagal memproses permintaan. Coba lagi, ya.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kamu perlu masuk dulu' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, currentPassword, newPassword } = body

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ error: 'Nama dan email wajib diisi' }, { status: 400 })
    }

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
    }

    // Check if email is already taken by another user
    if (email !== currentUser.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json({ error: 'Email sudah ada' }, { status: 400 })
      }
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
      updatedAt: new Date()
    }

    // Handle password update
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Kata sandi saat ini wajib diisi untuk membuat kata sandi baru' }, { status: 400 })
      }

      // Verify current password (the column is passwordHash; `password` does not exist)
      const isCurrentPasswordValid = currentUser.passwordHash
        ? await bcrypt.compare(currentPassword, currentUser.passwordHash)
        : false
      if (!isCurrentPasswordValid) {
        return NextResponse.json({ error: 'Kata sandi saat ini salah' }, { status: 400 })
      }

      // Validate new password
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Kata sandi baru minimal 6 karakter' }, { status: 400 })
      }

      // Hash new password
      updateData.passwordHash = await bcrypt.hash(newPassword, 12)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      message: 'Profil diperbarui',
      user: updatedUser
    })

  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json({ error: 'Gagal memproses permintaan. Coba lagi, ya.' }, { status: 500 })
  }
}
