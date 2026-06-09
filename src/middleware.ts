import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  
  let response = NextResponse.next();

  if (pathname.startsWith("/admin") && session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    response = NextResponse.redirect(new URL("/join", req.nextUrl));
  } else if (pathname === "/join" && session) {
    response = NextResponse.redirect(new URL("/", req.url));
  }

  if (!req.cookies.has("deviceId")) {
    const newDeviceId = crypto.randomUUID();
    response.cookies.set("deviceId", newDeviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  return response;
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json).*)'],
};
