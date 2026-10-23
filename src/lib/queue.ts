import { randomBytes } from "crypto";
import { getDb } from "./db";
import { COUNTERS, NOTIFY_WHEN_AHEAD, OFFICE_SHORT, SERVICES, counterLabel, serviceName } from "./config";
import { sendSms } from "./sms";

const TODAY = "(NOW() AT TIME ZONE 'Asia/Manila')::date";
// Priority clients first, then first come, first served.
const ORDER = "priority DESC, created_at ASC, id ASC";

export type Status = "waiting" | "serving" | "done" | "skipped" | "cancelled";

export interface Ticket {
  id: number;
  number: string;
  service: string;
  priority: boolean;
  phone: string | null;
  status: Status;
  counter: number | null;
  created_at: string;
  called_at: string | null;
  done_at: string | null;
  recalls: number;
  token: string | null;
}

/** What the public may see about a ticket (no phone number, no token). */
export type PublicTicket = Pick<Ticket, "id" | "number" | "service" | "priority" | "status" | "counter" | "called_at" | "recalls">;

const COLS = "id, number, service, priority, phone, status, counter, created_at, called_at, done_at, recalls, token";

export function toPublic(t: Ticket): PublicTicket {
  return {
    id: t.id,
    number: t.number,
    service: t.service,
    priority: t.priority,
    status: t.status,
    counter: t.counter,
    called_at: t.called_at,
    recalls: t.recalls,
  };
}

export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("63")) d = "0" + d.slice(2);
  if (d.length === 10 && d.startsWith("9")) d = "0" + d;
  if (!/^09\d{9}$/.test(d)) throw new Error("Please enter a valid mobile number (09XX XXX XXXX).");
  return d;
}

export async function createTicket(serviceCode: string, priority: boolean, phone: string | null) {
  if (!SERVICES.some((s) => s.code === serviceCode)) throw new Error("Unknown service");
  const db = await getDb();
  const token = randomBytes(9).toString("base64url");
  // Retry in the rare case two people press the button at the same instant.
  for (let attempt = 0; attempt < 5; attempt++) {
    const [{ n }] = await db.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM tickets WHERE day = ${TODAY} AND service = $1`,
      [serviceCode],
    );
    const number = (priority ? "P" : "") + serviceCode + String(n + 1 + attempt).padStart(3, "0");
    const dup = await db.query(`SELECT 1 FROM tickets WHERE day = ${TODAY} AND number = $1`, [number]);
    if (dup.length) continue;
    const [t] = await db.query<Ticket>(
      `INSERT INTO tickets (number, service, priority, phone, token) VALUES ($1, $2, $3, $4, $5) RETURNING ${COLS}`,
      [number, serviceCode, priority, phone, token],
    );
    const ahead = await countAhead(t);
    if (phone) {
      sendSms(
        phone,
        `Cainta ${OFFICE_SHORT}: Ang inyong numero ay ${t.number} (${serviceName(serviceCode)}). ${ahead} ang nauuna sa inyo. Ite-text namin kayo kapag malapit na.`,
      ).catch(() => {});
    }
    return { ticket: t, ahead };
  }
  throw new Error("Could not issue a number, please try again.");
}

export async function countAhead(t: Pick<Ticket, "id" | "service" | "priority" | "created_at" | "status">) {
  if (t.status !== "waiting") return 0;
  const db = await getDb();
  const [r] = await db.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM tickets
      WHERE day = ${TODAY} AND status = 'waiting' AND service = $1 AND id <> $2
        AND (priority > $3 OR (priority = $3 AND (created_at, id) < ($4::timestamptz, $2)))`,
    [t.service, t.id, t.priority, t.created_at],
  );
  return r.n;
}

export async function getTicket(id: number, token: string) {
  const db = await getDb();
  const [t] = await db.query<Ticket>(`SELECT ${COLS} FROM tickets WHERE id = $1`, [id]);
  if (!t || !t.token || t.token !== token) return null;
  return { ticket: t, ahead: await countAhead(t) };
}

export async function cancelTicket(id: number, token: string) {
  const db = await getDb();
  await db.query(`UPDATE tickets SET status = 'cancelled', done_at = NOW() WHERE id = $1 AND token = $2 AND status = 'waiting'`, [id, token]);
}

export async function getState() {
  const db = await getDb();
  const rows = await db.query<Ticket>(
    `SELECT ${COLS} FROM tickets WHERE day = ${TODAY} AND status IN ('waiting','serving','skipped','done') ORDER BY ${ORDER}`,
  );
  const serving = rows.filter((t) => t.status === "serving").sort((a, b) => (b.called_at ?? "").localeCompare(a.called_at ?? ""));
  const waiting = rows.filter((t) => t.status === "waiting");
  const skipped = rows.filter((t) => t.status === "skipped").sort((a, b) => (b.called_at ?? "").localeCompare(a.called_at ?? ""));
  const done = rows.filter((t) => t.status === "done").length;
  return {
    now: new Date().toISOString(),
    serving: serving.map(toPublic),
    waiting: waiting.map(toPublic),
    skipped: skipped.map(toPublic),
    stats: { done, waiting: waiting.length, serving: serving.length, unclaimed: skipped.length },
  };
}
export type QueueState = Awaited<ReturnType<typeof getState>>;

