import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { toCsv } from "@/lib/export";
import { listTickets } from "@/lib/queue";

export const dynamic = "force-dynamic";

// GET /api/staff/list?office=gso&from=2026-10-24&to=2026-10-24&status=&type=&app=&q=&carried=1[&format=csv]
// With no dates it lists today. format=csv downloads the same rows as a spreadsheet file.
export async function GET(req: Request) {
  if (!(await isStaff())) return NextResponse.json({ error: "Please log in again" }, { status: 401 });
  try {
    const p = new URL(req.url).searchParams;
    const office = p.get("office");
    const rows = await listTickets(office, {
      from: p.get("from") ?? undefined,
      to: p.get("to") ?? undefined,
      status: p.get("status") ?? undefined,
      type: p.get("type") ?? undefined,
      app: p.get("app") ?? undefined,
      q: p.get("q") ?? undefined,
      carried: p.get("carried") === "1",
    });
    if (p.get("format") === "csv") {
      const first = p.get("from") ?? new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
      const last = p.get("to") ?? first;
      const name = `${office || "bplo"}-queue-${first}${last !== first ? "_to_" + last : ""}.csv`;
      return new Response(toCsv(rows, office), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${name}"`,
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json({ rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Something went wrong" }, { status: 400 });
  }
}
