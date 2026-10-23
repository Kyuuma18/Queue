"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { TopBar } from "@/components/Brand";
import { MINUTES_PER_CLIENT, SERVICES, service } from "@/lib/config";
import { manilaDay, saveTicket } from "@/lib/usePolling";

interface Issued {
  id: number;
  token: string;
  number: string;
  service: string;
  priority: boolean;
  ahead: number;
}

type Step = "service" | "priority" | "phone";

export default function Kiosk() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("service");
  const [svc, setSvc] = useState<string>("");
  const [priority, setPriority] = useState(false);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<Issued | null>(null);
  const [qr, setQr] = useState("");
  // ?shared=1 → the office tablet: show the ticket + QR, then reset for the next person.
  const [shared, setShared] = useState(false);
  useEffect(() => setShared(new URLSearchParams(location.search).has("shared")), []);

  useEffect(() => {
    if (!issued || !shared) return;
    const id = setTimeout(reset, 45000);
    return () => clearTimeout(id);
  }, [issued, shared]);

  function reset() {
    setIssued(null);
    setQr("");
    setStep("service");
    setSvc("");
    setPriority(false);
    setPhone("");
    setError("");
  }

  async function submit(withPhone: boolean) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: svc, priority, phone: withPhone ? phone : "" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "May problema. Subukan ulit.");
      const url = `/ticket?id=${j.id}&k=${j.token}`;
      if (shared) {
        setIssued(j);
        setQr(await QRCode.toDataURL(location.origin + url, { margin: 1, width: 360 }));
      } else {
        saveTicket({ id: j.id, token: j.token, number: j.number, day: manilaDay() });
        router.replace(url + "&new=1");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = { service: 0, priority: 1, phone: 2 }[step];

  if (issued) {
    const s = service(issued.service);
    return (
      <>
        <TopBar sizes={false} />
        <main className="wrap stack">
          <div className="ticket">
            <div className="ticket-head">Ang inyong numero · Your number</div>
            <div className="ticket-num">{issued.number}</div>
            <div className="ticket-body stack">
              <div>
                <span className="pill">
                  {s?.icon} {s?.tl} · {s?.name}
                </span>{" "}
                {issued.priority && <span className="pill pill-gold">★ Priority</span>}
              </div>
              <div className="bigstat">
                <div>
                  <b>{issued.ahead}</b>
                  <small>nauuna / ahead</small>
                </div>
                <div>
                  <b>~{Math.max(1, issued.ahead * MINUTES_PER_CLIENT)}</b>
                  <small>minuto / mins</small>
                </div>
              </div>
            </div>
            <div className="ticket-cut" />
            <div className="ticket-body" style={{ paddingTop: 16 }}>
              {qr && <img src={qr} alt="QR code para sa inyong numero" style={{ width: 220, height: 220 }} />}
              <p style={{ margin: "6px 0 0", fontWeight: 700 }}>
                I-scan para bantayan sa phone
                <span className="tl">Scan to follow your number on your phone</span>
              </p>
            </div>
          </div>
          <button className="btn btn-primary btn-xl btn-block" onClick={reset}>
            Tapos na · Done
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main className="wrap">
        <div className="steps" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className={i <= stepIndex ? "on" : ""} />
          ))}
        </div>

        {step !== "service" && (
          <button className="back" onClick={() => setStep(step === "phone" ? "priority" : "service")}>
            ← Bumalik · Back
          </button>
        )}

        {step === "service" && (
          <section className="stack">
            <h1>
              Ano ang inyong transaksyon?
              <span className="tl">What do you need today?</span>
            </h1>
            {SERVICES.map((s) => (
              <button
                key={s.code}
                className="choice"
                onClick={() => {
                  setSvc(s.code);
                  setStep("priority");
                }}
              >
                <span className="choice-icon" aria-hidden style={{ background: s.color + "1a" }}>
                  {s.icon}
                </span>
                <span>
                  <span className="choice-title">{s.tl}</span>
                  <span className="choice-sub" style={{ display: "block", fontWeight: 700, color: "var(--ink-2)" }}>
                    {s.name}
                  </span>
                  <span className="choice-sub" style={{ display: "block" }}>
                    {s.detailTl}
                  </span>
                </span>
                <span className="choice-arrow" aria-hidden>
                  ›
                </span>
              </button>
            ))}
          </section>
        )}

        {step === "priority" && (
          <section className="stack">
            <h1>
              Kayo ba ay Senior, PWD, buntis, o may kasamang sanggol?
              <span className="tl">Are you a senior citizen, PWD, pregnant, or with an infant?</span>
            </h1>
            <p className="lead">Ihanda ang ID para ipakita sa counter. · Please show your ID at the counter.</p>
            <div className="grid-2">
              <button
                className="choice"
                style={{ borderColor: "var(--gold)" }}
                onClick={() => {
                  setPriority(true);
                  setStep("phone");
                }}
              >
                <span className="choice-icon" aria-hidden style={{ background: "var(--amber-bg)" }}>
                  ★
                </span>
                <span>
                  <span className="choice-title">Oo, Priority</span>
                  <span className="choice-sub" style={{ display: "block" }}>
                    Yes — priority lane
                  </span>
                </span>
              </button>
              <button
                className="choice"
                onClick={() => {
                  setPriority(false);
                  setStep("phone");
                }}
              >
                <span className="choice-icon" aria-hidden>
                  👤
                </span>
                <span>
                  <span className="choice-title">Hindi</span>
                  <span className="choice-sub" style={{ display: "block" }}>
                    No — regular lane
                  </span>
                </span>
              </button>
            </div>
          </section>
        )}

        {step === "phone" && (
          <section className="stack">
            <h1>
              Gusto ba ninyong ma-text kapag malapit na?
              <span className="tl">Want a text message when your turn is near?</span>
            </h1>
            <p className="lead">Hindi kailangan. Pwedeng laktawan. · Optional — you may skip this.</p>
            <label className="stack" style={{ gap: 6 }}>
              <span style={{ fontWeight: 800 }}>Mobile number</span>
              <input
                className="field"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="09XX XXX XXXX"
                maxLength={13}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ""))}
              />
            </label>
            {error && (
              <div className="alert alert-red" role="alert">
                {error}
              </div>
            )}
            <button className="btn btn-gold btn-xl btn-block" disabled={busy || phone.replace(/\D/g, "").length < 10} onClick={() => submit(true)}>
              {busy ? "Sandali lang…" : "I-text ako · Text me"}
            </button>
            <button className="btn btn-primary btn-xl btn-block" disabled={busy} onClick={() => submit(false)}>
              {busy ? "Sandali lang…" : "Kunin ang numero · Get my number"}
            </button>
            <p style={{ color: "var(--muted)", fontSize: "0.85em", margin: 0 }}>
              Gagamitin lang ang numero para sa abiso ng pila ngayong araw. · Used only for today's queue alerts.
            </p>
          </section>
        )}
      </main>
    </>
  );
}
