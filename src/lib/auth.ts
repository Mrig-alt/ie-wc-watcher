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

        if (!student || student.flagged || student.deletedAt) return null;

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

    async session(params) {
      // Step 1: base auth config session mapping
      const baseSession = await authConfig.callbacks!.session!(params);
      
      // Step 2: always fetch fresh tokenBalance from DB so all components are perfectly in sync
      if (baseSession?.user?.id) {
        const [student] = await db
          .select({ 
            tokenBalance: students.tokenBalance, 
            referralTokensEarned: students.referralTokensEarned,
            notificationsOnboarded: students.notificationsOnboarded,
            pushEnabled: students.pushEnabled,
            emailEnabled: students.emailEnabled
          })
          .from(students)
          .where(eq(students.id, baseSession.user.id))
          .limit(1);
        if (student) {
          baseSession.user.tokenBalance = student.tokenBalance;
          (baseSession.user as any).referralTokensEarned = student.referralTokensEarned;
          (baseSession.user as any).notificationsOnboarded = student.notificationsOnboarded;
          (baseSession.user as any).pushEnabled = student.pushEnabled;
          (baseSession.user as any).emailEnabled = student.emailEnabled;
        }
      }
      return baseSession as any;
    },

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

      // Step 2: Handle client-side session updates
      if (trigger === "update") {
        if (token.id) {
          const [student] = await db
            .select()
            .from(students)
            .where(eq(students.id, token.id as string))
            .limit(1);
          if (student) {
            token.tokenBalance = student.tokenBalance;
            token.teamId = student.teamId;
            token.visibility = student.visibility;
            token.isGuest = student.isGuest;
            token.hasBoughtIn = student.hasBoughtIn;
          }
        }
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
    notificationsOnboarded?: boolean;
    pushEnabled?: boolean;
    emailEnabled?: boolean;
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
      notificationsOnboarded: boolean;
      pushEnabled: boolean;
      emailEnabled: boolean;
    };
  }
}
