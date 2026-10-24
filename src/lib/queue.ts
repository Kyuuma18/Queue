import { randomBytes } from "crypto";
import { getDb } from "./db";
import { NOTIFY_WHEN_AHEAD, counterLabel, getOffice, serviceName } from "./config";
import { sendSms } from "./sms";

const TODAY = "(NOW() AT TIME ZONE 'Asia/Manila')::date";
// The Manila calendar day a ticket was issued on. Numbers restart at 1 each day by counting these.
const ISSUED_DAY = "(created_at AT TIME ZONE 'Asia/Manila')::date";
// Priority clients first, then first come, first served.
const ORDER = "priority DESC, created_at ASC, id ASC";

export type Status = "waiting" | "serving" | "done" | "skipped" | "cancelled";

export interface Ticket {
  id: number;
  office: string;
  number: string;
  service: string;
  priority: boolean;
  phone: string | null;
  status: Status;
  counter: number | null;
  created_at: string;
  /** Day the ticket was issued, "YYYY-MM-DD" (Manila). Older than today = carried over from an earlier day. */
  cday: string;
  called_at: string | null;
  done_at: string | null;
  recalls: number;
  token: string | null;
  /** Details staff type in when they create a ticket (GSO). Never sent to the public screens. */
  app_type: string | null;
  biz_type: string | null;
  business_name: string | null;
}

/** What the public may see about a ticket (no phone number, no token). */
export type PublicTicket = Pick<
  Ticket,
  "id" | "office" | "number" | "service" | "priority" | "status" | "counter" | "called_at" | "recalls" | "cday"
>;

const COLS = `id, office, number, service, priority, phone, status, counter, created_at,
  to_char(${ISSUED_DAY}, 'YYYY-MM-DD') AS cday, called_at, done_at, recalls, token, app_type, biz_type, business_name`;

