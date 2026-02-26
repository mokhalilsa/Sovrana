import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const validEmail = process.env.AUTH_EMAIL || 'mohammed.khalilsa@gmail.com';
        const validPassword = process.env.AUTH_PASSWORD || 'Woodwind!1';

        if (
          credentials?.email === validEmail &&
          credentials?.password === validPassword
        ) {
          return {
            id: '1',
            name: 'Mohammed Khalil',
            email: validEmail,
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'sovrana-secret-key-change-in-production-2026',
});

export { handler as GET, handler as POST };
