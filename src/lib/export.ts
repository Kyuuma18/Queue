import { getOffice } from "./config";
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
export function toCsv(rows: ListRow[], officeId?: unknown) {
  const form = getOffice(officeId).form;
  const byAccount = form?.extra === "accountNumber";
  // Columns for the optional fields only appear when the office uses them.
  const cols: [string, (r: ListRow) => unknown][] = [
    ["Date issued", (r) => r.cday],
    ["Queue number", (r) => r.number],
    ["Type", (r) => (r.priority ? "PRIORITY" : "REGULAR")],
    ...(form?.appTypes ? [["Application type", (r: ListRow) => r.app_type] as [string, (r: ListRow) => unknown]] : []),
    ...(form?.bizTypes ? [["Business type", (r: ListRow) => r.biz_type] as [string, (r: ListRow) => unknown]] : []),
    ...(form
      ? [[byAccount ? "Account number" : "Business name", (r: ListRow) => (byAccount ? r.account_no : r.business_name)] as [string, (r: ListRow) => unknown]]
      : []),
    ["Status", (r) => statusLabel(r.status)],
    ["Counter", (r) => r.counter],
    ["Time issued", (r) => clock(r.created_at)],
    ["Time called", (r) => clock(r.called_at)],
    ["Time done", (r) => clock(r.done_at)],
  ];
  const lines = [cols.map(([h]) => cell(h)).join(",")];
  for (const r of rows) lines.push(cols.map(([, f]) => cell(f(r))).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
