import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
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
  assert.ok(sitemap.includes("https://miviatour.com" + path), "Sitemap: " + item.slug);
  const html = await page(path);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, "One H1: " + item.slug);
  assert.ok(html.includes(escape(item.nombre)), "Name: " + item.slug);
  assert.ok(html.includes("<title>" + escape(item.titulo_seo?.trim() || "viatour | " + item.nombre + " desde Honduras") + "</title>"));
  if (item.meta_descripcion) assert.ok(html.includes('name="description" content="' + escape(item.meta_descripcion) + '"'));
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
    if (pack.precio_desde === null) assert.ok(html.includes("Precio referencial — pídanos su cotización"));
  }
  if (item.destacado) assert.ok(home.includes('href="' + path + '"'), "Featured destination: " + item.slug);
  console.log("PASS", path, "linked packages:", linked.length, "FAQs:", faqs.length);
}
for (const pack of packages) assert.ok(sitemap.includes("https://miviatour.com/paquetes/" + pack.slug));
const missing = await fetch(origin + "/destinos/no-existe-stage-5", { headers: { "user-agent": "Googlebot" } });
assert.equal(missing.status, 404, "Unknown destination must return HTTP 404");
assert.ok((await missing.text()).includes("Destino no disponible"));
console.log("PASS hub, featured destinations, sitemap, metadata, JSON-LD, cross-links and bad-slug 404");
