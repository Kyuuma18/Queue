import { NextResponse } from "next/server";
import { createTicket, normalizePhone, toPublic } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(body.phone);
    const { ticket, ahead } = await createTicket(String(body.service ?? ""), Boolean(body.priority), phone);
    return NextResponse.json({ ...toPublic(ticket), token: ticket.token, ahead, created_at: ticket.created_at });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Something went wrong" }, { status: 400 });
  }
}
