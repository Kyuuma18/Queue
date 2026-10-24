import { NextResponse } from "next/server";
import { getState } from "@/lib/queue";

export const dynamic = "force-dynamic";

// GET /api/state            → the BPLO queue (the original)
// GET /api/state?office=gso → the GSO queue
export async function GET(req: Request) {
  try {
    const office = new URL(req.url).searchParams.get("office");
    return NextResponse.json(await getState(office), { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    if (e?.message === "Unknown office") return NextResponse.json({ error: "Unknown office" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Queue is temporarily unavailable" }, { status: 503 });
  }
}
