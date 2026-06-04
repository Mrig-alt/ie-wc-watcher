"use client";

import { useSession } from "next-auth/react";

/**
 * Shown only to logged-out visitors.
 * Uses useSession() so it reads the same cookie the Header does,
 * avoiding the server-side auth() / AUTH_SECRET mismatch issue.
 */
export default function JoinBanner() {
  const { data: session, status } = useSession();

  // Don't flash the banner while the session is loading
  if (status === "loading" || session) return null;

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
      <p className="text-sm text-green-700 font-medium">
        \uD83C\uDFC6 Join the class to see your pairings and bet tokens!
      </p>
      <a
        href="/join"
        className="mt-2 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        Join now
      </a>
    </div>
  );
}
