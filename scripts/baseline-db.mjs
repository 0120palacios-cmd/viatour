// Isolated PostgreSQL/WASM (PGlite) built from docs/sql/000_baseline_schema.sql: the production structure
// with no rows, no network and no credentials. Supabase pieces the schema depends on are stubbed:
// API roles, auth.users, auth.uid() (from the `test.uid` setting) and storage.objects/buckets.
// Used by the SQL rehearsal scripts (scripts/test-*-sql.mjs) so new migrations are tested against the
// real schema instead of hand-written tables.
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

export const ADMIN = "11111111-1111-4111-8111-111111111111";
export const STAFF = "22222222-2222-4222-8222-222222222222";

export async function baselineDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; grant usage on schema auth to anon, authenticated, service_role;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    create schema storage; grant usage on schema storage to anon, authenticated, service_role;
    create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid, created_at timestamptz default now(), metadata jsonb);
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    grant usage on schema public to anon, authenticated, service_role;
    insert into auth.users values ('${ADMIN}', 'admin@example.test'), ('${STAFF}', 'staff@example.test');
  `);
  // Function bodies are validated at call time, so creation order inside the snapshot does not matter.
  await db.exec("set check_function_bodies = off;");
  await db.exec(fs.readFileSync(new URL("../docs/sql/000_baseline_schema.sql", import.meta.url), "utf8"));
  await db.exec("set check_function_bodies = on;");
  await db.exec(`insert into public.admins (user_id) values ('${ADMIN}');`);
  // Supabase's default privileges: every new table, sequence and function in public is granted to the API
  // roles, so a migration that forgets to revoke is caught here as it would be in production.
  await db.exec(`alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;`);
  return db;
}

// Runs `fn` as the given user through the `authenticated` role, the way PostgREST does, and always
// returns to the superuser afterwards.
export async function asUser(db, uid, fn) {
  await db.exec(`set test.uid = '${uid ?? ""}'; set role ${uid ? "authenticated" : "anon"};`);
  try { return await fn(); } finally { await db.exec("reset role; set test.uid = '';"); }
}
