"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { TopBar } from "@/components/Brand";
import { MINUTES_PER_CLIENT, OfficeId, getOffice, service } from "@/lib/config";
import { manilaDay, saveTicket } from "@/lib/usePolling";
import { useLang, useT } from "@/lib/i18n";

interface Issued {
  id: number;
  token: string;
  number: string;
  service: string;
  priority: boolean;
  ahead: number;
}

type Step = "service" | "priority" | "phone";

export function KioskView({ office }: { office: OfficeId }) {
  const off = getOffice(office);
  const t = useT();
  const lang = useLang();
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
        body: JSON.stringify({ office, service: svc, priority, phone: withPhone ? phone : "" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? t("May problema. Subukan ulit.", "Something went wrong. Please try again."));
      const url = `/ticket?id=${j.id}&k=${j.token}`;
      if (shared) {
        setIssued(j);
        setQr(await QRCode.toDataURL(location.origin + url, { margin: 1, width: 360 }));
      } else {
        saveTicket({ id: j.id, token: j.token, number: j.number, day: manilaDay(), office });
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
        <TopBar office={office} sizes={false} />
        <main className="wrap stack">
          <div className="ticket">
            <div className="ticket-head">{t("Ang inyong numero", "Your number")}</div>
            <div className="ticket-num">{issued.number}</div>
            <div className="ticket-body stack">
              <div>
                <span className="pill">
                  {s?.icon} {lang === "en" ? s?.name : s?.tl}
                </span>{" "}
                {issued.priority && <span className="pill pill-gold">★ Priority</span>}
              </div>
              <div className="bigstat">
                <div>
                  <b>{issued.ahead}</b>
                  <small>{t("nauuna", "ahead")}</small>
                </div>
                <div>
                  <b>~{Math.max(1, issued.ahead * MINUTES_PER_CLIENT)}</b>
                  <small>{t("minuto", "minutes")}</small>
                </div>
              </div>
            </div>
            <div className="ticket-cut" />
            <div className="ticket-body" style={{ paddingTop: 16 }}>
              {qr && (
                <img
                  src={qr}
                  alt={t("QR code para sa inyong numero", "QR code for your number")}
                  style={{ width: 220, height: 220 }}
                />
              )}
              <p style={{ margin: "6px 0 0", fontWeight: 700 }}>
                {t("I-scan para bantayan sa phone", "Scan to follow your number on your phone")}
              </p>
            </div>
          </div>
          <button className="btn btn-primary btn-xl btn-block" onClick={reset}>
            {t("Tapos na", "Done")}
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar office={office} />
      <main className="wrap">
        <div className="steps" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className={i <= stepIndex ? "on" : ""} />
          ))}
        </div>

        {step !== "service" && (
          <button className="back" onClick={() => setStep(step === "phone" ? "priority" : "service")}>
            ← {t("Bumalik", "Back")}
          </button>
        )}

        {step === "service" && (
          <section className="stack">
            <h1>{t("Ano ang inyong transaksyon?", "What do you need today?")}</h1>
            {off.services.map((s) => (
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
                  <span className="choice-title">{lang === "en" ? s.name : s.tl}</span>
                  <span className="choice-sub" style={{ display: "block" }}>
                    {lang === "en" ? s.detail : s.detailTl}
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
              {t(
                "Kayo ba ay Senior, PWD, buntis, o may kasamang sanggol?",
                "Are you a senior citizen, PWD, pregnant, or with an infant?",
              )}
            </h1>
            <p className="lead">{t("Ihanda ang ID para ipakita sa counter.", "Please show your ID at the counter.")}</p>
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
                  <span className="choice-title">{t("Oo, Priority", "Yes, Priority")}</span>
                  <span className="choice-sub" style={{ display: "block" }}>
                    {t("Priority lane", "Priority lane")}
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
                  <span className="choice-title">{t("Hindi", "No")}</span>
                  <span className="choice-sub" style={{ display: "block" }}>
                    {t("Regular na pila", "Regular lane")}
                  </span>
                </span>
              </button>
            </div>
          </section>
        )}

        {step === "phone" && (
          <section className="stack">
            <h1>
              {t("Gusto ba ninyong ma-text kapag malapit na?", "Want a text message when your turn is near?")}
            </h1>
            <p className="lead">{t("Hindi kailangan. Pwedeng laktawan.", "Optional — you may skip this.")}</p>
            <label className="stack" style={{ gap: 6 }}>
              <span style={{ fontWeight: 800 }}>{t("Mobile number", "Mobile number")}</span>
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
              {busy ? t("Sandali lang…", "Please wait…") : t("I-text ako", "Text me")}
            </button>
            <button className="btn btn-primary btn-xl btn-block" disabled={busy} onClick={() => submit(false)}>
              {busy ? t("Sandali lang…", "Please wait…") : t("Kunin ang numero", "Get my number")}
            </button>
            <p style={{ color: "var(--muted)", fontSize: "0.85em", margin: 0 }}>
              {t(
                "Gagamitin lang ang numero para sa abiso ng pila ngayong araw.",
                "Used only for today's queue alerts.",
              )}
            </p>
          </section>
        )}
      </main>
    </>
  );
}
