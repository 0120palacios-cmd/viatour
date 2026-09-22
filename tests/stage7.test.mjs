import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => dependencies[name], Response, Request, File, FormData, Buffer, crypto, AbortSignal, URL, process: { env: {} }, console: { error() {} }, ...globals });
  return exports;
}

test("dev fixture rating math is 3.4 with the expected distribution", () => {
  const ratings = [5, 4, 4, 3, 1];
  assert.equal(Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1)), 3.4);
  assert.deepEqual(Object.fromEntries([5, 4, 3, 2, 1].map(star => [`c${star}`, ratings.filter(value => value === star).length])), { c5: 1, c4: 2, c3: 1, c2: 0, c1: 1 });
});

test("invitation action inserts a unique token and sends from the configured invitation sender", async () => {
  let inserted;
  let email;
  const client = { from: table => { assert.equal(table, "review_invitations"); return { insert: value => { inserted = value; return { select: () => ({ single: async () => ({ data: { id: "invitation-id" }, error: null }) }) }; } }; } };
  const api = load("src/app/admin/opiniones/actions.ts", {
    "node:crypto": { randomBytes: () => ({ toString: encoding => encoding === "base64url" ? "A".repeat(43) : "" }) },
    "next/cache": { revalidatePath() {} },
    "@/lib/admin": { requireAdmin: async () => ({ client }) },
    "@/lib/notifications": { sendResendEmail: async value => { email = value; } },
    "@/lib/site-config": { siteConfig: { url: "https://miviatour.com", supportEmail: "soporte@miviatour.com", reviewInvitationFrom: "no-reply@miviatour.com" } },
  }, { process: { env: { RESEND_API_KEY: "test" } } });
  const form = new FormData(); form.set("nombre", "Prueba invitación"); form.set("email", "person@example.invalid");
  const result = await api.sendReviewInvitation({}, form);
  assert.equal(result.success, "Invitación enviada.");
  assert.equal(inserted.email, "person@example.invalid");
  assert.match(inserted.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(email.from, "no-reply@miviatour.com");
  assert.match(email.text, /\/opiniones\/nueva\?token=/);
});

test("tokenized review is saved as pending, associated, and consumed", async () => {
  let row;
  let consumed = false;
  const client = {
    storage: { from: () => ({ upload: async () => ({ error: null }), remove: async () => ({}) }) },
    from: table => {
      assert.equal(table, "reviews");
      return { insert: value => { row = value; return Promise.resolve({ error: null }); } };
    },
  };
  const validation = load("src/lib/review-validation.ts");
  const route = load("src/app/api/reviews/route.ts", {
    "@/lib/review-validation": validation,
    "@/lib/supabase/admin": { createAdminClient: () => client },
    "@/lib/public-security": { rateLimit: async () => null, verifyTurnstile: async () => true },
    "@/lib/notifications": { notifySubmission: async () => {} },
    "@/lib/review-invitations": {
      getValidReviewInvitation: async token => ({ id: "invitation-id", token, nombre: "Persona invitada", email: "invite@example.invalid", estado: "enviada", created_at: "2026-01-01T00:00:00Z", used_at: null }),
      consumeReviewInvitation: async () => { consumed = true; return true; },
    },
  });
  const form = new FormData();
  for (const [key, value] of Object.entries({ token: "A".repeat(43), nombre: "Persona invitada", email: "changed@example.invalid", calificacion: "5", texto: "Opinión de prueba para moderación." })) form.set(key, value);
  const response = await route.POST(new Request("http://local/api/reviews", { method: "POST", body: form }));
  assert.equal(response.status, 201);
  assert.equal(row.estado, "pendiente");
  assert.equal(row.fuente, "invitacion");
  assert.equal(row.email, "invite@example.invalid");
  assert.equal(consumed, true);
});

test("public schema stays absent without approved reviews", () => {
  const { reviewSchema } = load("src/lib/reviews.ts", { "server-only": {}, "@/lib/supabase/server": {} });
  assert.equal(reviewSchema({ total: 0, promedio: 0, c5: 0, c4: 0, c3: 0, c2: 0, c1: 0 }, []), null);
  const schema = reviewSchema({ total: 5, promedio: 3.4, c5: 1, c4: 2, c3: 1, c2: 0, c1: 1 }, []);
  assert.equal(schema.aggregateRating.ratingValue, "3.4");
});
