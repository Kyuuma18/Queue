import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isKiosk } from "@/lib/auth";
import { OFFICES, getOffice } from "@/lib/config";

export const dynamic = "force-dynamic";

/** What the installed app opens: a set-up kiosk goes straight to its kiosk screen, everything else to staff login. */
export default async function Open() {
  const at = (await cookies()).get("cq_kiosk_at")?.value;
  if (await isKiosk()) redirect(getOffice(at && at in OFFICES ? at : "bplo").paths.kiosk);
  redirect(getOffice(at && at in OFFICES ? at : "bplo").paths.staff);
}
