"use client";
import { useEffect, useMemo, useState } from "react";
import { TopBar } from "@/components/Brand";
import { COUNTERS, SERVICES, service } from "@/lib/config";
import { useQueueState } from "@/lib/usePolling";

/* ───────── PIN login ───────── */
function Login({ onDone }: { onDone: () => void }) {
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
      setError(j.error ?? "Wrong PIN");
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
        Staff Login <span className="tl">Ilagay ang PIN</span>
      </h1>
      <div className="pin-dots" aria-label={`${pin.length} digits entered`}>
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
            aria-label={k === "⌫" ? "Delete" : k}
          >
            {k}
          </button>
        ))}
      </div>
    </main>
  );
}

/* ───────── Counter picker ───────── */
function PickCounter({ onPick }: { onPick: (id: number) => void }) {
  return (
    <main className="wrap stack">
      <h1>
        Aling counter kayo? <span className="tl">Which counter are you at?</span>
      </h1>
      <div className="grid-2">
        {COUNTERS.map((c) => (
          <button key={c.id} className="choice" onClick={() => onPick(c.id)}>
            <span className="choice-icon" aria-hidden style={{ fontWeight: 800, fontSize: 30, color: "var(--navy)" }}>
              {c.id}
            </span>
            <span>
              <span className="choice-title">{c.label}</span>
              <span className="choice-sub" style={{ display: "block" }}>
                {c.services.map((s) => service(s)?.name).join(" · ")}
              </span>
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}

/* ───────── Main counter screen ───────── */
export default function Staff() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [counter, setCounter] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/staff/login")
      .then((r) => r.json())
      .then((j) => setAuthed(!!j.ok))
      .catch(() => setAuthed(false));
    try {
      const c = Number(localStorage.getItem("cq_counter"));
      if (COUNTERS.some((x) => x.id === c)) setCounter(c);
    } catch {}
  }, []);

  function pick(id: number | null) {
    setCounter(id);
    try {
      if (id) localStorage.setItem("cq_counter", String(id));
      else localStorage.removeItem("cq_counter");
    } catch {}
  }

  async function logout() {
    await fetch("/api/staff/logout", { method: "POST" });
    setAuthed(false);
  }

  return (
    <>
      <TopBar subtitle="Staff · Counter" />
      {authed === null ? (
        <main className="wrap">
          <p className="lead">Loading…</p>
        </main>
      ) : !authed ? (
        <Login onDone={() => setAuthed(true)} />
      ) : !counter ? (
        <PickCounter onPick={pick} />
      ) : (
        <CounterDesk counter={counter} onChange={() => pick(null)} onLogout={logout} onExpired={() => setAuthed(false)} />
      )}
    </>
  );
}

function CounterDesk({
  counter,
  onChange,
  onLogout,
  onExpired,
}: {
  counter: number;
  onChange: () => void;
  onLogout: () => void;
  onExpired: () => void;
}) {
  const { state, error, reload } = useQueueState(3000);
  const c = COUNTERS.find((x) => x.id === counter)!;
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
        body: JSON.stringify({ action, counter, ...extra }),
      });
      const j = await r.json();
      if (r.status === 401) return onExpired();
      if (!r.ok) throw new Error(j.error);
      if (action === "next" && !j.ticket) setMsg("Wala nang naghihintay. · No one is waiting.");
      setShowTransfer(false);
      await reload();
    } catch (e: any) {
      setMsg(e.message ?? "Something went wrong");
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
          Palitan · Change
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onLogout}>
          Logout
        </button>
      </div>

      <div className="staff-grid">
        <section className="card stack">
          <div className="serving-box">
            <div className="eyebrow">Kasalukuyang pinagsisilbihan · Now serving</div>
            <div className="serving-num">{mine?.number ?? "—"}</div>
            {mine && (
              <div style={{ marginTop: 8 }}>
                <span className="pill">
                  {s?.icon} {s?.name}
                </span>{" "}
                {mine.priority && <span className="pill pill-gold">★ Priority — check ID</span>}
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
              ▶ Tawagin ang Susunod · Call Next
            </button>
            <button className="btn btn-ghost" disabled={busy || !mine} onClick={() => act("recall")}>
              🔊 Tawagin Ulit · Recall
            </button>
            <button className="btn btn-primary" disabled={busy || !mine} onClick={() => act("complete")}>
              ✔ Tapos · Complete
            </button>
            <button className="btn btn-red" disabled={busy || !mine} onClick={() => act("unclaimed")}>
              ✖ Hindi Sumipot · No-show
            </button>
            <button className="btn btn-gold" disabled={busy || !mine} onClick={() => setShowTransfer((v) => !v)}>
              ⇄ Ilipat · Transfer
            </button>
          </div>

          {showTransfer && mine && (
            <div className="stack" style={{ gap: 10 }}>
              <b>Ilipat sa · Send this client to:</b>
              {SERVICES.filter((x) => x.code !== mine.service).map((x) => (
                <button key={x.code} className="choice" style={{ minHeight: 76 }} disabled={busy} onClick={() => act("transfer", { service: x.code })}>
                  <span className="choice-icon" aria-hidden style={{ width: 52, height: 52, fontSize: 26 }}>
                    {x.icon}
                  </span>
                  <span className="choice-title">{x.name}</span>
                </button>
              ))}
            </div>
          )}

          {state && (
            <div className="bigstat" style={{ gridTemplateColumns: "repeat(3, 1fr)", margin: 0 }}>
              <div>
                <b>{myWaiting.length}</b>
                <small>Waiting</small>
              </div>
              <div>
                <b>{state.stats.done}</b>
                <small>Done today</small>
              </div>
              <div>
                <b>{state.stats.unclaimed}</b>
                <small>No-show</small>
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <div className="tabs" role="group">
            <button aria-pressed={tab === "waiting"} onClick={() => setTab("waiting")}>
              Naghihintay ({myWaiting.length})
            </button>
            <button aria-pressed={tab === "unclaimed"} onClick={() => setTab("unclaimed")}>
              Hindi Sumipot ({state?.skipped.length ?? 0})
            </button>
          </div>
          <input
            className="field"
            style={{ minHeight: 56, fontSize: "1em", letterSpacing: 0 }}
            placeholder="Hanapin ang numero · Search number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className="list" style={{ marginTop: 8 }}>
            {list.length === 0 && <li style={{ color: "var(--muted)" }}>Walang laman · Nothing here</li>}
            {list.slice(0, 40).map((t) => (
              <li key={t.id}>
                <span className="n">{t.number}</span>
                <span className="grow">
                  {service(t.service)?.name}
                  {t.priority && (
                    <>
                      {" "}
                      <span className="pill pill-gold" style={{ fontSize: "0.8em", padding: "2px 8px" }}>
                        ★
                      </span>
                    </>
                  )}
                </span>
                {tab === "unclaimed" && (
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act("requeue", { id: t.id })}>
                    Ibalik
                  </button>
                )}
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => act("call", { id: t.id })}>
                  Tawagin
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
