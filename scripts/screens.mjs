// Dev helper: screenshots of every screen at phone and tablet sizes.
// Usage: node scripts/screens.mjs [baseUrl] [outDir]   (needs `npm i -D playwright`)
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "/tmp/shots";
const pin = process.env.STAFF_PIN ?? "1234";

const sizes = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet: { width: 1024, height: 768, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true },
};

const browser = await chromium.launch();
for (const [name, vp] of Object.entries(sizes)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ...vp });
  const page = await ctx.newPage();
  const shot = (n) => page.screenshot({ path: `${out}/${name}-${n}.png`, fullPage: true });

  await page.goto(base + "/kiosk");
  await page.waitForTimeout(600);
  await shot("1-kiosk-service");
  await page.getByText("Pag-renew ng Permit").click();
  await shot("2-kiosk-priority");
  await page.getByText("Oo, Priority").click();
  await shot("3-kiosk-phone");
  await page.getByText("Get my number").click();
  await page.waitForURL(/ticket/);
  await page.waitForTimeout(1200);
  await shot("4-my-ticket");

  await page.goto(base + "/");
  await page.waitForTimeout(1000);
  await shot("0-home");

  await page.goto(base + "/staff");
  await page.waitForTimeout(600);
  if (await page.getByText("Staff Login").count()) {
    await shot("5-staff-login");
    for (const d of pin) await page.getByRole("button", { name: d, exact: true }).click();
    await page.getByRole("button", { name: "OK" }).click();
    await page.waitForTimeout(800);
  }
  if (await page.getByText("Which counter").count()) {
    await page.getByText("Counter 1", { exact: true }).first().click();
  }
  await page.waitForTimeout(1200);
  await shot("6-staff-desk");

  await page.goto(base + "/display");
  await page.waitForTimeout(1500);
  await shot("7-display");
  await ctx.close();
}
await browser.close();
console.log("done");
