// Turns the output of docs/sql/schema_baseline_readonly.sql (run with
// `npx supabase db query --linked --output-format json --file ...`) into a readable DDL snapshot:
//   node scripts/schema-baseline.mjs <baseline.json> > docs/sql/000_baseline_schema.sql
// The snapshot is a reference for reviews, PGlite rehearsals and staging. It is never run on production.
import { readFileSync } from "node:fs";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/schema-baseline.mjs <baseline.json>");
  process.exit(1);
}
const parsed = JSON.parse(readFileSync(input, "utf8"));
const B = (parsed.rows ?? parsed)[0].baseline;
const q = name => /^[a-z_][a-z0-9_]*$/.test(name) ? name : `"${name.replaceAll('"', '""')}"`;
const out = [];
const line = text => out.push(text);
// Comment lines must stay on one line: policy expressions come back with newlines.
const comment = text => out.push(`-- ${text.replace(/\s+/g, " ")}`);

line("-- viatour production schema snapshot (public + storage policies). Structure only: no rows, no secrets.");
line(`-- Generated from a READ ONLY metadata query at ${B.generated_at} (PostgreSQL ${B.server_version}).`);
line(`-- Migration history table: ${B.migration_table ?? "none (schema is managed by reviewed files in docs/sql)"}.`);
line("-- Reference only. Do NOT run against production. Order: types, sequences, tables, keys, indexes, views, functions, triggers, RLS, grants, storage.");
line("");

for (const type of B.types ?? []) line(`create type public.${q(type.name)} as enum (${type.labels.map(label => `'${label}'`).join(", ")});`);
for (const sequence of B.sequences ?? []) line(`create sequence public.${q(sequence)};`);
line("");

for (const table of B.tables) {
  line(`create table public.${q(table.name)} (`);
  line(table.columns.map(column => {
    let text = `  ${q(column.name)} ${column.type}`;
    if (column.generated === "s") text += ` generated always as (${column.default}) stored`;
    else if (column.identity) text += ` generated ${column.identity === "a" ? "always" : "by default"} as identity`;
    else if (column.default != null) text += ` default ${column.default}`;
    if (column.not_null) text += " not null";
    return text;
  }).join(",\n"));
  line(");");
}
line("");

// Primary, unique and check constraints before foreign keys, so every referenced key exists.
const constraintOrder = { p: 0, u: 1, c: 2, x: 3, f: 4 };
const constraints = B.tables.flatMap(table => (table.constraints ?? []).map(constraint => ({ table: table.name, ...constraint })));
constraints.sort((a, b) => (constraintOrder[a.type] ?? 9) - (constraintOrder[b.type] ?? 9) || a.table.localeCompare(b.table) || a.name.localeCompare(b.name));
for (const constraint of constraints) line(`alter table public.${q(constraint.table)} add constraint ${q(constraint.name)} ${constraint.def};`);
line("");

for (const table of B.tables) for (const index of table.indexes ?? []) line(`${index};`);
line("");

for (const view of B.views ?? []) {
  const options = view.options?.length ? ` with (${view.options.join(", ")})` : "";
  line(`create view public.${q(view.name)}${options} as\n${view.def.trim().replace(/;$/, "")};`);
}
line("");

for (const fn of B.functions) {
  line(`${fn.def.trim()};`);
  line("");
}

for (const table of B.tables) for (const trigger of table.triggers ?? []) line(`${trigger};`);
line("");

for (const table of B.tables) {
  if (table.rls) line(`alter table public.${q(table.name)} enable row level security;`);
  if (table.forced) line(`alter table public.${q(table.name)} force row level security;`);
  for (const policy of table.policies ?? []) {
    const roles = Array.isArray(policy.roles) ? policy.roles.join(", ") : String(policy.roles).replace(/[{}]/g, "");
    line(`create policy ${q(policy.name)} on public.${q(table.name)} as ${String(policy.permissive).toLowerCase()} for ${String(policy.cmd).toLowerCase()} to ${roles}${policy.using ? ` using (${policy.using})` : ""}${policy.check ? ` with check (${policy.check})` : ""};`);
  }
}
line("");

line("-- Table privileges for the API roles (Supabase defaults included).");
for (const table of B.tables) {
  const byRole = {};
  for (const grant of table.grants ?? []) (byRole[grant.grantee] ??= []).push(grant.privilege);
  for (const [role, privileges] of Object.entries(byRole)) line(`grant ${privileges.join(", ").toLowerCase()} on public.${q(table.name)} to ${role};`);
}
line("");

line("-- Function execute privileges (proacl).");
for (const fn of B.functions) comment(`${fn.name}(${fn.args}): ${(fn.acl ?? ["default (PUBLIC)"]).join(" ")}${fn.security_definer ? " · SECURITY DEFINER" : ""}`);
line("");

line("-- Storage buckets.");
for (const bucket of B.storage_buckets ?? []) comment(`${bucket.id}: ${bucket.public ? "PUBLIC" : "private"}, limit ${bucket.file_size_limit ?? "none"}, types ${(bucket.allowed_mime_types ?? ["any"]).join(" ")}`);
line("");
line("-- Storage policies (storage.objects and related).");
for (const policy of B.storage_policies ?? []) {
  const roles = Array.isArray(policy.roles) ? policy.roles.join(", ") : String(policy.roles).replace(/[{}]/g, "");
  comment(`${policy.name} · ${policy.cmd} · ${roles}${policy.using ? ` · using (${policy.using})` : ""}${policy.check ? ` · check (${policy.check})` : ""}`);
}
process.stdout.write(`${out.join("\n")}\n`);
