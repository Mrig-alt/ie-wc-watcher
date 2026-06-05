import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Edge-safe auth instance — no database imports, runs in the Edge runtime.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname.startsWith("/admin") && !session) {
    return NextResponse.redirect(new URL("/join", req.url));
  }

  if (pathname === "/join" && session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Added /join so logged-in users are redirected away from the login page
  matcher: ["/admin/:path*", "/join"],
};
