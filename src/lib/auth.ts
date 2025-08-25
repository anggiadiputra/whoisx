import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import { ActivityLogger } from "@/lib/activity-logger"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }
          
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email.toLowerCase()
            }
          })

          if (!user || !user.passwordHash) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          )

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role
        token.name = user.name
        token.email = user.email
      }
      
      // Handle session update
      if (trigger === "update" && session) {
        if (session.name) {
          token.name = session.name
        }
        if (session.email) {
          token.email = session.email
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as UserRole
        session.user.name = token.name
        session.user.email = token.email
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  events: {
    async signIn({ user }) {
      // Update last login timestamp
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })
        
        // Log activity
        await ActivityLogger.userLogin(user.id, user.email!)
      } catch (error) {
        console.error('Failed to update last login:', error)
      }
    },
  },
  logger: {
    error(code, metadata) {
      // Suppress CLIENT_FETCH_ERROR noise
      if (code !== 'CLIENT_FETCH_ERROR') {
        console.error('NextAuth Error:', code, metadata)
      }
    },
    warn(code) {
      if (code !== 'CLIENT_FETCH_ERROR') {
        console.warn('NextAuth Warning:', code)
      }
    },
    debug(code, metadata) {
      // Only log in development and suppress CLIENT_FETCH_ERROR
      if (process.env.NODE_ENV === 'development' && code !== 'CLIENT_FETCH_ERROR') {
        console.debug('NextAuth Debug:', code, metadata)
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
  // Add additional configuration to reduce fetch errors
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}

export default authOptions
