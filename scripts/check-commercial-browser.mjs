// Read-only browser smoke checks. No authentication submission or customer mutation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext();
const page=await context.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const base='http://localhost:3033';const report=[];
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.goto(`${base}/mi-reserva`,{waitUntil:'networkidle'});
  await page.getByRole('heading',{level:1}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
  assert.ok(await page.locator('input[name="codigo"]').isVisible());
  assert.ok(await page.locator('input[name="apellido"]').isVisible());
  await page.locator('input[name="codigo"]').focus();assert.equal(await page.locator('input[name="codigo"]').evaluate(el=>el===document.activeElement),true);
  await page.screenshot({path:`output/portal-${viewport.width}.png`,fullPage:true});
  report.push({check:`portal ${viewport.width}px`,result:'PASS: access fields, focus, no horizontal overflow'});
 }
 for(const route of ['/api/mi-reserva/pdf','/api/mi-reserva/facturas/11111111-1111-4111-8111-111111111111/pdf']){
  const response=await context.request.get(base+route);assert.equal(response.status(),401);report.push({check:route,result:'PASS: unauthorized'});
 }
 await page.goto(`${base}/admin/cotizaciones/11111111-1111-4111-8111-111111111111`);assert.ok(page.url().includes('/admin/login'));
 report.push({check:'admin quotation',result:'PASS: unauthenticated redirect'});
 const deployed=await context.request.get('https://www.miviatour.com/mi-reserva');assert.equal(deployed.status(),200);
 report.push({check:'deployed customer portal link (GET only)',result:'PASS: HTTP 200'});
 assert.deepEqual(errors,[]);
 fs.writeFileSync('output/commercial-browser.json',JSON.stringify({report,errors,authenticatedJourney:'NOT TESTED: no isolated Supabase admin/client credentials supplied'},null,2));
 console.log(JSON.stringify(report));
}finally{await browser.close();}
