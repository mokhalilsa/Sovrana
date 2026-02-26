import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import axios from 'axios'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        try {
          const res = await axios.post(
            `${process.env.EXECUTION_URL || 'http://execution:8003'}/auth/login`,
            {
              username: credentials.username,
              password: credentials.password,
            }
          )
          if (res.data?.access_token) {
            return {
              id: res.data.user_id,
              name: credentials.username,
              email: res.data.email || '',
              accessToken: res.data.access_token,
            }
          }
        } catch {
          // Fallback: check env credentials for local dev
          const adminUser = process.env.ADMIN_USERNAME || 'admin'
          const adminPass = process.env.ADMIN_PASSWORD || 'changeme'
          if (
            credentials.username === adminUser &&
            credentials.password === adminPass
          ) {
            return { id: 'admin', name: 'admin', email: 'admin@sovrana.local' }
          }
        }
        return null
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.accessToken = (user as Record<string, unknown>).accessToken
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
