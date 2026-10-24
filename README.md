# Cainta Queue — BPLO & Treasury

Queueing system for the Cainta Business Permit & Licensing Office, built for **phones and tablets first** and for **senior citizens**: very large numbers and buttons, high contrast, Tagalog + English on every screen, and a text-size switch (A / A+ / A++) at the top of every public page.

## Screens

| Link | Who uses it | What it does |
|---|---|---|
| `/` | Clients | Home: big "Kumuha ng Numero" button, who is being called now, and the client's own number if they already have one. |
| `/kiosk` | Clients (own phone) | 3 big steps: choose transaction → Senior/PWD/buntis? → optional mobile number for SMS. Opens the client's live ticket. |
| `/kiosk?shared=1` | Office tablet at the entrance | Same steps, but shows the number + a QR code the client scans to follow on their phone, then resets for the next person. |
| `/ticket` | Clients | Live ticket: number, how many are ahead, estimated minutes. Turns green and vibrates when called ("Kayo na po! Pumunta sa Counter 3"). Client can cancel. |
| `/display` | Waiting-area TV or tablet | Now serving per counter, next in line, no-show list, rotating requirements slides or videos, clock, and a QR code to get a number. Tap **"Tap to turn on sound"** once so it chimes and reads each number aloud in English and Tagalog. |
| `/staff` | Counter staff | PIN keypad login → pick counter → **Call Next**, **Recall**, **Complete**, **No-show**, **Transfer** (e.g. Renewal → Payment keeping the same number). Lists of waiting and no-show numbers with search; any number can be called directly. |

Priority clients (Senior, PWD, buntis, with infant) get a **P** number (e.g. `PA012`) and are always called first.

## Settings

Everything you are likely to change is in **`src/lib/config.ts`**:

- `SERVICES` — the transactions and their ticket letters
- `COUNTERS` — how many windows there are and which letters each one calls
- `SLIDES` / `VIDEOS` — what the waiting-area TV shows
- `NOTIFY_WHEN_AHEAD`, `MINUTES_PER_CLIENT`

Put the municipal seal at **`public/logo.jpg`** to show it in the header and on the TV.

## Environment variables (Vercel → Settings → Environment Variables)

| Name | Needed | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres (already set by the Neon integration). The app creates/updates the `tickets` table itself and keeps existing rows. |
| `STAFF_PIN` | Yes | PIN for the staff screen (already set). |
| `SEMAPHORE_API_KEY` | Optional | Turns on SMS through [Semaphore](https://semaphore.co). Without it, texts are only logged. |
| `SEMAPHORE_SENDER` | Optional | Approved sender name for Semaphore. |

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000 — uses a local database in ./.pglite, staff PIN 1234
```

`scripts/smoke-test.sh` runs through the whole flow (take numbers → call → transfer → no-show → cancel) against a running server.

## GSO queue (second office)

The General Services Office has its own queue next to the BPLO one, with the same screens under `/gso`:
`/gso` (home), `/gso/kiosk`, `/gso/display` (TV), `/gso/staff`. Staff use the same PIN.

- **Numbers restart at 1 every day**, separately for each office and each transaction (BPLO: A, B, C. GSO: R = Request, L = Release).
- **Unclaimed numbers are kept.** A number marked "Hindi sumipot / No-show" (or one a counter left open overnight) stays on the unclaimed list day after day, with its old number and the date it was issued, until staff press **Claimed**, call it, or **Put back** it in the line. People still waiting in the line at closing time are not carried over.
- The GSO transactions and windows are set in `src/lib/config.ts` (`OFFICES.gso`).
