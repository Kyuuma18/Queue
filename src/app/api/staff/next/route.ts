import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { nextNumber } from "@/lib/queue";

export const dynamic = "force-dynamic";

/** The number the next ticket will get, for the "Folder Number" box on the create-ticket form. */
export async function GET(req: Request) {
  if (!(await isStaff())) return NextResponse.json({ error: "Please log in again" }, { status: 401 });
  try {
    const p = new URL(req.url).searchParams;
    const number = await nextNumber(p.get("office"), p.get("priority") === "1");
    return NextResponse.json({ number }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Something went wrong" }, { status: 400 });
  }
}
