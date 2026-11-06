import { NextResponse } from "next/server";
import { KIOSK_COOKIE, KIOSK_DAYS, isStaff, makeKioskToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

/** Staff turn this device into an office kiosk (stays set up for a year, or until switched off). */
export async function POST(req: Request) {
  if (!(await isStaff())) return NextResponse.json({ error: "Please log in again" }, { status: 401 });
  const { office } = await req.json().catch(() => ({}));
  const res = NextResponse.json({ ok: true });
  res.cookies.set(KIOSK_COOKIE, makeKioskToken(), { ...opts, maxAge: KIOSK_DAYS * 24 * 3600 });
  // Which office this kiosk belongs to (not secret): the installed app opens that office's kiosk.
  res.cookies.set("cq_kiosk_at", office === "gso" ? "gso" : "bplo", { ...opts, httpOnly: false, maxAge: KIOSK_DAYS * 24 * 3600 });
  return res;
}

/** Switch this device back to a normal screen. */
export async function DELETE() {
  if (!(await isStaff())) return NextResponse.json({ error: "Please log in again" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(KIOSK_COOKIE, "", { ...opts, maxAge: 0 });
  return res;
}
