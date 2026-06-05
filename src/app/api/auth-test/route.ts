import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    const session = await auth();
    return NextResponse.json({
      success: true,
      timeTaken: Date.now() - start,
      session,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({
      success: false,
      timeTaken: Date.now() - start,
      errorMessage: err.message || String(error),
      errorStack: err.stack || null,
    });
  }
}
