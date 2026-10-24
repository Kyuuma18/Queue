import type { ListRow } from "./queue";

const STATUS_LABEL: Record<string, string> = {
  waiting: "Waiting",
  serving: "Serving",
  done: "Done",
  skipped: "Unclaimed",
  cancelled: "Cancelled",
};

export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;

/** "08:15:32" in Manila time, or "" when there is no time. */
function clock(v: string | Date | null) {
  if (!v) return "";
  return new Date(v).toLocaleTimeString("en-GB", { timeZone: "Asia/Manila", hour12: false });
}

/** One CSV cell. Text that starts like a spreadsheet formula is defused so Excel will not run it. */
function cell(v: unknown) {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

/** The queue list as a CSV file that opens correctly in Excel (UTF-8 with a byte-order mark). */
export function toCsv(rows: ListRow[]) {
  const head = [
    "Date issued",
    "Queue number",
    "Type",
    "Application type",
    "Business type",
    "Business name",
    "Status",
    "Counter",
    "Time issued",
    "Time called",
    "Time done",
  ];
  const lines = [head.map(cell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.cday,
        r.number,
        r.priority ? "PRIORITY" : "REGULAR",
        r.app_type,
        r.biz_type,
        r.business_name,
        statusLabel(r.status),
        r.counter,
        clock(r.created_at),
        clock(r.called_at),
        clock(r.done_at),
      ]
        .map(cell)
        .join(","),
    );
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