export function toPublic(t: Ticket): PublicTicket {
  return {
    id: t.id,
    office: t.office,
    number: t.number,
    service: t.service,
    priority: t.priority,
    status: t.status,
    counter: t.counter,
    called_at: t.called_at,
    recalls: t.recalls,
    cday: t.cday,
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

/** Details staff type in when they create a ticket. */
export interface TicketDetails {
  appType?: string;
  bizType?: string;
  businessName?: string;
}

/** Check the create-ticket form for an office that uses one (GSO) and tidy the text. */
export function validateDetails(officeId: unknown, d: TicketDetails): Required<TicketDetails> {
  const off = getOffice(officeId);
  const appType = String(d.appType ?? "").trim().toUpperCase();
  const bizType = String(d.bizType ?? "").trim().toUpperCase();
  const businessName = String(d.businessName ?? "").trim().replace(/\s+/g, " ");
  if (off.form) {
    if (!off.form.appTypes.includes(appType)) throw new Error("Please choose the application type.");
    if (!off.form.bizTypes.includes(bizType)) throw new Error("Please choose the business type.");
    if (!businessName) throw new Error("Please enter the business name.");
  }
  if (businessName.length > 120) throw new Error("The business name is too long.");
  return { appType, bizType, businessName };
}

/** How many numbers this office has issued today, counting the line the number belongs to. */
async function issuedToday(office: string, serviceCode: string, running: boolean) {
  const db = await getDb();
  const [{ n }] = await db.query<{ n: number }>(
    running
      ? `SELECT COUNT(*)::int AS n FROM tickets WHERE office = $1 AND ${ISSUED_DAY} = ${TODAY}`
      : `SELECT COUNT(*)::int AS n FROM tickets WHERE office = $1 AND service = $2 AND ${ISSUED_DAY} = ${TODAY}`,
    running ? [office] : [office, serviceCode],
  );
  return n;
}

function formatNumber(off: ReturnType<typeof getOffice>, serviceCode: string, priority: boolean, seq: number) {
  const letter = off.numbering === "running" ? "" : serviceCode;
  return (priority ? "P" : "") + letter + String(seq).padStart(3, "0");
}

/** The number the next ticket will get (shown as the "Folder Number" on the create-ticket form). */
export async function nextNumber(officeId: unknown, priority: boolean, serviceCode?: string) {
  const off = getOffice(officeId);
  const code = serviceCode ?? off.services[0].code;
  const n = await issuedToday(off.id, code, off.numbering === "running");
  return formatNumber(off, code, priority, n + 1);
}

export async function createTicket(
  officeId: unknown,
  serviceCode: string,
  priority: boolean,
  phone: string | null,
  details: TicketDetails = {},
) {
  const off = getOffice(officeId);
  if (!off.services.some((s) => s.code === serviceCode)) throw new Error("Unknown service");
  const db = await getDb();
  const token = randomBytes(9).toString("base64url");
  const text = (v?: string) => (v ? String(v).trim().slice(0, 120) || null : null);
  // Retry in the rare case two people press the button at the same instant.
  for (let attempt = 0; attempt < 5; attempt++) {
    // Numbers start again at 1 every day: only tickets issued today are counted.
    const n = await issuedToday(off.id, serviceCode, off.numbering === "running");
    const number = formatNumber(off, serviceCode, priority, n + 1 + attempt);
    const dup = await db.query(`SELECT 1 FROM tickets WHERE office = $1 AND number = $2 AND ${ISSUED_DAY} = ${TODAY}`, [off.id, number]);
    if (dup.length) continue;
    const [t] = await db.query<Ticket>(
      `INSERT INTO tickets (office, number, service, priority, phone, token, app_type, biz_type, business_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING ${COLS}`,
      [off.id, number, serviceCode, priority, phone, token, text(details.appType), text(details.bizType), text(details.businessName)],
    );
    const ahead = await countAhead(t);
    if (phone) {
      sendSms(
        phone,
        `Cainta ${off.short}: Ang inyong numero ay ${t.number} (${serviceName(serviceCode)}). ${ahead} ang nauuna sa inyo. Ite-text namin kayo kapag malapit na.`,
      ).catch(() => {});
    }
    return { ticket: t, ahead };
  }
  throw new Error("Could not issue a number, please try again.");
}

export async function countAhead(t: Pick<Ticket, "id" | "office" | "service" | "priority" | "created_at" | "status">) {
  if (t.status !== "waiting") return 0;
  const db = await getDb();
  const [r] = await db.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM tickets
      WHERE day = ${TODAY} AND status = 'waiting' AND office = $5 AND service = $1 AND id <> $2
        AND (priority > $3 OR (priority = $3 AND (created_at, id) < ($4::timestamptz, $2)))`,
    [t.service, t.id, t.priority, t.created_at, t.office],
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

/** A number left "serving" from an earlier day was never closed: keep it on the unclaimed list so it is not lost. */
async function closeStale() {
  const db = await getDb();
  await db.query(`UPDATE tickets SET status = 'skipped' WHERE status = 'serving' AND day < ${TODAY}`);
}

export async function getState(officeId: unknown) {
  const off = getOffice(officeId);
  const db = await getDb();
  await closeStale();
  // Today's line, plus every unclaimed number from any earlier day (they stay until claimed).
  const rows = await db.query<Ticket>(
    `SELECT ${COLS} FROM tickets
      WHERE office = $1
        AND ((day = ${TODAY} AND status IN ('waiting','serving','skipped','done')) OR status = 'skipped')
      ORDER BY ${ORDER}`,
    [off.id],
  );
  // called_at comes back from the database as a Date, so compare times as numbers (most recent first).
  const when = (t: Ticket) => (t.called_at ? new Date(t.called_at).getTime() : 0);
  const serving = rows.filter((t) => t.status === "serving").sort((a, b) => when(b) - when(a));
  const waiting = rows.filter((t) => t.status === "waiting");
  const skipped = rows.filter((t) => t.status === "skipped").sort((a, b) => when(b) - when(a));
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

async function finishCurrent(office: string, counter: number) {
  const db = await getDb();
  await db.query(
    `UPDATE tickets SET status = 'done', done_at = NOW() WHERE day = ${TODAY} AND status = 'serving' AND office = $2 AND counter = $1`,
    [counter, office],
  );
}

export async function callNext(officeId: unknown, counter: number) {
  const off = getOffice(officeId);
  const c = off.counters.find((x) => x.id === counter);
  if (!c) throw new Error("Unknown counter");
  await finishCurrent(off.id, counter);
  const db = await getDb();
  const [t] = await db.query<Ticket>(
    `UPDATE tickets SET status = 'serving', counter = $1, called_at = NOW()
      WHERE id = (
        SELECT id FROM tickets
         WHERE day = ${TODAY} AND status = 'waiting' AND office = $3 AND service = ANY($2::text[])
         ORDER BY ${ORDER}
         LIMIT 1 FOR UPDATE SKIP LOCKED)
      RETURNING ${COLS}`,
    [counter, c.services, off.id],
  );
  if (t) {
    if (t.phone) sendSms(t.phone, `Cainta ${off.short}: Numero ${t.number}, kayo na po! Pumunta sa ${counterLabel(off.id, counter)}.`).catch(() => {});
    notifyNearlyThere(off.id, t.service).catch(() => {});
  }
  return t ?? null;
}

/** Call a particular number. An unclaimed number from an earlier day can be called too: it becomes today's work. */
export async function callSpecific(officeId: unknown, counter: number, id: number) {
  const off = getOffice(officeId);
  await finishCurrent(off.id, counter);
  const db = await getDb();
  const [t] = await db.query<Ticket>(
    `UPDATE tickets SET status = 'serving', counter = $1, called_at = NOW(), day = ${TODAY},
            recalls = recalls + CASE WHEN status = 'skipped' THEN 1 ELSE 0 END
      WHERE id = $2 AND office = $3 AND ((day = ${TODAY} AND status = 'waiting') OR status = 'skipped') RETURNING ${COLS}`,
    [counter, id, off.id],
  );
  if (!t) throw new Error("That number is no longer available.");
  if (t.phone) sendSms(t.phone, `Cainta ${off.short}: Numero ${t.number}, kayo na po! Pumunta sa ${counterLabel(off.id, counter)}.`).catch(() => {});
  return t;
}

/** Announce the current number again (bumps called_at so screens re-announce). */
export async function recall(officeId: unknown, counter: number) {
  const off = getOffice(officeId);
  const db = await getDb();
  const [t] = await db.query<Ticket>(
    `UPDATE tickets SET called_at = NOW(), recalls = recalls + 1
      WHERE day = ${TODAY} AND status = 'serving' AND office = $2 AND counter = $1 RETURNING ${COLS}`,
    [counter, off.id],
  );
  return t ?? null;
}

export async function complete(officeId: unknown, counter: number) {
  await finishCurrent(getOffice(officeId).id, counter);
}

/** Client did not show up (or did not collect it) — moves to the "Unclaimed / Hindi sumipot" list, which keeps it until claimed. */
export async function markUnclaimed(officeId: unknown, counter: number) {
  const off = getOffice(officeId);
  const db = await getDb();
  await db.query(
    `UPDATE tickets SET status = 'skipped' WHERE day = ${TODAY} AND status = 'serving' AND office = $2 AND counter = $1`,
    [counter, off.id],
  );
}

/** Send the client to another service (e.g. Renewal → Payment) keeping their number. */
export async function transfer(officeId: unknown, counter: number, toService: string) {
  const off = getOffice(officeId);
  if (!off.services.some((s) => s.code === toService)) throw new Error("Unknown service");
  const db = await getDb();
  const [t] = await db.query<Ticket>(
    `UPDATE tickets SET service = $2, status = 'waiting', counter = NULL, called_at = NULL, notified = FALSE
      WHERE day = ${TODAY} AND status = 'serving' AND office = $3 AND counter = $1 RETURNING ${COLS}`,
    [counter, toService, off.id],
  );
  if (t?.phone) sendSms(t.phone, `Cainta ${off.short}: Numero ${t.number}, hintayin po ang tawag para sa ${serviceName(toService)}.`).catch(() => {});
  return t ?? null;
}

/** Put an unclaimed number back at the front of today's line (an older number keeps its place at the front). */
export async function requeue(officeId: unknown, id: number) {
  const off = getOffice(officeId);
  const db = await getDb();
  await db.query(
    `UPDATE tickets SET status = 'waiting', counter = NULL, day = ${TODAY} WHERE id = $1 AND office = $2 AND status = 'skipped'`,
    [id, off.id],
  );
}

/* ───────────────────────── Queue list (staff only) ───────────────────────── */

export interface ListFilter {
  /** Issue day range, "YYYY-MM-DD". Missing means today. */
  from?: string;
  to?: string;
  /** waiting | serving | done | unclaimed | cancelled — empty means all. */
  status?: string;
  /** regular | priority — empty means both. */
  type?: string;
  /** Application type, e.g. RENEWAL — empty means all. */
  app?: string;
  /** Search the queue number and the business name. */
  q?: string;
  /** Also list unclaimed numbers from earlier days, whatever the date range. */
  carried?: boolean;
}

export type ListRow = Pick<
  Ticket,
  "id" | "number" | "service" | "priority" | "status" | "counter" | "cday" | "created_at" | "called_at" | "done_at" | "app_type" | "biz_type" | "business_name"
>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES: Record<string, string> = { waiting: "waiting", serving: "serving", done: "done", unclaimed: "skipped", cancelled: "cancelled" };

/** Every ticket matching the filter (default: issued today), oldest first. Includes business names, so staff only. */
export async function listTickets(officeId: unknown, f: ListFilter = {}): Promise<ListRow[]> {
  const off = getOffice(officeId);
  const db = await getDb();
  const from = f.from && DATE.test(f.from) ? f.from : null;
  const to = f.to && DATE.test(f.to) ? f.to : from;
  const status = f.status ? STATUSES[f.status] ?? null : null;
  if (f.status && !status) throw new Error("Unknown status");
  const type = f.type === "priority" || f.type === "regular" ? f.type : "";
  const app = f.app ? f.app.trim().toUpperCase() : null;
  const q = f.q?.trim() ? `%${f.q.trim().replace(/[\\%_]/g, "\\$&")}%` : null;
  await closeStale();
  const rows = await db.query<Ticket>(
    `SELECT ${COLS} FROM tickets
      WHERE office = $1
        AND ((${ISSUED_DAY} BETWEEN COALESCE($2::date, ${TODAY}) AND COALESCE($3::date, ${TODAY})) OR ($4::boolean AND status = 'skipped'))
        AND ($5::text IS NULL OR status = $5)
        AND ($6::text = '' OR ($6 = 'priority' AND priority) OR ($6 = 'regular' AND NOT priority))
        AND ($7::text IS NULL OR app_type = $7)
        AND ($8::text IS NULL OR number ILIKE $8 OR business_name ILIKE $8)
      ORDER BY created_at ASC, id ASC
      LIMIT 5000`,
    [off.id, from, to, !!f.carried, status, type, app, q],
  );
  return rows.map((t) => ({
    id: t.id,
    number: t.number,
    service: t.service,
    priority: t.priority,
    status: t.status,
    counter: t.counter,
    cday: t.cday,
    created_at: t.created_at,
    called_at: t.called_at,
    done_at: t.done_at,
    app_type: t.app_type,
    biz_type: t.biz_type,
    business_name: t.business_name,
  }));
}

/** The document or release was collected: take it off the unclaimed list. */
export async function markClaimed(officeId: unknown, id: number) {
  const off = getOffice(officeId);
  const db = await getDb();
  await db.query(
    `UPDATE tickets SET status = 'done', done_at = NOW(), day = ${TODAY} WHERE id = $1 AND office = $2 AND status = 'skipped'`,
    [id, off.id],
  );
}

async function notifyNearlyThere(office: string, serviceCode: string) {
  const off = getOffice(office);
  const db = await getDb();
  const rows = await db.query<Ticket>(
    `SELECT ${COLS} FROM tickets WHERE day = ${TODAY} AND status = 'waiting' AND office = $3 AND service = $1 ORDER BY ${ORDER} LIMIT $2`,
    [serviceCode, NOTIFY_WHEN_AHEAD + 1, off.id],
  );
  const t = rows[NOTIFY_WHEN_AHEAD];
  if (!t || !t.phone) return;
  const r = await db.query(`UPDATE tickets SET notified = TRUE WHERE id = $1 AND notified = FALSE RETURNING id`, [t.id]);
  if (r.length) {
    await sendSms(t.phone, `Cainta ${off.short}: Numero ${t.number}, ${NOTIFY_WHEN_AHEAD} na lang ang nauuna sa inyo. Pumunta na po malapit sa counter.`);
  }
}
