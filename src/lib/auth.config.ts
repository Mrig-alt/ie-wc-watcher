import type { NextAuthConfig } from "next-auth";

// IMPORTANT: this file is loaded by middleware.ts which runs on the Edge runtime.
// It must NOT import anything that uses Node.js APIs (pg, drizzle, fs, etc.).
// DB-dependent logic (token refresh) lives in auth.ts instead.
export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 180 },
  pages: { signIn: "/join", newUser: "/" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // Allow all routes — no forced redirect loops
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.sub = user.id as string;
        token.teamId = (user as { teamId?: string | null }).teamId ?? null;
        token.visibility = (user as { visibility?: string }).visibility ?? "public";
        token.tokenBalance = (user as { tokenBalance?: number }).tokenBalance ?? 100;
        token.email = (user as { email?: string }).email ?? null;
        token.referralTokensEarned = (user as any).referralTokensEarned ?? 0;
        token.notificationsOnboarded = (user as any).notificationsOnboarded ?? false;
        token.pushEnabled = (user as any).pushEnabled ?? false;
        token.emailEnabled = (user as any).emailEnabled ?? false;
        token.deviceId = (user as any).deviceId ?? null;
      }
      // Always ensure token.id is set — old sessions may only have token.sub
      if (!token.id && token.sub) {
        token.id = token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      const userId = (token.id ?? token.sub) as string | undefined;
      if (session?.user && userId) {
        session.user.id = userId;
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.teamId = (token.teamId as string | null) ?? null;
        session.user.visibility = (token.visibility as string) ?? "public";
        session.user.tokenBalance = (token.tokenBalance as number) ?? 100;
        session.user.isGuest = (token.isGuest as boolean) ?? false;
        session.user.hasBoughtIn = (token.hasBoughtIn as boolean) ?? false;
        (session.user as any).referralTokensEarned = (token.referralTokensEarned as number) ?? 0;
        (session.user as any).notificationsOnboarded = (token.notificationsOnboarded as boolean) ?? false;
        (session.user as any).pushEnabled = (token.pushEnabled as boolean) ?? false;
        (session.user as any).emailEnabled = (token.emailEnabled as boolean) ?? false;
        (session.user as any).deviceId = (token.deviceId as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
