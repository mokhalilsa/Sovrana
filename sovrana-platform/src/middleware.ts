import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login
     * - /api (all API routes - auth, polymarket, portfolio)
     * - /_next (Next.js internals)
     * - /favicon.ico, /public files
     */
    '/((?!login|api|_next|favicon.ico|public).*)',
  ],
};
