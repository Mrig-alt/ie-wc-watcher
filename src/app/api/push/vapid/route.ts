import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BMRRFkonUC7ymoeuZc9lx_CK5WrMlOCzLfp3RMaobzyU253M6clwxfWRqZg3l7JYIi9nylm53mnVVy7-Zu6wRtI";
  return NextResponse.json({ publicKey });
}
