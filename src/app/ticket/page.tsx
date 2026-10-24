"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/Brand";
import { MINUTES_PER_CLIENT, counterLabel, service } from "@/lib/config";
import { manilaDay, saveTicket, usePolling } from "@/lib/usePolling";
import { chime, vibrate } from "@/lib/speak";
import { useLang, useT } from "@/lib/i18n";

interface TicketView {
  id: number;
  number: string;
  service: string;
  priority: boolean;
  status: "waiting" | "serving" | "done" | "skipped" | "cancelled";
  counter: number | null;
  called_at: string | null;
  ahead: number;
}

export default function TicketPage() {
  const tr = useT(); // translate: tr("Tagalog", "English")
  const lang = useLang();
  const [q, setQ] = useState<{ id: string; k: string; isNew: boolean } | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setQ({ id: p.get("id") ?? "", k: p.get("k") ?? "", isNew: p.has("new") });
  }, []);

  const { data: t, error, status, reload } = usePolling<TicketView>(q ? `/api/tickets/${q.id}?k=${encodeURIComponent(q.k)}` : null, 4000);

  // Remember the ticket on this phone so it shows on the home screen.
  useEffect(() => {
    if (t && q) saveTicket({ id: t.id, token: q.k, number: t.number, day: manilaDay() });
  }, [t?.id]);

  // Alert when the number is called (or re-called).
  const lastCall = useRef<string | null>(null);
  useEffect(() => {
    if (!t) return;
    if (t.status === "serving" && t.called_at && t.called_at !== lastCall.current) {
      if (lastCall.current !== null || !q?.isNew) {
        vibrate();
        chime();
      }
      lastCall.current = t.called_at;
    } else if (lastCall.current === null) {
      lastCall.current = t.called_at ?? "";
    }
  }, [t?.status, t?.called_at]);

  async function cancel() {
    if (!q || !confirm(tr("Sigurado po ba? Mawawala ang inyong numero.", "Are you sure? You will lose your number."))) return;
    await fetch(`/api/tickets/${q.id}?k=${encodeURIComponent(q.k)}`, { method: "DELETE" });
    reload();
  }

  if (status === 404) {
    return (
      <>
        <TopBar />
        <main className="wrap stack">
          <h1>{tr("Hindi makita ang numero", "We couldn't find this ticket")}</h1>
          <Link href="/kiosk" className="btn btn-gold btn-xl btn-block">
            {tr("Kumuha ng bagong numero", "Get a new number")}
          </Link>
        </main>
      </>
    );
  }

  const s = t ? service(t.service) : null;

  return (
    <>
      <TopBar />
      <main className="wrap stack">
        {error && (
          <div className="alert alert-red" role="alert">
            {error}
          </div>
        )}

        {!t ? (
          <p className="lead">{tr("Naglo-load…", "Loading…")}</p>
        ) : (
          <>
            {t.status === "serving" && (
              <div className="called" role="alert" aria-live="assertive">
                <div style={{ fontWeight: 800, fontSize: "1.2em" }}>{tr("Kayo na po!", "It's your turn!")}</div>
                <div className="go">
                  {tr("Pumunta sa", "Please go to")} {counterLabel(t.counter)}
                </div>
              </div>
            )}

            <div className="ticket" aria-live="polite">
              <div className="ticket-head">{tr("Ang inyong numero", "Your number")}</div>
              <div className="ticket-num">{t.number}</div>
              <div className="ticket-body stack">
                <div>
                  <span className="pill">
                    {s?.icon} {lang === "en" ? s?.name : s?.tl}
                  </span>{" "}
                  {t.priority && <span className="pill pill-gold">★ Priority</span>}
                </div>

                {t.status === "waiting" && (
                  <>
                    <div className="bigstat">
                      <div>
                        <b>{t.ahead}</b>
                        <small>{tr("nauuna sa inyo", "ahead of you")}</small>
                      </div>
                      <div>
                        <b>~{Math.max(1, t.ahead * MINUTES_PER_CLIENT)}</b>
                        <small>{tr("minuto", "minutes")}</small>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontWeight: 700 }}>
                      {t.ahead === 0
                        ? tr("Kayo na ang susunod! Lumapit na po sa counter.", "You're next! Please move near the counters.")
                        : tr(
                            "Maghintay lang po. Kusang mag-a-update ang page na ito.",
                            "Please wait. This page updates by itself.",
                          )}
                    </p>
                  </>
                )}

                {t.status === "done" && (
                  <div className="alert alert-green">✔ {tr("Tapos na po. Salamat!", "All done. Thank you!")}</div>
                )}
                {t.status === "skipped" && (
                  <div className="alert alert-red">
                    {tr(
                      "Natawag na po ang numero ninyo. Lumapit sa counter at ipakita ito.",
                      "Your number was called. Please go to the counter and show this screen.",
                    )}
                  </div>
                )}
                {t.status === "cancelled" && (
                  <div className="alert alert-red">{tr("Kinansela na ang numerong ito.", "This number was cancelled.")}</div>
                )}
              </div>
            </div>

            {t.status === "waiting" && (
              <p className="lead" style={{ textAlign: "center" }}>
                🔊{" "}
                {tr(
                  "Huwag isara ang page na ito — magva-vibrate ang phone kapag tinawag kayo.",
                  "Keep this page open — your phone will vibrate when you are called.",
                )}
              </p>
            )}

            {(t.status === "done" || t.status === "cancelled") && (
              <Link href="/kiosk" className="btn btn-gold btn-xl btn-block">
                {tr("Kumuha ng bagong numero", "Get a new number")}
              </Link>
            )}
            <Link href="/" className="btn btn-ghost btn-block">
              ⌂ Home
            </Link>
            {t.status === "waiting" && (
              <button className="btn btn-ghost btn-block" style={{ color: "var(--red)" }} onClick={cancel}>
                {tr("Hindi na ako tutuloy", "Cancel my number")}
              </button>
            )}
          </>
        )}
      </main>
    </>
  );
}
