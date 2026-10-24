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
  created_at: string;
}

const LAST = (office: OfficeId) => `cq_form_${office}`;

/**
 * "Create Ticket": staff pick REGULAR or PRIORITY, fill in the form, and the next folder number
 * (001, 002 …) is issued automatically. That same number is what the TV screen shows.
 */
export function CreateTicketPanel({ office, onExpired }: { office: OfficeId; onExpired: () => void }) {
  const t = useT();
  const off = getOffice(office);
  const form = off.form!;
  const [open, setOpen] = useState<null | "regular" | "priority">(null);
  const [appType, setAppType] = useState(form.appTypes.includes("RENEWAL") ? "RENEWAL" : form.appTypes[0]);
  const [bizType, setBizType] = useState(form.bizTypes[0]);
  const [name, setName] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);

  // Remember the last choices, so staff only retype the business name.
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(LAST(office)) ?? "{}");
      if (form.appTypes.includes(s.appType)) setAppType(s.appType);
      if (form.bizTypes.includes(s.bizType)) setBizType(s.bizType);
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
    loadNext(kind === "priority");
  }

  function close() {
    setOpen(null);
    setCreated(null);
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !open) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/staff/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ office, priority: open === "priority", appType, bizType, businessName: name }),
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
                <p className="muted" style={{ margin: 0 }}>
                  {t("Ang numero ng ticket", "Ticket number")} · {created.priority ? "PRIORITY" : "REGULAR"}
                </p>
                <div className="big-queue-number">{created.number}</div>
                <p style={{ margin: 0, fontWeight: 700 }}>{created.business_name}</p>
                <p className="muted" style={{ margin: 0 }}>
                  {created.app_type} · {created.biz_type}
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  {new Date(created.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
                </p>
                <div className="row no-print" style={{ justifyContent: "center", marginTop: 8 }}>
                  <button className="btn btn-ghost" onClick={() => window.print()}>
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
                <label className="fl">
                  {t("Uri ng Aplikasyon", "Application Type")}
                  <select className="field" value={appType} onChange={(e) => setAppType(e.target.value)}>
                    {form.appTypes.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label className="fl">
                  {t("Uri ng Negosyo", "Business Type")}
                  <select className="field" value={bizType} onChange={(e) => setBizType(e.target.value)}>
                    {form.bizTypes.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label className="fl">
                  {t("Folder Number (awtomatiko)", "Folder Number (automatic)")}
                  <input className="field" value={next || "…"} readOnly aria-readonly="true" style={{ background: "var(--cream)", fontWeight: 800 }} />
                </label>
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
                {error && (
                  <div className="alert alert-red" role="alert">
                    {error}
                  </div>
                )}
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-ghost" onClick={close}>
                    {t("Kanselahin", "Cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
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
