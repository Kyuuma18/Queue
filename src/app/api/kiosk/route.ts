import { NextResponse } from "next/server";
import { isKiosk, isStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Is this device allowed to issue tickets? (a set-up kiosk, or a logged-in staff member testing it) */
export async function GET() {
  return NextResponse.json({ ok: (await isKiosk()) || (await isStaff()) });
}
