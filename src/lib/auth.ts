import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        pin: { label: "Class PIN", type: "password" },
      },
      async authorize(credentials) {
        const { email, pin } = credentials as { email: string; pin?: string };
        if (!email) return null;

        const [student] = await db
          .select()
          .from(students)
          .where(eq(students.email, email.toLowerCase()))
          .limit(1);

        if (!student || student.flagged) return null;

        const joinPin = process.env.JOIN_PIN;
        if (!student.isGuest && joinPin && pin !== joinPin) return null;

        return {
          id: student.id,
          email: student.email,
          name: student.name,
          teamId: student.teamId,
          visibility: student.visibility,
          tokenBalance: student.tokenBalance,
          isGuest: student.isGuest,
          hasBoughtIn: student.hasBoughtIn,
        };
      },
    }),
  ],
  callbacks: {
    // Re-declare all authConfig callbacks here cleanly — do NOT call authConfig.callbacks.jwt
    // manually, that would double-execute since authConfig is also spread above.
    authorized: authConfig.callbacks!.authorized,
    session: authConfig.callbacks!.session,

    async jwt(params) {
      // Step 1: run the base token-building logic from authConfig (handles user sign-in)
      const { token, user, trigger, session } = params;

      if (user) {
        // Fresh sign-in — seed token from the user object returned by authorize()
        token.id = user.id as string;
        token.sub = user.id as string;
        token.teamId = (user as { teamId?: string | null }).teamId ?? null;
        token.visibility = (user as { visibility?: string }).visibility ?? "public";
        token.tokenBalance = (user as { tokenBalance?: number }).tokenBalance ?? 100;
        token.email = (user as { email?: string }).email ?? null;
        token.isGuest = (user as { isGuest?: boolean }).isGuest ?? false;
        token.hasBoughtIn = (user as { hasBoughtIn?: boolean }).hasBoughtIn ?? false;
      }

      if (!token.id && token.sub) token.id = token.sub;

      // Step 2: Handle client-side session updates (zero-DB!)
      if (trigger === "update" && session) {
        if (session.tokenBalance !== undefined) token.tokenBalance = session.tokenBalance;
        if (session.teamId !== undefined) token.teamId = session.teamId;
        if (session.visibility !== undefined) token.visibility = session.visibility;
        if (session.isGuest !== undefined) token.isGuest = session.isGuest;
        if (session.hasBoughtIn !== undefined) token.hasBoughtIn = session.hasBoughtIn;
      }

      return token;
    },
  },
});

declare module "next-auth" {
  interface User {
    teamId?: string | null;
    visibility?: string;
    tokenBalance?: number;
    isGuest?: boolean;
    hasBoughtIn?: boolean;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      teamId: string | null;
      visibility: string;
      tokenBalance: number;
      isGuest: boolean;
      hasBoughtIn: boolean;
    };
  }
}
