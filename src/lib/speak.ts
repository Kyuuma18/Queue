"use client";

/** Short two-tone chime, made in the browser (no sound file needed). */
export function chime() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [880, 660];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.45;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.45);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}

/** "PA012" → "Priority A, zero one two" so the voice reads it clearly. */
export function spokenNumber(n: string) {
  const prio = n.startsWith("P");
  const rest = prio ? n.slice(1) : n;
  const letter = rest[0];
  const digits = rest.slice(1).replace(/^0+(?=\d)/, "").split("").join(" ");
  return `${prio ? "Priority " : ""}${letter}, ${digits}`;
}

// Names of common female system voices (Windows, Android/Chrome, Apple); used when a voice has no gender label.
const FEMALE = /zira|aria|jenny|michelle|emma|ana|sonia|libby|natasha|blessica|female|woman|samantha|karen|moira|tessa|victoria|fiona|google (us|uk) english|google .*female|catherine|hazel|susan|heera|linda/i;
const MALE = /(david|mark|guy|james|george|ryan|male|man|alex|daniel|fred|ravi|sean|richard)/i;

function pickVoice(langs: RegExp[]): SpeechSynthesisVoice | undefined {
  const all = window.speechSynthesis.getVoices();
  for (const re of langs) {
    const cands = all.filter((v) => re.test(v.lang));
    const pick = cands.find((v) => FEMALE.test(v.name) && !MALE.test(v.name)) ?? cands.find((v) => !MALE.test(v.name));
    if (pick) return pick;
  }
  return undefined;
}

function say(text: string, langs: RegExp[], lang: string) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.9;
  u.pitch = 1.15; // a little higher, so a default voice still sounds like a woman
  u.volume = 1;
  const v = pickVoice(langs);
  if (v) {
    u.voice = v;
    u.lang = v.lang;
  }
  window.speechSynthesis.speak(u);
}

/** Chime, then a woman's voice reads the number and the counter: English first, then Tagalog. */
export function announce(number: string, counter: string) {
  chime();
  if (!("speechSynthesis" in window)) return;
  const go = () => {
    try {
      window.speechSynthesis.cancel();
      const n = spokenNumber(number);
      say(`Now serving. Number ${n}. Please proceed to ${counter}.`, [/en[-_](PH|US|GB)/i, /^en/i], "en-PH");
      say(`Numero ${n}, pumunta po sa ${counter}.`, [/fil|tl/i, /en[-_](PH|US|GB)/i, /^en/i], /fil|tl/i.test(window.speechSynthesis.getVoices().map((v) => v.lang).join()) ? "fil-PH" : "en-PH");
    } catch {}
  };
  // Voices load late in some browsers: wait for them once if the list is still empty.
  setTimeout(() => {
    if (window.speechSynthesis.getVoices().length) return go();
    let ran = false;
    const done = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", done);
      if (!ran) {
        ran = true;
        go();
      }
    };
    window.speechSynthesis.addEventListener("voiceschanged", done);
    setTimeout(done, 1500);
  }, 950);
}

export function vibrate() {
  try {
    navigator.vibrate?.([400, 150, 400, 150, 600]);
  } catch {}
}
