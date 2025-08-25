import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create demo users
  const users = [
    {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: UserRole.ADMIN
    },
    {
      name: 'Staff User',
      email: 'staff@example.com',
      password: 'password123',
      role: UserRole.STAFF
    },
    {
      name: 'Finance User',
      email: 'finance@example.com',
      password: 'password123',
      role: UserRole.FINANCE
    }
  ]

  for (const userData of users) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    })

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(userData.password, 12)
      
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          passwordHash,
          role: userData.role
        }
      })

      console.log(`Created user: ${user.email} (${user.role})`)
    } else {
      console.log(`User already exists: ${userData.email}`)
    }
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
