import { NextResponse } from "next/server";
import { cancelTicket, getTicket, toPublic } from "@/lib/queue";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const k = new URL(req.url).searchParams.get("k") ?? "";
  const r = await getTicket(Number(id), k);
  if (!r) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  return NextResponse.json(
    { ...toPublic(r.ticket), ahead: r.ahead, created_at: r.ticket.created_at },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** The client cancels their own ticket ("Hindi na ako tutuloy"). */
export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const k = new URL(req.url).searchParams.get("k") ?? "";
  await cancelTicket(Number(id), k);
  return NextResponse.json({ ok: true });
}
