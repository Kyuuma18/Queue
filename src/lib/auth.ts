import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const COOKIE = "cq_staff";

function secret() {
  const pin = process.env.STAFF_PIN;
  if (!pin) {
    if (process.env.NODE_ENV === "production") throw new Error("STAFF_PIN is not set");
    return "1234"; // local development only
  }
  return pin;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function checkPin(pin: unknown) {
  if (typeof pin !== "string") return false;
  const a = Buffer.from(pin);
  const b = Buffer.from(secret());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Session token: "<expiry>.<signature>", valid for 14 hours (one working day). */
export function makeToken() {
  const exp = String(Date.now() + 14 * 3600 * 1000);
  return `${exp}.${sign(exp)}`;
}

export async function isStaff() {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = sign(exp);
  return good.length === sig.length && timingSafeEqual(Buffer.from(good), Buffer.from(sig));
}
