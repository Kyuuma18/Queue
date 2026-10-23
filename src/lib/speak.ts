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

export function announce(number: string, counter: string) {
  chime();
  if (!("speechSynthesis" in window)) return;
  const text = `Number ${spokenNumber(number)}. Please proceed to ${counter}. Numero ${spokenNumber(number)}, pumunta po sa ${counter}.`;
  setTimeout(() => {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.85;
      u.lang = "en-PH";
      const v = window.speechSynthesis.getVoices().find((v) => /en[-_](PH|US|GB)/i.test(v.lang));
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    } catch {}
  }, 950);
}

export function vibrate() {
  try {
    navigator.vibrate?.([400, 150, 400, 150, 600]);
  } catch {}
}
