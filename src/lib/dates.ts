import type { Lang } from "./i18n";

/** True when a ticket was issued on an earlier day (a number carried over, still unclaimed). */
export function isCarried(cday: string | undefined, today: string) {
  return !!cday && cday < today;
}

/** "Oct 23" / "Okt 23" for a "YYYY-MM-DD" issue day. */
export function dayLabel(cday: string, lang: Lang) {
  return new Date(`${cday}T00:00:00+08:00`).toLocaleDateString(lang === "en" ? "en-PH" : "fil-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
  });
}
