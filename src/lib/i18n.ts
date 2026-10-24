"use client";
import { useCallback, useSyncExternalStore } from "react";

/** The language a person picked with the Tagalog / English button. Remembered on their device. */
export type Lang = "tl" | "en";

const KEY = "cq_lang";
const listeners = new Set<() => void>();
let current: Lang | null = null;

function read(): Lang {
  try {
    return localStorage.getItem(KEY) === "en" ? "en" : "tl";
  } catch {
    return "tl";
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Another tab changed the language.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      current = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {}
  document.documentElement.lang = l === "en" ? "en" : "fil";
  listeners.forEach((f) => f());
}

export function useLang(): Lang {
  return useSyncExternalStore(
    subscribe,
    () => (current ??= read()),
    () => "tl",
  );
}

/** `const t = useT(); t("Kumuha ng Numero", "Get a queue number")` → the picked language. */
export function useT() {
  const lang = useLang();
  return useCallback((tl: string, en: string) => (lang === "en" ? en : tl), [lang]);
}
