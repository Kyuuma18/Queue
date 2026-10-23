import { NextResponse } from "next/server";
import { getState } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getState(), { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Queue is temporarily unavailable" }, { status: 503 });
  }
}
