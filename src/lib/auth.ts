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
          referralTokensEarned: student.referralTokensEarned,
          notificationsOnboarded: student.notificationsOnboarded,
          pushEnabled: student.pushEnabled,
          emailEnabled: student.emailEnabled,
          deviceId: student.deviceId,
        };
      },
    }),
  ],
  callbacks: {
    // Re-declare all authConfig callbacks here cleanly — do NOT call authConfig.callbacks.jwt
    // manually, that would double-execute since authConfig is also spread above.
    authorized: authConfig.callbacks!.authorized,

    async session(params) {
      return (await authConfig.callbacks!.session!(params)) as any;
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
        token.tokenBalance = (user as { tokenBalance?: number }).tokenBalance ?? 1000;
        token.email = (user as { email?: string }).email ?? null;
        token.isGuest = (user as { isGuest?: boolean }).isGuest ?? false;
        token.hasBoughtIn = (user as { hasBoughtIn?: boolean }).hasBoughtIn ?? false;
        token.referralTokensEarned = (user as any).referralTokensEarned ?? 0;
        token.notificationsOnboarded = (user as any).notificationsOnboarded ?? false;
        token.pushEnabled = (user as any).pushEnabled ?? false;
        token.emailEnabled = (user as any).emailEnabled ?? false;
        token.deviceId = (user as any).deviceId ?? null;
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
            token.referralTokensEarned = student.referralTokensEarned;
            token.notificationsOnboarded = student.notificationsOnboarded;
            token.pushEnabled = student.pushEnabled;
            token.emailEnabled = student.emailEnabled;
            token.deviceId = student.deviceId;
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
    deviceId?: string | null;
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
      deviceId: string | null;
    };
  }
}
