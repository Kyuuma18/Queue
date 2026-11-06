"use client";
import Link from "next/link";
import { TopBar } from "@/components/Brand";
import { OFFICES, OfficeId, counterLabel, getOffice } from "@/lib/config";
import { useT } from "@/lib/i18n";
import { useQueueState } from "@/lib/usePolling";

export function HomeView({ office }: { office: OfficeId }) {
  const t = useT();
  const off = getOffice(office);
  const other = OFFICES[office === "bplo" ? "gso" : "bplo"];
  const { state } = useQueueState(6000, office);

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

        <section className="card stack" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48 }} aria-hidden>
            🎫
          </div>
          <h2 style={{ margin: 0 }}>{t("Kumuha ng numero sa kiosk", "Get your queue number at the kiosk")}</h2>
          <p className="lead" style={{ margin: 0 }}>
            {t("Hawakan ang screen ng kiosk sa opisina at kunin ang ticket.", "Touch the kiosk screen in the office and take your ticket.")}
          </p>
        </section>

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

        <Link href={other.paths.home} className="btn btn-ghost btn-block">
          {office === "bplo"
            ? t("Pupunta sa GSO? Tingnan ang pila →", "Going to the GSO? See its queue →")
            : t("← Tingnan ang pila ng BPLO at Treasury", "← See the BPLO & Treasury queue")}
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
