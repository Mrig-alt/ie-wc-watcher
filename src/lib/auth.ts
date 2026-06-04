import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { loginSchema } from "./validations";
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

        // PIN check: if JOIN_PIN is set, the supplied pin MUST match.
        // An empty/missing pin is also rejected — no bypass allowed.
        const joinPin = process.env.JOIN_PIN;
        if (joinPin && pin !== joinPin) return null;

        const [student] = await db
          .select()
          .from(students)
          .where(eq(students.email, email.toLowerCase()))
          .limit(1);

        if (!student || student.flagged) return null;

        return {
          id: student.id,
          email: student.email,
          name: student.name,
          teamId: student.teamId,
          visibility: student.visibility,
          tokenBalance: student.tokenBalance,
        };
      },
    }),
  ],
  callbacks: {
    async jwt(params) {
      const token = await (authConfig.callbacks!.jwt as NonNullable<typeof authConfig.callbacks>["jwt"])!(params);

      if (!params.user && token?.id) {
        try {
          const [fresh] = await db
            .select({
              tokenBalance: students.tokenBalance,
              teamId: students.teamId,
              visibility: students.visibility,
              flagged: students.flagged,
            })
            .from(students)
            .where(eq(students.id, token.id as string))
            .limit(1);
          if (fresh) {
            if (fresh.flagged) return null;
            token.tokenBalance = fresh.tokenBalance;
            token.teamId = fresh.teamId;
            token.visibility = fresh.visibility;
          }
        } catch {
          // DB unavailable — keep stale values
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
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      teamId: string | null;
      visibility: string;
      tokenBalance: number;
    };
  }
}
