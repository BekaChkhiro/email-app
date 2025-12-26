import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = !nextUrl.pathname.startsWith("/login");
      const isApiRoute = nextUrl.pathname.startsWith("/api");
      const isPublicApi =
        nextUrl.pathname.startsWith("/api/auth") ||
        nextUrl.pathname.startsWith("/api/cron") ||
        nextUrl.pathname.startsWith("/api/webhooks") ||
        nextUrl.pathname.startsWith("/api/health");

      // Allow public API routes
      if (isApiRoute && isPublicApi) {
        return true;
      }

      // Protect API routes
      if (isApiRoute && !isLoggedIn) {
        return false;
      }

      // Protect dashboard routes
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return Response.redirect(new URL("/login", nextUrl));
      }

      // Already on login page
      if (isLoggedIn) {
        return Response.redirect(new URL("/clients", nextUrl));
      }

      return true;
    },
  },
  providers: [], // Providers will be added in auth.ts
};