/* ───────────────────────── Staff actions ───────────────────────── */

async function finishCurrent(counter: number) {
  const db = await getDb();
  await db.query(
    `UPDATE tickets SET status = 'done', done_at = NOW() WHERE day = ${TODAY} AND status = 'serving' AND counter = $1`,
    [counter],
  );
}

export async function callNext(counter: number) {
  const c = COUNTERS.find((x) => x.id === counter);
  if (!c) throw new Error("Unknown counter");
  await finishCurrent(counter);
  const db = await getDb();
  const [t] = await db.query<Ticket>(
    `UPDATE tickets SET status = 'serving', counter = $1, called_at = NOW()
      WHERE id = (
        SELECT id FROM tickets
         WHERE day = ${TODAY} AND status = 'waiting' AND service = ANY($2::text[])
         ORDER BY ${ORDER}
         LIMIT 1 FOR UPDATE SKIP LOCKED)
      RETURNING ${COLS}`,
    [counter, c.services],
  );
  if (t) {
    if (t.phone) sendSms(t.phone, `Cainta ${OFFICE_SHORT}: Numero ${t.number}, kayo na po! Pumunta sa ${counterLabel(counter)}.`).catch(() => {});
    notifyNearlyThere(t.service).catch(() => {});
  }
  return t ?? null;
}

export async function callSpecific(counter: number, id: number) {
  await finishCurrent(counter);
  const db = await getDb();
  const [t] = await db.query<Ticket>(
    `UPDATE tickets SET status = 'serving', counter = $1, called_at = NOW(), recalls = recalls + CASE WHEN status = 'skipped' THEN 1 ELSE 0 END
      WHERE id = $2 AND day = ${TODAY} AND status IN ('waiting','skipped') RETURNING ${COLS}`,
    [counter, id],
  );
  if (!t) throw new Error("That number is no longer available.");
  if (t.phone) sendSms(t.phone, `Cainta ${OFFICE_SHORT}: Numero ${t.number}, kayo na po! Pumunta sa ${counterLabel(counter)}.`).catch(() => {});
  return t;
}

/** Announce the current number again (bumps called_at so screens re-announce). */
export async function recall(counter: number) {
  const db = await getDb();
  const [t] = await db.query<Ticket>(
    `UPDATE tickets SET called_at = NOW(), recalls = recalls + 1
      WHERE day = ${TODAY} AND status = 'serving' AND counter = $1 RETURNING ${COLS}`,
    [counter],
  );
  return t ?? null;
}

export async function complete(counter: number) {
  await finishCurrent(counter);
}

/** Client did not show up — moves to the "Unclaimed / Hindi sumipot" list. */
export async function markUnclaimed(counter: number) {
  const db = await getDb();
  await db.query(
    `UPDATE tickets SET status = 'skipped' WHERE day = ${TODAY} AND status = 'serving' AND counter = $1`,
    [counter],
  );
}

/** Send the client to another service (e.g. Renewal → Payment) keeping their number. */
export async function transfer(counter: number, toService: string) {
  if (!SERVICES.some((s) => s.code === toService)) throw new Error("Unknown service");
  const db = await getDb();
  const [t] = await db.query<Ticket>(
    `UPDATE tickets SET service = $2, status = 'waiting', counter = NULL, called_at = NULL, notified = FALSE
      WHERE day = ${TODAY} AND status = 'serving' AND counter = $1 RETURNING ${COLS}`,
    [counter, toService],
  );
  if (t?.phone) sendSms(t.phone, `Cainta ${OFFICE_SHORT}: Numero ${t.number}, hintayin po ang tawag para sa ${serviceName(toService)}.`).catch(() => {});
  return t ?? null;
}

/** Put an unclaimed number back at the front of the line. */
export async function requeue(id: number) {
  const db = await getDb();
  await db.query(`UPDATE tickets SET status = 'waiting', counter = NULL WHERE id = $1 AND status = 'skipped'`, [id]);
}

async function notifyNearlyThere(serviceCode: string) {
  const db = await getDb();
  const rows = await db.query<Ticket>(
    `SELECT ${COLS} FROM tickets WHERE day = ${TODAY} AND status = 'waiting' AND service = $1 ORDER BY ${ORDER} LIMIT $2`,
    [serviceCode, NOTIFY_WHEN_AHEAD + 1],
  );
  const t = rows[NOTIFY_WHEN_AHEAD];
  if (!t || !t.phone) return;
  const r = await db.query(`UPDATE tickets SET notified = TRUE WHERE id = $1 AND notified = FALSE RETURNING id`, [t.id]);
  if (r.length) {
    await sendSms(t.phone, `Cainta ${OFFICE_SHORT}: Numero ${t.number}, ${NOTIFY_WHEN_AHEAD} na lang ang nauuna sa inyo. Pumunta na po malapit sa counter.`);
  }
}
