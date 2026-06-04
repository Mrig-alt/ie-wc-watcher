import { NextResponse } from "next/server";
import { db } from "@/db";
import { venues } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

const venueSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(300).optional().nullable(),
  mapsUrl: z
    .string()
    .url()
    .max(500)
    .refine((u) => /^https?:\/\//i.test(u), "Only http/https URLs are allowed")
    .optional()
    .nullable(),
});

// GET /api/venues — returns all curated venues + user's custom ones
export async function GET() {
  const rows = await db
    .select()
    .from(venues)
    .where(eq(venues.isCustom, false))
    .orderBy(venues.area, venues.name);
  return NextResponse.json({ venues: rows });
}

// POST /api/venues — add a custom venue (user-submitted, not in curated list)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = venueSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { name, address, mapsUrl } = parsed.data;
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const [venue] = await db
    .insert(venues)
    .values({
      name: name.trim(),
      address: address?.trim() || null,
      mapsUrl: mapsUrl?.trim() || null,
      isCustom: true,
      addedBy: session.user.id,
    })
    .returning();

  return NextResponse.json({ venue });
}
