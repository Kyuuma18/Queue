import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { getOffice } from "@/lib/config";
import { createTicket, normalizePhone, toPublic, validateDetails } from "@/lib/queue";

export const dynamic = "force-dynamic";

/** Staff create a ticket for a client with the create-ticket form (GSO). */
export async function POST(req: Request) {
  if (!(await isStaff())) return NextResponse.json({ error: "Please log in again" }, { status: 401 });
  try {
    const b = await req.json();
    const off = getOffice(b.office);
    const details = validateDetails(off.id, b);
    const phone = normalizePhone(b.phone);
    const line = off.form?.service ?? off.services[0].code;
    const { ticket, ahead } = await createTicket(off.id, line, Boolean(b.priority), phone, details);
    return NextResponse.json({
      ...toPublic(ticket),
      ahead,
      app_type: ticket.app_type,
      biz_type: ticket.biz_type,
      business_name: ticket.business_name,
      account_no: ticket.account_no,
      created_at: ticket.created_at,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Something went wrong" }, { status: 400 });
  }
}
