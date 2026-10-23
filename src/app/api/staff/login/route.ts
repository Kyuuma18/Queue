import { NextResponse } from "next/server";
import { COOKIE, checkPin, isStaff, makeToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const attempts = new Map<string, { n: number; until: number }>();

export async function GET() {
  return NextResponse.json({ ok: await isStaff() });
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const a = attempts.get(ip);
  if (a && a.until > Date.now()) {
    return NextResponse.json({ error: "Too many tries. Please wait a minute." }, { status: 429 });
  }
  const { pin } = await req.json().catch(() => ({}));
  if (!checkPin(pin)) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(ip, { n, until: n >= 5 ? Date.now() + 60_000 : 0 });
    return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
  }
  attempts.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 14 * 3600,
  });
  return res;
}
