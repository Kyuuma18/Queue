"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/Brand";
import { OFFICE_NAME, counterLabel } from "@/lib/config";
import { SavedTicket, loadSaved, useQueueState } from "@/lib/usePolling";

export default function Home() {
  const { state } = useQueueState(6000);
  const [saved, setSaved] = useState<SavedTicket[]>([]);
  useEffect(() => setSaved(loadSaved()), []);

  return (
    <>
      <TopBar />
      <main className="wrap stack">
        <section className="hero">
          <p className="eyebrow" style={{ color: "#ffe9a3" }}>{OFFICE_NAME}</p>
          <h1>
            Magandang araw po!
            <span className="tl" style={{ color: "#dbe6ff" }}>Good day! How can we help you?</span>
          </h1>
        </section>

        {saved.length > 0 && (
          <section className="card stack" aria-labelledby="mine">
            <h2 id="mine">
              Ang inyong numero <span className="tl">Your number today</span>
            </h2>
            {saved.map((t) => (
              <Link key={t.id} href={`/ticket?id=${t.id}&k=${t.token}`} className="btn btn-primary btn-xl btn-block">
                🎫 {t.number} — Tingnan / View
              </Link>
            ))}
          </section>
        )}

        <Link href="/kiosk" className="btn btn-gold btn-xl btn-block" style={{ minHeight: 120 }}>
          <span style={{ fontSize: 40 }} aria-hidden>
            🎫
          </span>
          <span style={{ textAlign: "left", lineHeight: 1.15 }}>
            Kumuha ng Numero
            <span className="tl" style={{ color: "#3d2e00" }}>Get a queue number</span>
          </span>
        </Link>

        <section className="card" aria-labelledby="now">
          <h2 id="now">
            Tinatawag ngayon <span className="tl">Now serving</span>
          </h2>
          {!state ? (
            <p className="lead">Naglo-load… / Loading…</p>
          ) : state.serving.length === 0 ? (
            <p className="lead">Wala pang tinatawag. / No one is being called yet.</p>
          ) : (
            <div className="now-strip">
              {state.serving.map((t) => (
                <div key={t.id} className="now-chip">
                  <b>{t.number}</b>
                  <small>{counterLabel(t.counter)}</small>
                </div>
              ))}
            </div>
          )}
          {state && (
            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontWeight: 700 }}>
              {state.stats.waiting} naghihintay / waiting
            </p>
          )}
        </section>

        <div className="grid-2">
          <Link href="/display" className="btn btn-ghost btn-block">
            📺 TV Screen
          </Link>
          <Link href="/staff" className="btn btn-ghost btn-block">
            🔒 Staff
          </Link>
        </div>

        <p className="footer-note">
          Bayan ng Cainta, Rizal · Senior, PWD at buntis ay may priority.
        </p>
      </main>
    </>
  );
}
