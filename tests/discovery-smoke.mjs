import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(process.env.PLAYWRIGHT_PACKAGE || import.meta.url);
const { chromium } = require("playwright");
const origin = process.env.SMOKE_ORIGIN || "http://localhost:3011";
const browser = await chromium.launch({ channel: process.env.DISCOVERY_BROWSER || "msedge", headless: true });
const page = await browser.newPage();
const errors = [], handoffOrder = [];
let expiry = 0;

page.on("pageerror", error => errors.push(error.message));
await page.route("https://challenges.cloudflare.com/**", route => route.fulfill({ contentType: "application/javascript", body: `window.turnstile={render(el,options){setTimeout(()=>options.callback('test-token'),0);return 'test-widget'},remove(){},reset(){}};` }));
await page.route("**/api/human", route => {
  if (route.request().method() === "POST") expiry = Date.now() + 1800000;
  return route.fulfill({ json: { ok: true, expires: expiry } });
});
await page.route("**/api/leads", route => { handoffOrder.push("lead"); return route.fulfill({ status: 201, json: { ok: true, id: "discovery-test" } }); });
await page.route("https://wa.me/**", route => { handoffOrder.push("whatsapp"); return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>WhatsApp test</title>" }); });

try {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/descubrir`);
    await page.getByRole("button", { name: "Rechazar", exact: true }).click({ timeout: 1500 }).catch(() => {});
    await page.getByRole("heading", { name: "Descubra su próximo destino" }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow before questionnaire at ${width}`);

    await page.getByRole("radio", { name: "Pareja" }).check();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("checkbox", { name: "Playa y relax" }).check();
    await page.getByRole("checkbox", { name: "Romance" }).check();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("radio", { name: "Medio" }).check();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("radio", { name: "Cálido" }).check();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("radio", { name: "Una semana" }).check();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("checkbox", { name: "Playa" }).check();
    await page.getByRole("checkbox", { name: "Familia" }).check();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByLabel("Número de viajeros").fill("2");
    await page.getByRole("button", { name: "Ver recomendaciones" }).click();
    await page.getByRole("heading", { name: "Recomendaciones personalizadas según sus preferencias" }).waitFor();
    assert.equal(await page.getByRole("link", { name: "Conocer destino" }).count(), 3, `three recommendations at ${width}`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow after questionnaire at ${width}`);
    if (width === 320) {
      await page.getByRole("button", { name: "Reciba estas opciones por WhatsApp" }).waitFor({ state: "visible" });
      await page.waitForTimeout(100);
      await page.getByRole("button", { name: "Reciba estas opciones por WhatsApp" }).click();
      await page.waitForTimeout(150);
      assert.deepEqual(handoffOrder, ["lead", "whatsapp"]);
    }
    console.log(`PASS discovery ${width}px`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
