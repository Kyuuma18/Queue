import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { callNext, callSpecific, complete, markClaimed, markUnclaimed, recall, requeue, toPublic, transfer } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isStaff())) return NextResponse.json({ error: "Please log in again" }, { status: 401 });
  try {
    const b = await req.json();
    const office = b.office; // "bplo" (default) or "gso"
    const counter = Number(b.counter);
    let t = null;
    switch (b.action) {
      case "next":
        t = await callNext(office, counter);
        break;
      case "call":
        t = await callSpecific(office, counter, Number(b.id));
        break;
      case "recall":
        t = await recall(office, counter);
        break;
      case "complete":
        await complete(office, counter);
        break;
      case "unclaimed":
        await markUnclaimed(office, counter);
        break;
      case "transfer":
        t = await transfer(office, counter, String(b.service));
        break;
      case "requeue":
        await requeue(office, Number(b.id));
        break;
      case "claimed":
        await markClaimed(office, Number(b.id));
        break;
      default:
        throw new Error("Unknown action");
    }
    return NextResponse.json({ ok: true, ticket: t ? toPublic(t) : null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Something went wrong" }, { status: 400 });
  }
}
