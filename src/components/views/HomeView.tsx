"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/Brand";
import { OFFICES, OfficeId, counterLabel, getOffice } from "@/lib/config";
import { useT } from "@/lib/i18n";
import { SavedTicket, loadSaved, useQueueState } from "@/lib/usePolling";

export function HomeView({ office }: { office: OfficeId }) {
  const t = useT();
  const off = getOffice(office);
  const other = OFFICES[office === "bplo" ? "gso" : "bplo"];
  const { state } = useQueueState(6000, office);
  const [saved, setSaved] = useState<SavedTicket[]>([]);
  useEffect(() => setSaved(loadSaved().filter((s) => (s.office ?? "bplo") === office)), [office]);

  return (
    <>
      <TopBar office={office} />
      <main className="wrap stack">
        <section className="hero">
          <p className="eyebrow" style={{ color: "#ffe9a3" }}>{off.name}</p>
          <h1>
            {t("Magandang araw po!", "Good day!")}
            <span className="tl" style={{ color: "#dbe6ff" }}>
              {t("Ano po ang maitutulong namin?", "How can we help you?")}
            </span>
          </h1>
        </section>

        {saved.length > 0 && (
          <section className="card stack" aria-labelledby="mine">
            <h2 id="mine">{t("Ang inyong numero", "Your number today")}</h2>
            {saved.map((s) => (
              <Link key={s.id} href={`/ticket?id=${s.id}&k=${s.token}`} className="btn btn-primary btn-xl btn-block">
                🎫 {s.number} — {t("Tingnan", "View")}
              </Link>
            ))}
          </section>
        )}

        <Link href={off.paths.kiosk} className="btn btn-gold btn-xl btn-block" style={{ minHeight: 120 }}>
          <span style={{ fontSize: 40 }} aria-hidden>
            🎫
          </span>
          <span style={{ textAlign: "left", lineHeight: 1.15 }}>
            {t("Kumuha ng Numero", "Get a queue number")}
          </span>
        </Link>

        <section className="card" aria-labelledby="now">
          <h2 id="now">{t("Tinatawag ngayon", "Now serving")}</h2>
          {!state ? (
            <p className="lead">{t("Naglo-load…", "Loading…")}</p>
          ) : state.serving.length === 0 ? (
            <p className="lead">{t("Wala pang tinatawag.", "No one is being called yet.")}</p>
          ) : (
            <div className="now-strip">
              {state.serving.map((s) => (
                <div key={s.id} className="now-chip">
                  <b>{s.number}</b>
                  <small>{counterLabel(office, s.counter)}</small>
                </div>
              ))}
            </div>
          )}
          {state && (
            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontWeight: 700 }}>
              {state.stats.waiting} {t("naghihintay", "waiting")}
            </p>
          )}
        </section>

        <div className="grid-2">
          <Link href={off.paths.display} className="btn btn-ghost btn-block">
            📺 {t("TV Screen", "TV screen")}
          </Link>
          <Link href={off.paths.staff} className="btn btn-ghost btn-block">
            🔒 Staff
          </Link>
        </div>

        <Link href={other.paths.home} className="btn btn-ghost btn-block">
          {office === "bplo"
            ? t("Pupunta sa GSO? Pumila rito →", "Going to the GSO? Queue here →")
            : t("← Pumunta sa pila ng BPLO at Treasury", "← Go to the BPLO & Treasury queue")}
        </Link>

        <p className="footer-note">
          {t(
            "Bayan ng Cainta, Rizal · Ang senior, PWD at buntis ay may priority.",
            "Municipality of Cainta, Rizal · Seniors, PWD and pregnant clients have priority.",
          )}
        </p>
      </main>
    </>
  );
}
