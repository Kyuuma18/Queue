"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Seal } from "@/components/Brand";
import { MediaPanel } from "@/components/MediaPanel";
import { COUNTERS, MUNICIPALITY, OFFICE_SHORT, counterLabel } from "@/lib/config";
import { useQueueState } from "@/lib/usePolling";
import { announce } from "@/lib/speak";

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return null;
  const tz = { timeZone: "Asia/Manila" } as const;
  return (
    <div className="display-clock">
      <b>{now.toLocaleTimeString("en-PH", { ...tz, hour: "2-digit", minute: "2-digit", second: "2-digit" })}</b>
      <span>{now.toLocaleDateString("en-PH", { ...tz, weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
    </div>
  );
}

export default function Display() {
  const { state, error } = useQueueState(3000);
  const [sound, setSound] = useState(false);
  const [callout, setCallout] = useState<{ number: string; counter: string } | null>(null);
  const [fresh, setFresh] = useState<Record<number, string>>({});
  const [qr, setQr] = useState("");
  const seen = useRef<Record<number, string> | null>(null);
  const queue = useRef<{ number: string; counter: string }[]>([]);
  const playing = useRef(false);
  const soundRef = useRef(false);
  soundRef.current = sound;

  useEffect(() => {
    QRCode.toDataURL(location.origin + "/kiosk", { margin: 1, width: 300 }).then(setQr);
    try {
      setSound(localStorage.getItem("cq_sound") === "1");
    } catch {}
  }, []);

  // Detect newly called (or recalled) numbers and announce them one at a time.
  useEffect(() => {
    if (!state) return;
    const current: Record<number, string> = {};
    for (const t of state.serving) current[t.id] = t.called_at ?? "";
    if (seen.current) {
      const newOnes = state.serving.filter((t) => seen.current![t.id] !== (t.called_at ?? "")).reverse();
      for (const t of newOnes) {
        queue.current.push({ number: t.number, counter: counterLabel(t.counter) });
        setFresh((f) => ({ ...f, [t.counter ?? 0]: t.called_at ?? "" }));
      }
      play();
    }
    seen.current = current;
  }, [state]);

  function play() {
    if (playing.current) return;
    const next = queue.current.shift();
    if (!next) return;
    playing.current = true;
    setCallout(next);
    if (soundRef.current) announce(next.number, next.counter);
    setTimeout(() => {
      setCallout(null);
      playing.current = false;
      setTimeout(play, 400);
    }, 7000);
  }

  function toggleSound() {
    const v = !sound;
    setSound(v);
    try {
      localStorage.setItem("cq_sound", v ? "1" : "0");
    } catch {}
    if (v) announce("A001", "Counter 1"); // test + unlocks audio in the browser
  }

  const byCounter = new Map(state?.serving.map((t) => [t.counter, t]) ?? []);
  const next = state?.waiting.slice(0, 12) ?? [];

  return (
    <div className="display">
      <header className="display-top">
        <Seal size={64} />
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontWeight: 800, fontSize: "clamp(1.2rem, 3vw, 2rem)" }}>{OFFICE_SHORT} Queue</div>
          <div style={{ opacity: 0.85 }}>{MUNICIPALITY}</div>
        </div>
        <Clock />
      </header>

      <div className="display-main">
        <section className="panel stack" aria-label="Now serving">
          <h2 style={{ margin: 0 }}>
            Tinatawag Ngayon <span className="tl">Now Serving</span>
          </h2>
          <div className="counter-grid">
            {COUNTERS.map((c) => {
              const t = byCounter.get(c.id);
              const isFresh = t && fresh[c.id] === t.called_at;
              return (
                <div key={c.id} className={"counter-card" + (isFresh ? " fresh" : "")}>
                  <div className="lbl">{c.label}</div>
                  <div className="num">{t?.number ?? "—"}</div>
                  {t?.priority && <span className="pill pill-gold">★ Priority</span>}
                </div>
              );
            })}
          </div>

          <h2 style={{ margin: "8px 0 0" }}>
            Susunod <span className="tl">Next in line</span>
          </h2>
          <div className="next-list">
            {next.length === 0 && <span style={{ background: "transparent", color: "var(--muted)" }}>—</span>}
            {next.map((t) => (
              <span key={t.id} className={t.priority ? "p" : ""}>
                {t.number}
              </span>
            ))}
          </div>
          {error && <div className="alert alert-red">{error}</div>}
        </section>

        <aside className="stack" style={{ minHeight: 0 }}>
          <section className="panel">
            <MediaPanel />
          </section>
          <section className="panel" aria-label="Unclaimed">
            <h2 style={{ margin: "0 0 8px" }}>
              Hindi Sumipot <span className="tl">Called — please see the counter</span>
            </h2>
            <div className="next-list">
              {(state?.skipped.length ?? 0) === 0 && <span style={{ background: "transparent", color: "var(--muted)" }}>—</span>}
              {state?.skipped.slice(0, 12).map((t) => (
                <span key={t.id} style={{ background: "var(--red-bg)", color: "var(--red)" }}>
                  {t.number}
                </span>
              ))}
            </div>
          </section>
          <section className="panel" style={{ display: "flex", gap: 14, alignItems: "center" }}>
            {qr && <img src={qr} alt="" style={{ width: 120, height: 120, flex: "none" }} />}
            <div>
              <b style={{ fontSize: "1.2em", color: "var(--navy)" }}>I-scan para kumuha ng numero</b>
              <span className="tl">Scan with your phone to get a number and follow the line</span>
            </div>
          </section>
        </aside>
      </div>

      {callout && (
        <div className="callout" role="alert" aria-live="assertive">
          <div>
            <div style={{ fontSize: "clamp(1.4rem, 4vw, 2.6rem)", fontWeight: 800 }}>Numero · Number</div>
            <div className="num">{callout.number}</div>
            <div className="to">→ {callout.counter}</div>
          </div>
        </div>
      )}

      <button className={"btn sound-btn " + (sound ? "btn-ghost" : "btn-gold")} onClick={toggleSound}>
        {sound ? "🔊 Sound on" : "🔇 Tap to turn on sound"}
      </button>
    </div>
  );
}
