"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OfficeId, counterLabel, getOffice } from "@/lib/config";
import { dayLabel } from "@/lib/dates";
import { statusLabel } from "@/lib/export";
import { useLang, useT } from "@/lib/i18n";
import type { ListRow } from "@/lib/queue";
import { manilaDay } from "@/lib/usePolling";

const time = (v: string | null) =>
  v ? new Date(v).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit" }) : "—";

/**
 * "Queue List": every number as a table, with search and filters. It opens on today's date.
 * "Export CSV" downloads exactly what the table shows, ready to open in Excel for the records.
 */
export function QueueListPanel({ office, onExpired }: { office: OfficeId; onExpired: () => void }) {
  const t = useT();
  const lang = useLang();
  const off = getOffice(office);
  const today = manilaDay();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [app, setApp] = useState("");
  const [q, setQ] = useState("");
  const [carried, setCarried] = useState(false);
  const [rows, setRows] = useState<ListRow[] | null>(null);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const p = new URLSearchParams({ office });
    if (from) p.set("from", from);
    if (to || from) p.set("to", to || from);
    if (status) p.set("status", status);
    if (type) p.set("type", type);
    if (app) p.set("app", app);
    if (q.trim()) p.set("q", q.trim());
    if (carried) p.set("carried", "1");
    return p.toString();
  }, [office, from, to, status, type, app, q, carried]);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/staff/list?${query}`, { cache: "no-store" });
      if (r.status === 401) return onExpired();
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setRows(j.rows);
      setError("");
    } catch (e: any) {
      setError(e.message ?? "Error");
    }
  }, [query, onExpired]);

  // Reload when a filter changes (typing in the search box waits a moment) and every 10 seconds.
  useEffect(() => {
    const id = setTimeout(load, 250);
    const poll = setInterval(() => document.visibilityState === "visible" && load(), 10000);
    return () => {
      clearTimeout(id);
      clearInterval(poll);
    };
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  function reset() {
    setFrom(today);
    setTo(today);
    setStatus("");
    setType("");
    setApp("");
    setQ("");
    setCarried(false);
  }

  const STATUS_TL: Record<string, string> = {
    waiting: "Naghihintay",
    serving: "Pinagsisilbihan",
    done: "Tapos",
    skipped: "Hindi sumipot",
    cancelled: "Kinansela",
  };
  const stLabel = (s: string) => (lang === "en" ? statusLabel(s) : STATUS_TL[s] ?? s);

  return (
    <section className="stack">
      <div className="row" style={{ alignItems: "center" }}>
        <h1 style={{ margin: 0, flex: 1 }}>{t("Listahan ng Pila", "Queue List")}</h1>
        <a className="btn btn-green btn-sm" href={`/api/staff/list?${query}&format=csv`} download>
          ⬇ {t("I-export (CSV)", "Export (CSV)")}
        </a>
        <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
          🖨 {t("I-print", "Print")}
        </button>
      </div>

      <div className="card filters no-print">
        <label className="fl">
          {t("Mula", "From")}
          <input className="field" type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="fl">
          {t("Hanggang", "To")}
          <input className="field" type="date" value={to} max={today} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="fl">
          {t("Katayuan", "Status")}
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t("Lahat", "All")}</option>
            {["waiting", "serving", "done", "skipped", "cancelled"].map((s) => (
              <option key={s} value={s === "skipped" ? "unclaimed" : s}>
                {stLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="fl">
          {t("Uri ng ticket", "Ticket type")}
          <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">{t("Lahat", "All")}</option>
            <option value="regular">REGULAR</option>
            <option value="priority">PRIORITY</option>
          </select>
        </label>
        {off.form && (
          <label className="fl">
            {t("Uri ng Aplikasyon", "Application Type")}
            <select className="field" value={app} onChange={(e) => setApp(e.target.value)}>
              <option value="">{t("Lahat", "All")}</option>
              {off.form.appTypes.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        )}
        <label className="fl search">
          {t("Hanapin", "Search")}
          <input
            className="field"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={off.form ? t("Numero o pangalan ng negosyo…", "Number or business name…") : t("Numero…", "Number…")}
          />
        </label>
        <label className="check-row">
          <input type="checkbox" checked={carried} onChange={(e) => setCarried(e.target.checked)} />
          {t("Isama ang hindi pa nakukuha mula sa mga nakaraang araw", "Include unclaimed numbers from earlier days")}
        </label>
        <button className="btn btn-ghost btn-sm" onClick={reset}>
          {t("Ngayong araw", "Reset to today")}
        </button>
      </div>

      {error && <div className="alert alert-red">{error}</div>}

      <div className="print-area">
        <p className="muted" style={{ margin: "0 0 8px" }}>
          {off.name} · {from === to || !to ? dayLabel(from, lang) : `${dayLabel(from, lang)} – ${dayLabel(to, lang)}`} ·{" "}
          <b>{rows?.length ?? 0}</b> {t("numero", "numbers")}
          {Object.entries(counts).map(([s, n]) => (
            <span key={s} className="pill" style={{ marginLeft: 6 }}>
              {stLabel(s)} {n}
            </span>
          ))}
        </p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("Numero", "No.")}</th>
                <th>{t("Uri", "Type")}</th>
                {off.form && <th>{t("Aplikasyon", "Application")}</th>}
                {off.form && <th>{t("Uri ng Negosyo", "Business type")}</th>}
                {off.form && <th>{t("Pangalan ng Negosyo", "Business name")}</th>}
                <th>{t("Katayuan", "Status")}</th>
                <th>Counter</th>
                <th>{t("Petsa", "Date")}</th>
                <th>{t("Kinuha", "Issued")}</th>
                <th>{t("Tinawag", "Called")}</th>
                <th>{t("Tapos", "Done")}</th>
              </tr>
            </thead>
            <tbody>
              {rows === null && (
                <tr>
                  <td colSpan={12} className="empty">
                    {t("Naglo-load…", "Loading…")}
                  </td>
                </tr>
              )}
              {rows?.length === 0 && (
                <tr>
                  <td colSpan={12} className="empty">
                    {t("Walang datos", "No current data")}
                  </td>
                </tr>
              )}
              {rows?.map((r) => (
                <tr key={r.id}>
                  <td className="n">{r.number}</td>
                  <td>{r.priority ? "★ PRIORITY" : "REGULAR"}</td>
                  {off.form && <td>{r.app_type ?? "—"}</td>}
                  {off.form && <td>{r.biz_type ?? "—"}</td>}
                  {off.form && <td className="name">{r.business_name ?? "—"}</td>}
                  <td>
                    <span className={`st st-${r.status}`}>{stLabel(r.status)}</span>
                  </td>
                  <td>{r.counter ? counterLabel(office, r.counter) : "—"}</td>
                  <td>{dayLabel(r.cday, lang)}</td>
                  <td>{time(r.created_at)}</td>
                  <td>{time(r.called_at)}</td>
                  <td>{time(r.done_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
