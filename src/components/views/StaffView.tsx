"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TopBar } from "@/components/Brand";
import { CreateTicketPanel } from "@/components/staff/CreateTicketPanel";
import { QueueListPanel } from "@/components/staff/QueueListPanel";
import { OfficeId, getOffice, service } from "@/lib/config";
import { dayLabel, isCarried } from "@/lib/dates";
import { manilaDay, useQueueState } from "@/lib/usePolling";
import { useLang, useT } from "@/lib/i18n";

/* ───────── PIN login ───────── */
function Login({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(p: string) {
    setBusy(true);
    setError("");
    const r = await fetch("/api/staff/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: p }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) onDone();
    else {
      setError(
        r.status === 429
          ? t("Napakaraming subok. Maghintay ng isang minuto.", "Too many tries. Please wait a minute.")
          : t("Maling PIN", "Wrong PIN"),
      );
      setPin("");
    }
  }

  function press(k: string) {
    if (busy) return;
    if (k === "⌫") return setPin((p) => p.slice(0, -1));
    if (k === "OK") return pin && submit(pin);
    if (pin.length < 8) setPin(pin + k);
  }

  return (
    <main className="wrap" style={{ maxWidth: 440 }}>
      <h1 style={{ textAlign: "center" }}>
        {t("Pag-login ng Staff", "Staff Login")}
        <span className="tl">{t("Ilagay ang PIN", "Enter your PIN")}</span>
      </h1>
      <div className="pin-dots" aria-label={t(`${pin.length} na numero ang naipasok`, `${pin.length} digits entered`)}>
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <span key={i} className={i < pin.length ? "on" : ""} />
        ))}
      </div>
      {error && (
        <div className="alert alert-red" role="alert" style={{ marginBottom: 14, textAlign: "center" }}>
          {error}
        </div>
      )}
      <div className="keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"].map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            style={k === "OK" ? { background: "var(--navy)", color: "#fff", borderColor: "var(--navy)" } : undefined}
            aria-label={k === "⌫" ? t("Burahin", "Delete") : k}
          >
            {k}
          </button>
        ))}
      </div>
    </main>
  );
}

