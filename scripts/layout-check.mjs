// Dev helper: checks each screen at phone and tablet sizes for elder-friendly layout rules:
//  - no sideways scrolling
//  - every button/link at least 44px tall
//  - body text at least 17px
// Usage: node scripts/layout-check.mjs [baseUrl]   (needs `npm i -D playwright`)
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const widths = { "small phone": 360, phone: 390, tablet: 820, "tablet landscape": 1180 };
const pages = ["/", "/kiosk", "/display", "/staff"];
let problems = 0;

const browser = await chromium.launch();
for (const [label, width] of Object.entries(widths)) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, isMobile: width < 1000, hasTouch: true });
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(base + p);
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const out = [];
      const sw = document.documentElement.scrollWidth, cw = document.documentElement.clientWidth;
      if (sw > cw + 1) out.push(`sideways scroll: ${sw} > ${cw}`);
      for (const el of document.querySelectorAll("button, a.btn, .choice")) {
        const b = el.getBoundingClientRect();
        if (b.width && b.height < 44) out.push(`small target (${Math.round(b.height)}px): ${el.textContent.trim().slice(0, 30)}`);
      }
      const fs = parseFloat(getComputedStyle(document.body).fontSize);
      if (fs < 17) out.push(`body font ${fs}px`);
      return out;
    });
    const tag = `${label.padEnd(16)} ${p.padEnd(9)}`;
    if (r.length) {
      problems += r.length;
      console.log(`✘ ${tag} ${r.join(" | ")}`);
    } else console.log(`✔ ${tag}`);
  }
  await ctx.close();
}
await browser.close();
console.log(problems ? `${problems} problem(s)` : "LAYOUT OK");
