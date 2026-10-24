// ─────────────────────────────────────────────────────────────
//  Office settings — edit this file to change the queue.
// ─────────────────────────────────────────────────────────────

export const OFFICE_NAME = "Cainta Business Permit & Licensing Office";
export const OFFICE_SHORT = "BPLO & Treasury";
export const MUNICIPALITY = "Bayan ng Cainta, Rizal";

/**
 * Services people can line up for.
 * `code` is the letter on the ticket (A001, B014 …). Keep it to one capital letter.
 * `icon` is a simple emoji shown on the big buttons.
 */
export const SERVICES = [
  {
    code: "A",
    name: "Renewal Application",
    tl: "Pag-renew ng Permit",
    detail: "Submit requirements and get assessed",
    detailTl: "Magpasa ng requirements at magpa-assess",
    icon: "📝",
    color: "#1d4ed8",
  },
  {
    code: "B",
    name: "Payment",
    tl: "Pagbabayad",
    detail: "Pay your assessed fees at the Treasury",
    detailTl: "Magbayad ng assessed fees sa Treasury",
    icon: "💵",
    color: "#047857",
  },
  {
    code: "C",
    name: "Permit Release",
    tl: "Pagkuha ng Permit",
    detail: "Claim your renewed Business Permit",
    detailTl: "Kunin ang inyong Business Permit",
    icon: "📄",
    color: "#b45309",
  },
] as const;

export type ServiceCode = (typeof SERVICES)[number]["code"];

/**
 * Counters / windows. `services` lists which ticket letters each counter calls.
 * Add or remove lines to match the number of windows open.
 */
export const COUNTERS: { id: number; label: string; services: ServiceCode[] }[] = [
  { id: 1, label: "Counter 1", services: ["A"] },
  { id: 2, label: "Counter 2", services: ["A"] },
  { id: 3, label: "Counter 3", services: ["B"] },
  { id: 4, label: "Counter 4", services: ["B"] },
  { id: 5, label: "Counter 5", services: ["C", "A"] },
];

/** Text the person by SMS when this many people are ahead of them. */
export const NOTIFY_WHEN_AHEAD = 2;

/** Rough minutes per client, used only for the "about N minutes" estimate. */
export const MINUTES_PER_CLIENT = 6;

/**
 * Waiting-area TV (/display).
 * YouTube links (videos or playlists) or direct .mp4 links. Videos play muted.
 * Leave empty to show the rotating slides below instead.
 */
export const VIDEOS: string[] = [];

type Slide = { title: string; body?: string; list?: string[] };

// The requirements are document names, so the list is the same in both languages.
const REQUIREMENTS = [
  "Financial Statements or Income Tax Return",
  "Monthly, Quarterly or Percentage Tax Return",
  "Latest Business Permit",
  "Alphalist, as submitted to SSS (if applicable)",
  "Lease Contract or Tax Dec. with latest RPT O.R.",
  "Public Liability Insurance",
];

/** Rotating messages on the TV, one set per language (shown in the language picked with the button). */
export const SLIDES: Record<"tl" | "en", Slide[]> = {
  tl: [
    { title: "Mabuhay po sa Cainta!", body: "Salamat sa pag-renew ng inyong Business Permit." },
    { title: "Mga Kailangan sa Pag-renew", list: REQUIREMENTS },
    {
      title: "Priority Lane",
      body: "Ang mga senior citizen, PWD, buntis, at may kasamang sanggol ay may priority.",
    },
    {
      title: "Hintayin ang inyong numero",
      body: "Lalabas sa screen at ia-anunsyo ang inyong numero at counter. Dalhin ang inyong ticket o phone.",
    },
  ],
  en: [
    { title: "Welcome to Cainta!", body: "Thank you for renewing your Business Permit with us." },
    { title: "Requirements for Renewal", list: REQUIREMENTS },
    {
      title: "Priority Lane",
      body: "Senior citizens, PWD, pregnant clients and those with an infant are served first.",
    },
    {
      title: "Wait for your number",
      body: "Your number and counter will appear on the screen and be announced. Keep your ticket or phone with you.",
    },
  ],
};

export function service(code: string) {
  return SERVICES.find((s) => s.code === code);
}

export function serviceName(code: string) {
  return service(code)?.name ?? code;
}

export function counterLabel(id: number | null | undefined) {
  if (!id) return "";
  return COUNTERS.find((c) => c.id === id)?.label ?? `Counter ${id}`;
}