/* ───────── Counter picker ───────── */
function PickCounter({ office, onPick }: { office: OfficeId; onPick: (id: number) => void }) {
  const off = getOffice(office);
  const t = useT();
  const lang = useLang();
  return (
    <main className="wrap stack">
      <h1>{t("Aling counter kayo?", "Which counter are you at?")}</h1>
      <div className="grid-2">
        {off.counters.map((c) => (
          <button key={c.id} className="choice" onClick={() => onPick(c.id)}>
            <span className="choice-icon" aria-hidden style={{ fontWeight: 800, fontSize: 30, color: "var(--navy)" }}>
              {c.id}
            </span>
            <span>
              <span className="choice-title">{c.label}</span>
              <span className="choice-sub" style={{ display: "block" }}>
                {c.services.map((s) => (lang === "en" ? service(s)?.name : service(s)?.tl)).join(" · ")}
              </span>
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}

/* ───────── Main counter screen ───────── */
export function StaffView({ office }: { office: OfficeId }) {
  const off = getOffice(office);
  const counterKey = `cq_counter_${office}`; // each office remembers its own counter
  const t = useT();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [counter, setCounter] = useState<number | null>(null);
  // Staff area: the counter desk, (GSO) the create-ticket form, and the queue list table.
  const [view, setView] = useState<"counter" | "create" | "list">("counter");
  const expired = useCallback(() => setAuthed(false), []);

  useEffect(() => {
    fetch("/api/staff/login")
      .then((r) => r.json())
      .then((j) => setAuthed(!!j.ok))
      .catch(() => setAuthed(false));
    try {
      const c = Number(localStorage.getItem(counterKey));
      if (off.counters.some((x) => x.id === c)) setCounter(c);
    } catch {}
  }, []);

  function pick(id: number | null) {
    setCounter(id);
    try {
      if (id) localStorage.setItem(counterKey, String(id));
      else localStorage.removeItem(counterKey);
    } catch {}
  }

  async function logout() {
    await fetch("/api/staff/logout", { method: "POST" });
    setAuthed(false);
  }

  return (
    <>
      <TopBar office={office} subtitle={`${t("Kawani", "Staff")} · ${off.short}`} />
      {authed === null ? (
        <main className="wrap">
          <p className="lead">{t("Naglo-load…", "Loading…")}</p>
        </main>
      ) : !authed ? (
        <Login onDone={() => setAuthed(true)} />
      ) : (
        <>
          <nav className="wrap wrap-wide staff-nav no-print" aria-label={t("Mga seksyon ng staff", "Staff sections")}>
            <div className="tabs">
              <button aria-pressed={view === "counter"} onClick={() => setView("counter")}>
                {t("Counter", "Counter")}
              </button>
              {off.form && (
                <button aria-pressed={view === "create"} onClick={() => setView("create")}>
                  {t("Gumawa ng Ticket", "Create Ticket")}
                </button>
              )}
              <button aria-pressed={view === "list"} onClick={() => setView("list")}>
                {t("Listahan ng Pila", "Queue List")}
              </button>
              <a className="tab-link" href={off.paths.display} target="_blank" rel="noreferrer">
                📺 {t("Queue Monitoring", "Queue Monitoring")}
              </a>
              <button onClick={logout}>{t("Mag-logout", "Logout")}</button>
            </div>
          </nav>
          {view === "create" && off.form ? (
            <main className="wrap wrap-wide">
              <CreateTicketPanel office={office} onExpired={expired} />
            </main>
          ) : view === "list" ? (
            <main className="wrap wrap-wide">
              <QueueListPanel office={office} onExpired={expired} />
            </main>
          ) : !counter ? (
            <PickCounter office={office} onPick={pick} />
          ) : (
            <CounterDesk office={office} counter={counter} onChange={() => pick(null)} onLogout={logout} onExpired={expired} />
          )}
        </>
      )}
    </>
  );
}

function CounterDesk({
  office,
  counter,
  onChange,
  onLogout,
  onExpired,
}: {
  office: OfficeId;
  counter: number;
  onChange: () => void;
  onLogout: () => void;
  onExpired: () => void;
}) {
  const off = getOffice(office);
  const t = useT();
  const lang = useLang();
  const today = manilaDay();
  const sname = (s?: { name: string; tl: string }) => (lang === "en" ? s?.name : s?.tl);
  const { state, error, reload } = useQueueState(3000, office);
  const c = off.counters.find((x) => x.id === counter)!;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<"waiting" | "unclaimed">("waiting");
  const [search, setSearch] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);

  const mine = state?.serving.find((t) => t.counter === counter) ?? null;
  const myWaiting = useMemo(
    () => (state?.waiting ?? []).filter((t) => (c.services as string[]).includes(t.service)),
    [state, c],
  );
  const list = (tab === "waiting" ? myWaiting : state?.skipped ?? []).filter((t) =>
    t.number.toLowerCase().includes(search.trim().toLowerCase()),
  );

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/staff/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ office, action, counter, ...extra }),
      });
      const j = await r.json();
      if (r.status === 401) return onExpired();
      if (!r.ok) throw new Error(j.error);
      if (action === "next" && !j.ticket) setMsg(t("Wala nang naghihintay.", "No one is waiting."));
      setShowTransfer(false);
      await reload();
    } catch (e: any) {
      setMsg(e.message ?? t("May problema.", "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  const s = mine ? service(mine.service) : null;

  return (
    <main className="wrap wrap-wide">
      <div className="row" style={{ alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0, flex: 1 }}>{c.label}</h1>
        <button className="btn btn-ghost btn-sm" onClick={onChange}>
          {t("Palitan", "Change")}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onLogout}>
          {t("Mag-logout", "Logout")}
        </button>
      </div>

      <div className="staff-grid">
        <section className="card stack">
          <div className="serving-box">
            <div className="eyebrow">{t("Kasalukuyang pinagsisilbihan", "Now serving")}</div>
            <div className="serving-num">{mine?.number ?? "—"}</div>
            {mine && (
              <div style={{ marginTop: 8 }}>
                <span className="pill">
                  {s?.icon} {sname(s ?? undefined)}
                </span>{" "}
                {mine.priority && (
                  <span className="pill pill-gold">{t("★ Priority — tingnan ang ID", "★ Priority — check ID")}</span>
                )}
              </div>
            )}
          </div>

          {msg && (
            <div className="alert alert-red" role="status">
              {msg}
            </div>
          )}
          {error && <div className="alert alert-red">{error}</div>}

          <div className="action-grid">
            <button className="btn btn-green btn-xl span-2" disabled={busy} onClick={() => act("next")}>
              ▶ {t("Tawagin ang Susunod", "Call Next")}
            </button>
            <button className="btn btn-ghost" disabled={busy || !mine} onClick={() => act("recall")}>
              🔊 {t("Tawagin Ulit", "Recall")}
            </button>
            <button className="btn btn-primary" disabled={busy || !mine} onClick={() => act("complete")}>
              ✔ {t("Tapos", "Complete")}
            </button>
            <button className="btn btn-red" disabled={busy || !mine} onClick={() => act("unclaimed")}>
              ✖ {t("Hindi Sumipot", "No-show")}
            </button>
            <button className="btn btn-gold" disabled={busy || !mine} onClick={() => setShowTransfer((v) => !v)}>
              ⇄ {t("Ilipat", "Transfer")}
            </button>
          </div>

          {showTransfer && mine && (
            <div className="stack" style={{ gap: 10 }}>
              <b>{t("Ilipat sa:", "Send this client to:")}</b>
              {off.services.filter((x) => x.code !== mine.service).map((x) => (
                <button key={x.code} className="choice" style={{ minHeight: 76 }} disabled={busy} onClick={() => act("transfer", { service: x.code })}>
                  <span className="choice-icon" aria-hidden style={{ width: 52, height: 52, fontSize: 26 }}>
                    {x.icon}
                  </span>
                  <span className="choice-title">{sname(x)}</span>
                </button>
              ))}
            </div>
          )}

          {state && (
            <div className="bigstat" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", margin: 0 }}>
              <div>
                <b>{myWaiting.length}</b>
                <small>{t("Naghihintay", "Waiting")}</small>
              </div>
              <div>
                <b>{state.stats.done}</b>
                <small>{t("Tapos ngayon", "Done today")}</small>
              </div>
              <div>
                <b>{state.stats.unclaimed}</b>
                <small>{t("Hindi sumipot", "No-show")}</small>
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <div className="tabs" role="group">
            <button aria-pressed={tab === "waiting"} onClick={() => setTab("waiting")}>
              {t("Naghihintay", "Waiting")} ({myWaiting.length})
            </button>
            <button aria-pressed={tab === "unclaimed"} onClick={() => setTab("unclaimed")}>
              {t("Hindi Sumipot", "No-show")} ({state?.skipped.length ?? 0})
            </button>
          </div>
          <input
            className="field"
            style={{ minHeight: 56, fontSize: "1em", letterSpacing: 0 }}
            placeholder={t("Hanapin ang numero", "Search number")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className="list" style={{ marginTop: 8 }}>
            {list.length === 0 && <li style={{ color: "var(--muted)" }}>{t("Walang laman", "Nothing here")}</li>}
            {list.slice(0, 40).map((tk) => (
              <li key={tk.id}>
                <span className="n">{tk.number}</span>
                <span className="grow">
                  {sname(service(tk.service))}
                  {tk.priority && (
                    <>
                      {" "}
                      <span className="pill pill-gold" style={{ fontSize: "0.8em", padding: "2px 8px" }}>
                        ★
                      </span>
                    </>
                  )}
                  {isCarried(tk.cday, today) && (
                    <>
                      {" "}
                      <span className="pill" style={{ fontSize: "0.8em", padding: "2px 8px" }}>
                        {t("Mula", "From")} {dayLabel(tk.cday, lang)}
                      </span>
                    </>
                  )}
                </span>
                {tab === "unclaimed" && (
                  <>
                    <button className="btn btn-green btn-sm" disabled={busy} onClick={() => act("claimed", { id: tk.id })}>
                      {t("Nakuha na", "Claimed")}
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act("requeue", { id: tk.id })}>
                      {t("Ibalik", "Put back")}
                    </button>
                  </>
                )}
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => act("call", { id: tk.id })}>
                  {t("Tawagin", "Call")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
