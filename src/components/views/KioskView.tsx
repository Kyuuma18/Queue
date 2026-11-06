"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/Brand";
import { InstallHint } from "@/components/InstallHint";
import { Receipt, ReceiptData } from "@/components/Receipt";
import { OfficeId, getOffice, service } from "@/lib/config";
import { printReceipt } from "@/lib/printReceipt";
import { setLang, useLang, useT } from "@/lib/i18n";

interface Issued extends ReceiptData {
  service: string;
  ahead: number;
}

type Step = "start" | "service" | "priority";

const IDLE_MS = 60_000; // back to the welcome screen when nobody touches it
const DONE_MS = 12_000; // how long the ticket number stays up before the next person

/**
 * The office kiosk, like a self-order kiosk: Touch to start → what do you need → priority? → the ticket prints.
 * Only a device that staff set up with the PIN can issue tickets. Add ?print=0 to skip the automatic printing.
 */
export function KioskView({ office }: { office: OfficeId }) {
  const off = getOffice(office);
  const t = useT();
  const lang = useLang();
  const single = off.services.length === 1;
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>("start");
  const [svc, setSvc] = useState<string>(single ? off.services[0].code : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<Issued | null>(null);
  const [autoPrint, setAutoPrint] = useState(true);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAutoPrint(new URLSearchParams(location.search).get("print") !== "0");
    fetch("/api/kiosk", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setAllowed(!!j.ok))
      .catch(() => setAllowed(false));
  }, []);

  // Kiosk behaviour: keep the screen awake, go full screen on the first touch, no long-press menus.
  useEffect(() => {
    if (!allowed) return;
    document.documentElement.classList.add("kiosk-mode");
    const noMenu = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", noMenu);
    let lock: any = null;
    const keepAwake = async () => {
      try {
        lock = await (navigator as any).wakeLock?.request("screen");
      } catch {}
    };
    keepAwake();
    const onVisible = () => document.visibilityState === "visible" && keepAwake();
    document.addEventListener("visibilitychange", onVisible);
    const full = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    };
    window.addEventListener("pointerdown", full, { once: true });
    return () => {
      document.documentElement.classList.remove("kiosk-mode");
      document.removeEventListener("contextmenu", noMenu);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pointerdown", full);
      lock?.release?.().catch(() => {});
    };
  }, [allowed]);

  const reset = useCallback(() => {
    setIssued(null);
    setStep("start");
    setSvc(single ? off.services[0].code : "");
    setError("");
  }, [single, off]);

  // Any touch restarts the idle timer; when it runs out the next person starts from the welcome screen.
  useEffect(() => {
    if (!allowed || issued || step === "start") return;
    const arm = () => {
      if (idle.current) clearTimeout(idle.current);
      idle.current = setTimeout(reset, IDLE_MS);
    };
    arm();
    window.addEventListener("pointerdown", arm);
    return () => {
      window.removeEventListener("pointerdown", arm);
      if (idle.current) clearTimeout(idle.current);
    };
  }, [allowed, issued, step, reset]);

  // After the ticket is shown, clear the screen for the next person.
  useEffect(() => {
    if (!issued) return;
    const id = setTimeout(reset, DONE_MS);
    return () => clearTimeout(id);
  }, [issued, reset]);

  // Print once the slip is on the page.
  useEffect(() => {
    if (!issued || !autoPrint) return;
    const id = setTimeout(() => printReceipt(issued.number), 300);
    return () => clearTimeout(id);
  }, [issued, autoPrint]);

  async function submit(priority: boolean) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ office, service: svc, priority }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? t("May problema. Subukan ulit.", "Something went wrong. Please try again."));
      setIssued(j);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (allowed === null) {
    return (
      <>
        <TopBar office={office} sizes={false} />
        <main className="wrap">
          <p className="lead">{t("Naglo-load…", "Loading…")}</p>
        </main>
      </>
    );
  }

  // A client's own phone, or any device staff have not set up, cannot take a number.
  if (!allowed) {
    return (
      <>
        <TopBar office={office} sizes={false} />
        <main className="wrap stack" style={{ textAlign: "center" }}>
          <div className="card stack">
            <div style={{ fontSize: 56 }} aria-hidden>
              🖥️
            </div>
            <h1>{t("Kumuha ng numero sa kiosk", "Please take your number at the kiosk")}</h1>
            <p className="lead">
              {t("Pumunta po sa kiosk sa opisina at pindutin ang screen.", "Please go to the kiosk in the office and touch the screen.")}
            </p>
          </div>
          <Link href={off.paths.staff} className="btn btn-ghost btn-sm" style={{ alignSelf: "center" }}>
            🔒 Staff: {t("i-set up ang kiosk", "set up this kiosk")}
          </Link>
          <InstallHint />
        </main>
      </>
    );
  }

  if (issued) {
    const s = service(issued.service);
    return (
      <>
        <TopBar office={office} sizes={false} lang={false} />
        <main className="wrap stack kiosk-done">
          <div className="ticket">
            <div className="ticket-head">{t("Ang inyong numero", "Your number")}</div>
            <div className="ticket-num">{issued.number}</div>
            <div className="ticket-body stack">
              <div>
                {!single && (
                  <span className="pill">
                    {s?.icon} {lang === "en" ? s?.name : s?.tl}
                  </span>
                )}{" "}
                {issued.priority && <span className="pill pill-gold">★ Priority</span>}
              </div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: "1.2em" }}>
                {autoPrint
                  ? t("Kunin ang inyong ticket sa printer.", "Please take your ticket from the printer.")
                  : t("Hintayin ang inyong numero sa screen.", "Please wait for your number on the screen.")}
              </p>
              <p className="muted" style={{ margin: 0 }}>
                {issued.ahead} {t("ang nauuna sa inyo", "ahead of you")}
              </p>
            </div>
          </div>
          <button className="btn btn-primary btn-xl btn-block" onClick={reset}>
            {t("Tapos na", "Done")}
          </button>
        </main>
        {/* off-screen copy of the slip, for the printer */}
        <div style={{ position: "absolute", left: -9999, top: 0, width: 260 }} aria-hidden>
          <Receipt office={office} data={issued} />
        </div>
      </>
    );
  }

  if (step === "start") {
    return (
      <>
        <TopBar office={office} sizes={false} lang={false} />
        <main className="wrap stack kiosk-start">
          <h1 style={{ textAlign: "center", margin: 0 }}>{off.name}</h1>
          <button
            className="btn btn-gold kiosk-touch"
            onClick={() => setStep(single ? "priority" : "service")}
          >
            <span style={{ fontSize: 64 }} aria-hidden>
              👆
            </span>
            <span>{t("HAWAKAN PARA MAGSIMULA", "TOUCH TO START")}</span>
            <small>{t("Kumuha ng numero ng pila", "Get your queue number")}</small>
          </button>
          <div className="grid-2" role="group" aria-label="Language">
            <button className={"btn btn-xl " + (lang === "tl" ? "btn-primary" : "btn-ghost")} onClick={() => setLang("tl")}>
              Tagalog
            </button>
            <button className={"btn btn-xl " + (lang === "en" ? "btn-primary" : "btn-ghost")} onClick={() => setLang("en")}>
              English
            </button>
          </div>
        </main>
      </>
    );
  }

  const stepIndex = step === "service" ? 0 : 1;
  const stepCount = single ? 1 : 2;

  return (
    <>
      <TopBar office={office} sizes={false} />
      <main className="wrap">
        <div className="steps" aria-hidden>
          {Array.from({ length: stepCount }).map((_, i) => (
            <span key={i} className={i <= (single ? 0 : stepIndex) ? "on" : ""} />
          ))}
        </div>

        <button className="back" onClick={() => (step === "priority" && !single ? setStep("service") : reset())}>
          ← {step === "priority" && !single ? t("Bumalik", "Back") : t("Simula ulit", "Start over")}
        </button>

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
            {error && (
              <div className="alert alert-red" role="alert">
                {error}
              </div>
            )}
            <div className="grid-2">
              <button className="choice" style={{ borderColor: "var(--gold)" }} disabled={busy} onClick={() => submit(true)}>
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
              <button className="choice" disabled={busy} onClick={() => submit(false)}>
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
            {busy && <p className="lead">{t("Sandali lang…", "Please wait…")}</p>}
          </section>
        )}
      </main>
    </>
  );
}
