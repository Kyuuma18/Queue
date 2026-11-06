"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

/** "Install the app": a button where the browser supports it, otherwise the Add to Home Screen steps. Hidden once installed. */
export function InstallHint() {
  const t = useT();
  const [standalone, setStandalone] = useState(true);
  const [ios, setIos] = useState(false);
  const [prompt, setPrompt] = useState<any>(null);

  useEffect(() => {
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || (navigator as any).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const on = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);

  if (standalone) return null;
  return (
    <div className="card stack" style={{ marginTop: 14, textAlign: "center" }}>
      <b>📲 {t("I-install ang app", "Install the app")}</b>
      {prompt ? (
        <button
          className="btn btn-gold"
          onClick={async () => {
            prompt.prompt();
            await prompt.userChoice.catch(() => {});
            setPrompt(null);
          }}
        >
          {t("I-install", "Install")}
        </button>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          {ios
            ? t("Pindutin ang Share, saka “Add to Home Screen”.", "Tap Share, then “Add to Home Screen”.")
            : t("Buksan ang menu ng browser (⋮), saka “Install app” o “Add to Home screen”.", "Open the browser menu (⋮), then “Install app” or “Add to Home screen”.")}
        </p>
      )}
    </div>
  );
}
