import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { getRegistrationEnabled } from '@/lib/app-settings'

export async function POST(request: NextRequest) {
  try {
    if (!(await getRegistrationEnabled())) {
      return NextResponse.json({
        success: false,
        error: 'Pendaftaran sedang ditutup. Minta akun ke admin, ya.'
      }, { status: 403 })
    }

    const body = await request.json()
    // Role is intentionally not read from the body: self-registration must never
    // grant elevated access. Admins change roles via /api/users/[id].
    const { name, email, password } = body

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Nama, email, dan kata sandi wajib diisi'
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Format email tidak valid'
      }, { status: 400 })
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'Kata sandi minimal 6 karakter'
      }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Pengguna dengan email ini sudah ada'
      }, { status: 409 })
    }

    // Hash password
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: UserRole.STAFF
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: user,
      message: 'Akun berhasil dibuat'
    })
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json({
      success: false,
      error: 'Gagal membuat akun. Coba lagi, ya.'
    }, { status: 500 })
  }
}
