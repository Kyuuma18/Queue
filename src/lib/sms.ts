/**
 * SMS notifications via Semaphore (https://semaphore.co), a Philippine SMS gateway.
 * Set SEMAPHORE_API_KEY (and optionally SEMAPHORE_SENDER) in Vercel to turn texts on.
 * Without a key, messages are only written to the server log.
 */
export async function sendSms(phone: string, message: string) {
  const key = process.env.SEMAPHORE_API_KEY;
  if (!key) {
    console.log(`[sms disabled] to ${phone.slice(0, 4)}***: ${message}`);
    return;
  }
  const body = new URLSearchParams({ apikey: key, number: phone, message });
  if (process.env.SEMAPHORE_SENDER) body.set("sendername", process.env.SEMAPHORE_SENDER);
  const r = await fetch("https://api.semaphore.co/api/v4/messages", { method: "POST", body });
  if (!r.ok) console.error("[sms] failed", r.status, await r.text().catch(() => ""));
}
