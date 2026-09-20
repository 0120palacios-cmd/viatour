import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, request, quote, validation } from './security-support.mjs';

function guard({ now = Date.now(), secret = 'test-secret', fetch = async () => Response.json({ success: true }), allowed = true } = {}) {
  return load('src/lib/public-security.ts', { 'server-only': {}, '@/lib/supabase/admin': { createAdminClient: () => ({ rpc: async () => ({ data: allowed }) }) } }, {
    process: { env: { TURNSTILE_SECRET_KEY: secret, NODE_ENV: 'production' } }, fetch,
    Date: class extends Date { static now() { return now; } },
  });
}
function withCookie(cookie, route = 'leads', payload = quote()) {
  const req = request(payload, route);
  req.headers.set('cookie', cookie);
  return req;
}
test('human cookie is signed, HttpOnly, secure, same-site, fixed expiry and rejects tampering or key rotation', async () => {
  const now = Date.now(), api = guard({ now });
  const response = await api.humanSessionResponse();
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /Max-Age=1800; HttpOnly; SameSite=Strict; Secure/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const expires = (await response.json()).expires;
  assert.equal(expires, now + 1800000);
  assert.equal(await api.humanSessionExpires(withCookie(cookie)), expires);
  assert.equal(await guard({ now: expires }).humanSessionExpires(withCookie(cookie)), 0);
  assert.equal(await guard({ secret: 'rotated' }).humanSessionExpires(withCookie(cookie)), 0);
  assert.equal(await api.humanSessionExpires(withCookie(cookie.replace(String(expires), String(expires - 1000)))), 0);
  assert.equal(await api.humanSessionExpires(withCookie('viatour-human=garbage')), 0);
  assert.equal(await guard({ secret: '' }).humanSessionExpires(withCookie(cookie)), 0);
});
test('verified visitors skip Siteverify on every submission but still obey rate limits and origin checks', async () => {
  let calls = 0;
  const api = guard({ fetch: async () => { calls++; return Response.json({ success: true }); } });
  const cookie = (await api.humanSessionResponse()).headers.get('set-cookie');
  for (const route of ['leads', 'reviews', 'newsletter']) {
    assert.equal(await api.verifyTurnstile(withCookie(cookie, route), undefined), true);
  }
  assert.equal(calls, 0);
  const foreign = withCookie(cookie); foreign.headers.set('origin', 'https://foreign.invalid');
  assert.equal(await api.verifyTurnstile(foreign, undefined), false);
  const route = load('src/app/api/leads/route.ts', {
    '@/lib/public-security': guard({ allowed: false }), '@/lib/lead-validation': validation,
    '@/lib/supabase/admin': { createAdminClient() { throw Error('must not write'); } }, '@/lib/notifications': {},
  });
  assert.equal((await route.POST(withCookie(cookie))).status, 429);
});
test('human endpoint only issues cookies after successful verification and never extends a valid session', async () => {
  let calls = 0;
  const api = guard({ fetch: async (_url, options) => { calls++; return Response.json({ success: JSON.parse(options.body).response === 'valid' }); } });
  const route = load('src/app/api/human/route.ts', { '@/lib/public-security': api });
  const post = token => { const req = request({ token }, 'human'); req.headers.set('origin', 'http://local'); return req; };
  assert.equal((await route.POST(request({ token: 'valid' }, 'human'))).status, 403);
  assert.equal((await route.POST(post('bad'))).status, 400);
  const response = await route.POST(post('valid'));
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  const req = post(''); req.headers.set('cookie', cookie);
  const again = await route.POST(req);
  assert.equal(again.status, 200);
  assert.equal(again.headers.get('set-cookie'), null);
  assert.equal(calls, 2);
  assert.ok((await (await route.GET(req)).json()).expires > Date.now());
});
