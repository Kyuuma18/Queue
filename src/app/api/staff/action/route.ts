import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { callNext, callSpecific, complete, markUnclaimed, recall, requeue, toPublic, transfer } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isStaff())) return NextResponse.json({ error: "Please log in again" }, { status: 401 });
  try {
    const b = await req.json();
    const counter = Number(b.counter);
    let t = null;
    switch (b.action) {
      case "next":
        t = await callNext(counter);
        break;
      case "call":
        t = await callSpecific(counter, Number(b.id));
        break;
      case "recall":
        t = await recall(counter);
        break;
      case "complete":
        await complete(counter);
        break;
      case "unclaimed":
        await markUnclaimed(counter);
        break;
      case "transfer":
        t = await transfer(counter, String(b.service));
        break;
      case "requeue":
        await requeue(Number(b.id));
        break;
      default:
        throw new Error("Unknown action");
    }
    return NextResponse.json({ ok: true, ticket: t ? toPublic(t) : null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Something went wrong" }, { status: 400 });
  }
}
