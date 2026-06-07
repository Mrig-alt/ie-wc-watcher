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

import { watchInvites } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// GET /api/venues — returns all venues with popularity counts
export async function GET() {
  const rows = await db
    .select()
    .from(venues)
    .orderBy(venues.area, venues.name);

  const inviteCounts = await db
    .select({
      venueId: watchInvites.venueId,
      count: sql<number>`count(*)::int`,
    })
    .from(watchInvites)
    .where(sql`${watchInvites.venueId} IS NOT NULL`)
    .groupBy(watchInvites.venueId);

  const countMap = new Map(inviteCounts.map(c => [c.venueId, c.count]));

  // Add popularity and sort
  const withPopularity = rows.map(v => ({
    ...v,
    popularity: countMap.get(v.id) || 0,
  }));

  // Filter out custom venues that have 0 popularity
  const filtered = withPopularity.filter(v => !v.isCustom || v.popularity > 0);

  // Global sort: highest popularity first, then by area, then name
  filtered.sort((a, b) => {
    if (b.popularity !== a.popularity) return b.popularity - a.popularity;
    const areaA = a.area || "Other";
    const areaB = b.area || "Other";
    if (areaA !== areaB) return areaA.localeCompare(areaB);
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ venues: filtered });
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
