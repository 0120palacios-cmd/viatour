import fs from "node:fs";
import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
// URLs in the sitemap use the site URL the server was built with (production: https://miviatour.com).
const site = (process.env.SMOKE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://miviatour.com').replace(/\/+$/, '');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const origin = process.env.SMOKE_ORIGIN || "http://localhost:3000";
const [{ data: destinations, error: destinationError }, { data: packages, error: packageError }] = await Promise.all([
  db.from("destinations").select("*").eq("publicado", true).order("orden").order("slug"),
  db.from("packages").select("*").eq("publicado", true),
]);
assert.ifError(destinationError);
assert.ifError(packageError);
assert.ok(destinations.length > 0, "Seed destinations must be available");
const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
async function page(path) {
  const response = await fetch(origin + path, { headers: { "user-agent": "Googlebot" } });
  assert.equal(response.status, 200, path);
  return response.text();
}
const hub = await page("/destinos");
const home = await page("/");
const sitemap = await page("/sitemap.xml");
for (const item of destinations) {
  const path = "/destinos/" + item.slug;
  assert.ok(hub.includes('href="' + path + '"'), "Hub link: " + item.slug);
  assert.ok(sitemap.includes(site + path), "Sitemap: " + item.slug);
  const html = await page(path);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, "One H1: " + item.slug);
  assert.ok(html.includes(escape(item.nombre)), "Name: " + item.slug);
  assert.ok(html.includes("<title>" + escape(item.titulo_seo?.trim() || "viatour | " + item.nombre + " desde Honduras") + "</title>"));
  // src/lib/seo.ts (round 5) trims descriptions over 160 characters on a sentence or word boundary and
  // adds a short closing sentence to short ones: the served text either starts the stored one or extends it.
  if (item.meta_descripcion) {
    const served = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
    const stored = escape(item.meta_descripcion.trim());
    assert.ok(served.length > 0 && served.length <= 161, "Description length: " + item.slug);
    assert.ok(stored.startsWith(served.replace(/…$/, "").trimEnd()) || served.startsWith(stored), "Description from DB: " + item.slug);
  }
  if (item.intro) assert.ok(html.includes(escape(item.intro)), "DB intro: " + item.slug);
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  const graph = scripts.flatMap(script => script["@graph"] || []);
  assert.ok(graph.some(node => node["@type"] === "BreadcrumbList"));
  const faqs = (item.faqs || []).filter(faq => faq?.pregunta?.trim() && faq?.respuesta?.trim());
  const faqSchema = graph.find(node => node["@type"] === "FAQPage");
  assert.equal(Boolean(faqSchema), Boolean(faqs.length));
  if (faqSchema) assert.equal(faqSchema.mainEntity.length, faqs.length);
  const linked = packages.filter(pack => pack.destination_id === item.id);
  for (const pack of linked) {
    assert.ok(html.includes('href="/paquetes/' + pack.slug + '"'), "Linked package: " + pack.slug);
    const detail = await page("/paquetes/" + pack.slug);
    assert.ok(detail.includes('href="' + path + '"'), "Reverse destination link");
    assert.ok(!html.includes("Precio referencial"), "Package price copy is hidden: " + pack.slug);
    assert.ok(!html.includes("priceCurrency"), "Package price schema is hidden: " + pack.slug);
  }
  if (item.destacado) assert.ok(home.includes('href="' + path + '"'), "Featured destination: " + item.slug);
  console.log("PASS", path, "linked packages:", linked.length, "FAQs:", faqs.length);
}
for (const pack of packages) assert.ok(sitemap.includes(site + "/paquetes/" + pack.slug));
const missing = await fetch(origin + "/destinos/no-existe-stage-5", { headers: { "user-agent": "Googlebot" } });
assert.equal(missing.status, 404, "Unknown destination must return HTTP 404");
// The 404 uses the shared "not found" copy; read it from the messages so the test follows approved text.
const missingHtml = await missing.text();
assert.ok(missingHtml.includes(JSON.parse(fs.readFileSync("messages/es.json", "utf8")).static.notFound), "404 message");
assert.ok(/<meta name="robots" content="noindex/.test(missingHtml), "404 is noindex");
console.log("PASS hub, featured destinations, sitemap, metadata, JSON-LD, cross-links and bad-slug 404");
