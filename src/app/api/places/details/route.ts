import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("placeId");

  if (!placeId) {
    return NextResponse.json({ error: "Missing placeId" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing GOOGLE_MAPS_API_KEY" }, { status: 500 });
  }

  // Fetch Place Details to get the Google Maps URL
  // We only request the 'url' field to save on billing costs
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=url&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK") {
      console.error("Google Places API details error:", data.status, data.error_message);
      return NextResponse.json({ error: "Failed to fetch details" }, { status: 500 });
    }

    return NextResponse.json({ mapsUrl: data.result?.url || null });
  } catch (error) {
    console.error("Error fetching place details:", error);
    return NextResponse.json({ error: "Failed to fetch details" }, { status: 500 });
  }
}
