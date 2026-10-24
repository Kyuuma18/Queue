// ─────────────────────────────────────────────────────────────
//  Office settings — edit this file to change the queues.
//  There is one queue per office: "bplo" (Business Permit & Licensing) and "gso" (General Services).
// ─────────────────────────────────────────────────────────────

export const MUNICIPALITY = "Bayan ng Cainta, Rizal";

/**
 * A transaction people can line up for.
 * `code` is the letter on the ticket (A001, R014 …): one capital letter, never reused by another office.
 * `icon` is a simple emoji shown on the big buttons.
 */
export interface Service {
  code: string;
  name: string;
  tl: string;
  detail: string;
  detailTl: string;
  icon: string;
  color: string;
}

/** Counters / windows. `services` lists which ticket letters each counter calls. */
export interface Counter {
  id: number;
  label: string;
  services: string[];
}

export type Slide = { title: string; body?: string; list?: string[] };

export type OfficeId = "bplo" | "gso";

export interface Office {
  id: OfficeId;
  name: string;
  short: string;
  /**
   * "per-service": each transaction has its own numbers with its letter (A001, B001 …).
   * "running": one running number for the whole office (001, 002 …), shown as-is on the TV.
   * Either way numbers start again at 1 every day.
   */
  numbering: "per-service" | "running";
  /**
   * When set, staff create tickets with a form (REGULAR or PRIORITY, then these fields).
   * `extra` is the last field: a Business Name (GSO), or an Account Number that defaults to TAXPAYER (BPLO).
   * `showNumber` shows the automatic number on the form as the "Folder Number" (GSO).
   * `service` is the line these tickets join (the first line if not set).
   */
  form?: {
    /** Optional drop-downs. Leave out to hide the field everywhere (form, list, filter, export). */
    appTypes?: string[];
    bizTypes?: string[];
    extra: "businessName" | "accountNumber";
    showNumber?: boolean;
    service?: string;
  };
  /** Page addresses for this office's screens. */
  paths: { home: string; kiosk: string; display: string; staff: string };
  services: Service[];
  counters: Counter[];
  /**
   * Waiting-area TV: YouTube links (videos or playlists) or direct .mp4 links. Videos play muted.
   * Leave empty to show the rotating slides instead.
   */
  videos: string[];
  slides: { tl: Slide[]; en: Slide[] };
}

// The requirements are document names, so the list is the same in both languages.
const REQUIREMENTS = [
  "Financial Statements or Income Tax Return",
  "Monthly, Quarterly or Percentage Tax Return",
  "Latest Business Permit",
  "Alphalist, as submitted to SSS (if applicable)",
  "Lease Contract or Tax Dec. with latest RPT O.R.",
  "Public Liability Insurance",
];

const PRIORITY_TL = "Ang mga senior citizen, PWD, buntis, at may kasamang sanggol ay may priority.";
const PRIORITY_EN = "Senior citizens, PWD, pregnant clients and those with an infant are served first.";
const WAIT_TL = "Lalabas sa screen at ia-anunsyo ang inyong numero at counter. Dalhin ang inyong ticket o phone.";
const WAIT_EN = "Your number and counter will appear on the screen and be announced. Keep your ticket or phone with you.";

export const OFFICES: Record<OfficeId, Office> = {
  bplo: {
    id: "bplo",
    name: "Cainta Business Permit & Licensing Office",
    short: "BPLO & Treasury",
    numbering: "per-service",
    // Staff can create a ticket for a client with the Account Number (TAXPAYER unless typed).
    // To bring back the two drop-downs, add: appTypes: ["NEW", "RENEWAL"], bizTypes: ["SINGLE", "PARTNERSHIP", "CORPORATION", "COOPERATIVE"],
    form: {
      extra: "accountNumber",
      service: "A",
    },
    paths: { home: "/", kiosk: "/kiosk", display: "/display", staff: "/staff" },
    services: [
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
    ],
    counters: [
      { id: 1, label: "Counter 1", services: ["A"] },
      { id: 2, label: "Counter 2", services: ["A"] },
      { id: 3, label: "Counter 3", services: ["B"] },
      { id: 4, label: "Counter 4", services: ["B"] },
      { id: 5, label: "Counter 5", services: ["C", "A"] },
    ],
    videos: [],
    slides: {
      tl: [
        { title: "Mabuhay po sa Cainta!", body: "Salamat sa pag-renew ng inyong Business Permit." },
        { title: "Mga Kailangan sa Pag-renew", list: REQUIREMENTS },
        { title: "Priority Lane", body: PRIORITY_TL },
        { title: "Hintayin ang inyong numero", body: WAIT_TL },
      ],
      en: [
        { title: "Welcome to Cainta!", body: "Thank you for renewing your Business Permit with us." },
        { title: "Requirements for Renewal", list: REQUIREMENTS },
        { title: "Priority Lane", body: PRIORITY_EN },
        { title: "Wait for your number", body: WAIT_EN },
      ],
    },
  },

  gso: {
    id: "gso",
    name: "Cainta General Services Office",
    short: "GSO",
    // GSO has one line with one running folder number (001, 002 …). Staff create the tickets with a form.
    numbering: "running",
    form: {
      extra: "businessName",
      showNumber: true,
    },
    paths: { home: "/gso", kiosk: "/gso/kiosk", display: "/gso/display", staff: "/gso/staff" },
    services: [
      {
        code: "G",
        name: "GSO queue",
        tl: "Pila sa GSO",
        detail: "Get a number for the General Services Office",
        detailTl: "Kumuha ng numero para sa General Services Office",
        icon: "🗂️",
        color: "#1d4ed8",
      },
    ],
    // Both windows call the one line, so whichever window is free serves the next number.
    counters: [
      { id: 1, label: "Counter 1", services: ["G"] },
      { id: 2, label: "Counter 2", services: ["G"] },
    ],
    videos: [],
    slides: {
      tl: [
        { title: "Mabuhay po sa GSO ng Cainta!", body: "Salamat po sa inyong pagbisita." },
        { title: "Priority Lane", body: PRIORITY_TL },
        { title: "Hintayin ang inyong numero", body: WAIT_TL },
      ],
      en: [
        { title: "Welcome to the Cainta GSO!", body: "Thank you for visiting us." },
        { title: "Priority Lane", body: PRIORITY_EN },
        { title: "Wait for your number", body: WAIT_EN },
      ],
    },
  },
};

export const OFFICE_IDS = Object.keys(OFFICES) as OfficeId[];

/** The office for a page or API call. Empty means BPLO (the original queue); anything unknown is an error. */
export function getOffice(id?: unknown): Office {
  if (id === undefined || id === null || id === "") return OFFICES.bplo;
  const o = OFFICES[id as OfficeId];
  if (!o) throw new Error("Unknown office");
  return o;
}

/** Text the person by SMS when this many people are ahead of them. */
export const NOTIFY_WHEN_AHEAD = 2;

/** Rough minutes per client, used only for the "about N minutes" estimate. */
export const MINUTES_PER_CLIENT = 6;

/** Look a transaction up by its ticket letter (letters are unique across offices). */
export function service(code: string) {
  for (const o of OFFICE_IDS) {
    const s = OFFICES[o].services.find((x) => x.code === code);
    if (s) return s;
  }
  return undefined;
}

export function serviceName(code: string) {
  return service(code)?.name ?? code;
}

export function counterLabel(office: unknown, id: number | null | undefined) {
  if (!id) return "";
  return getOffice(office).counters.find((c) => c.id === id)?.label ?? `Counter ${id}`;
}
