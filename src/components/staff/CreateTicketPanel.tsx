"use client";
import { useEffect, useState } from "react";
import { OfficeId, getOffice } from "@/lib/config";
import { useT } from "@/lib/i18n";

interface Created {
  number: string;
  priority: boolean;
  app_type: string | null;
  biz_type: string | null;
  business_name: string | null;
  account_no: string | null;
  created_at: string;
}

const LAST = (office: OfficeId) => `cq_form_${office}`;
const TAXPAYER = "TAXPAYER";

/**
 * "Create Ticket": staff pick REGULAR or PRIORITY, fill in the form, and the next number is issued
 * automatically (GSO: the Folder Number 001, 002 … shown on the TV; BPLO: the account number is
 * TAXPAYER unless staff press "Enable Account Number" and type one).
 */
export function CreateTicketPanel({ office, onExpired }: { office: OfficeId; onExpired: () => void }) {
  const t = useT();
  const off = getOffice(office);
  const form = off.form!;
  const byName = form.extra === "businessName";
  const [open, setOpen] = useState<null | "regular" | "priority">(null);
  const [appType, setAppType] = useState(form.appTypes?.includes("RENEWAL") ? "RENEWAL" : form.appTypes?.[0] ?? "");
  const [bizType, setBizType] = useState(form.bizTypes?.[0] ?? "");
  const [name, setName] = useState("");
  const [accountOn, setAccountOn] = useState(false); // BPLO: false = TAXPAYER, true = type an account number
  const [account, setAccount] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);

  // Remember the last choices, so staff only retype the business name / account number.
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(LAST(office)) ?? "{}");
      if (form.appTypes?.includes(s.appType)) setAppType(s.appType);
      if (form.bizTypes?.includes(s.bizType)) setBizType(s.bizType);
    } catch {}
  }, [office]);

  async function loadNext(priority: boolean) {
    setNext("");
    try {
      const r = await fetch(`/api/staff/next?office=${office}&priority=${priority ? 1 : 0}`, { cache: "no-store" });
      if (r.status === 401) return onExpired();
      const j = await r.json();
      setNext(j.number ?? "");
    } catch {}
  }

  function start(kind: "regular" | "priority") {
    setOpen(kind);
    setCreated(null);
    setError("");
    setName("");
    setAccountOn(false);
    setAccount("");
    if (form.showNumber) loadNext(kind === "priority");
  }

  function close() {
    setOpen(null);
    setCreated(null);
    setError("");
  }

  const ready = byName ? !!name.trim() : !accountOn || !!account.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !open || !ready) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/staff/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          office,
          priority: open === "priority",
          appType,
          bizType,
          ...(form.appTypes ? { appType } : {}),
          ...(form.bizTypes ? { bizType } : {}),
          ...(byName ? { businessName: name } : { accountNumber: accountOn ? account : TAXPAYER }),
        }),
      });
      if (r.status === 401) return onExpired();
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? t("May problema. Subukan ulit.", "Something went wrong. Please try again."));
      try {
        localStorage.setItem(LAST(office), JSON.stringify({ appType, bizType }));
      } catch {}
      setCreated(j);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Print as an 80mm thermal-receipt slip: a temporary @page rule so the queue list still prints on A4.
  function printReceipt() {
    const s = document.createElement("style");
    s.textContent = "@page { size: 58mm auto; margin: 2mm; }";
    document.head.appendChild(s);
    document.documentElement.classList.add("print-receipt");
    const done = () => {
      s.remove();
      document.documentElement.classList.remove("print-receipt");
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.print();
  }

  const kindLabel = open === "priority" ? "PRIORITY" : "REGULAR";

  return (
    <section className="stack">
      <h1 style={{ textAlign: "center" }}>{t("Gumawa ng Numero", "Generate Queue Number")}</h1>
      <div className="grid-2">
        <button className="btn btn-primary btn-xl btn-block" style={{ minHeight: 150, fontSize: "1.6em" }} onClick={() => start("regular")}>
          REGULAR
        </button>
        <button className="btn btn-gold btn-xl btn-block" style={{ minHeight: 150, fontSize: "1.6em" }} onClick={() => start("priority")}>
          ★ PRIORITY
        </button>
      </div>
      <p className="lead" style={{ textAlign: "center" }}>
        {t(
          "Priority: senior citizen, PWD, buntis, o may kasamang sanggol.",
          "Priority: senior citizens, PWD, pregnant clients, or those with an infant.",
        )}
      </p>

      {open && (
        <div className="modal-back" role="dialog" aria-modal="true" aria-label={t("Gumawa ng ticket", "Generate ticket")} onClick={close}>
          <div className="modal print-area" onClick={(e) => e.stopPropagation()}>
            {created ? (
              <div className="stack" style={{ textAlign: "center" }}>
                <div className="receipt">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.jpg" alt="" className="receipt-seal" />
                  <div className="receipt-head">Bayan ng Cainta, Rizal</div>
                  <div className="receipt-head">{off.name}</div>
                  <hr />
                  <div className="receipt-sub">{t("NUMERO NG PILA", "QUEUE NUMBER")}</div>
                  <div className="receipt-number">{created.number}</div>
                  <div className="receipt-kind">{created.priority ? "★ PRIORITY" : "REGULAR"}</div>
                  <hr />
                  {created.business_name && (
                    <div className="receipt-line">
                      <span>{t("Negosyo", "Business")}</span>
                      <b>{created.business_name}</b>
                    </div>
                  )}
                  {created.account_no && (
                    <div className="receipt-line">
                      <span>{t("Account No.", "Account No.")}</span>
                      <b>{created.account_no}</b>
                    </div>
                  )}
                  {(created.app_type || created.biz_type) && (
                    <div className="receipt-line">
                      <span>{t("Uri", "Type")}</span>
                      <b>{[created.app_type, created.biz_type].filter(Boolean).join(" · ")}</b>
                    </div>
                  )}
                  <div className="receipt-line">
                    <span>{t("Petsa", "Date")}</span>
                    <b>{new Date(created.created_at).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric" })}</b>
                  </div>
                  <div className="receipt-line">
                    <span>{t("Oras", "Time")}</span>
                    <b>{new Date(created.created_at).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit" })}</b>
                  </div>
                  <hr />
                  <div className="receipt-foot">{t("Hintayin po ang inyong numero sa screen.", "Please wait for your number on the screen.")}</div>
                  <div className="receipt-foot">{t("Salamat po!", "Thank you!")}</div>
                </div>
                <div className="row no-print" style={{ justifyContent: "center", marginTop: 8 }}>
                  <button className="btn btn-ghost" onClick={printReceipt}>
                    🖨 {t("I-print", "Print")}
                  </button>
                  <button className="btn btn-primary" onClick={() => start(open)}>
                    {t("Susunod na ticket", "Next ticket")}
                  </button>
                  <button className="btn btn-ghost" onClick={close}>
                    {t("Tapos na", "Done")}
                  </button>
                </div>
              </div>
            ) : (
              <form className="stack" onSubmit={submit}>
                <h2 style={{ margin: 0 }}>
                  {t("Gumawa ng Ticket para sa", "Generate Ticket for")} <span className={open === "priority" ? "kind kind-p" : "kind"}>{kindLabel}</span>
                </h2>
                {form.appTypes && (
                  <label className="fl">
                    {t("Uri ng Aplikasyon", "Application Type")}
                    <select className="field" value={appType} onChange={(e) => setAppType(e.target.value)}>
                      {form.appTypes.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                )}
                {form.bizTypes && (
                  <label className="fl">
                    {t("Uri ng Negosyo", "Business Type")}
                    <select className="field" value={bizType} onChange={(e) => setBizType(e.target.value)}>
                      {form.bizTypes.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                )}

                {form.showNumber && (
                  <label className="fl">
                    {t("Folder Number (awtomatiko)", "Folder Number (automatic)")}
                    <input className="field" value={next || "…"} readOnly aria-readonly="true" style={{ background: "var(--cream)", fontWeight: 800 }} />
                  </label>
                )}

                {byName ? (
                  <label className="fl">
                    {t("Pangalan ng Negosyo", "Business Name")}
                    <input
                      className="field"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("ILAGAY ANG PANGALAN NG NEGOSYO", "ENTER BUSINESS NAME")}
                      maxLength={120}
                      autoFocus
                      required
                    />
                  </label>
                ) : (
                  <>
                    <label className="fl">
                      {t("Account Number", "Account Number")}
                      <input
                        className="field"
                        value={accountOn ? account : TAXPAYER}
                        onChange={(e) => setAccount(e.target.value.toUpperCase())}
                        placeholder={t("ILAGAY ANG ACCOUNT NUMBER", "ENTER ACCOUNT NUMBER")}
                        disabled={!accountOn}
                        maxLength={40}
                        autoFocus={accountOn}
                        style={accountOn ? undefined : { background: "#e9ecef", color: "var(--muted)" }}
                      />
                    </label>
                    <div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-pressed={accountOn}
                        onClick={() => {
                          setAccountOn((v) => !v);
                          setAccount("");
                        }}
                      >
                        {accountOn ? t("I-disable ang Account Number (TAXPAYER)", "Disable Account Number (TAXPAYER)") : t("I-enable ang Account Number", "Enable Account Number")}
                      </button>
                    </div>
                  </>
                )}

                {error && (
                  <div className="alert alert-red" role="alert">
                    {error}
                  </div>
                )}
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-ghost" onClick={close}>
                    {t("Kanselahin", "Cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={busy || !ready}>
                    {busy ? t("Sandali lang…", "Please wait…") : t("Gumawa ng Ticket", "Generate Ticket")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
