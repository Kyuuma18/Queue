"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { QueueState } from "./queue";
import type { OfficeId } from "./config";

/** Fetches JSON every `ms` milliseconds; pauses while the tab is hidden. */
export function usePolling<T>(url: string | null, ms: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number>(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!url) return;
    try {
      const r = await fetch(url, { cache: "no-store" });
      setStatus(r.status);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error");
      setData(j);
      setError(null);
    } catch (e: any) {
      setError(navigator.onLine === false ? "Walang internet / No internet connection" : e.message);
    }
  }, [url]);

  useEffect(() => {
    let stop = false;
    async function loop() {
      if (stop) return;
      if (document.visibilityState === "visible") await load();
      if (!stop) timer.current = setTimeout(loop, ms);
    }
    loop();
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load, ms]);

  return { data, error, status, reload: load };
}

export function useQueueState(ms = 4000, office: OfficeId = "bplo") {
  const { data, error, reload } = usePolling<QueueState>(`/api/state?office=${office}`, ms);
  return { state: data, error, reload };
}

/** Ticket the person took on this device, so they can come back to it. */
export interface SavedTicket {
  id: number;
  token: string;
  number: string;
  day: string;
  /** Which office's queue it is in (older saved tickets have none, which means BPLO). */
  office?: OfficeId;
}

export function manilaDay() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

export function loadSaved(): SavedTicket[] {
  try {
    const all: SavedTicket[] = JSON.parse(localStorage.getItem("cq_tickets") ?? "[]");
    return all.filter((t) => t.day === manilaDay());
  } catch {
    return [];
  }
}

export function saveTicket(t: SavedTicket) {
  try {
    const all = loadSaved().filter((x) => x.id !== t.id);
    localStorage.setItem("cq_tickets", JSON.stringify([t, ...all].slice(0, 5)));
  } catch {}
}
