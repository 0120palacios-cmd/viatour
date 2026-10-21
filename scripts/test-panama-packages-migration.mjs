// Validates docs/sql/packages_ficha.sql and docs/sql/panama_packages.sql on PGlite (real PostgreSQL in WASM).
// Never connects to Supabase. The packages schema is not in the repository, so it runs twice: with the
// list columns as text[] and as jsonb, and the inserts must work with either.
// Run: PGLITE_MODULE=file:///path/to/node_modules/@electric-sql/pglite/dist/index.js node scripts/test-panama-packages-migration.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';

const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
const sql = name => fs.readFileSync(`docs/sql/${name}`, 'utf8');
const slugs = ['panama-ciudad-canal-casco-historico', 'panama-ciudad-playa-blanca-todo-incluido', 'escapada-fin-de-semana-panama'];
const results = [];

for (const listType of ['text[]', 'jsonb']) {
  const db = new PGlite();
  const check = async (label, fn) => { try { await fn(); results.push(['PASS', `${listType}: ${label}`]); } catch (error) { results.push(['FAIL', `${listType}: ${label}`, error.message]); } };
  const anon = async statement => { await db.exec('set role anon;'); try { return await db.query(statement); } finally { await db.exec('reset role;'); } };
  await db.exec(`
create role anon nologin;
grant usage on schema public to anon;
create table public.destinations (id uuid primary key default gen_random_uuid(), slug text unique not null, nombre text not null);
insert into public.destinations (slug, nombre) values ('panama', 'Panamá'), ('cartagena', 'Cartagena');
create table public.packages (
  id uuid primary key default gen_random_uuid(), slug text unique not null, nombre text not null, destino text not null,
  resumen text, descripcion text, incluye ${listType}, no_incluye ${listType}, itinerario text, duracion text,
  precio_desde numeric, moneda text, imagen_url text, galeria ${listType}, categoria text, etiquetas ${listType},
  destacado boolean not null default false, publicado boolean not null default false, orden integer not null default 0,
  destination_id uuid references public.destinations(id), updated_at timestamptz default now());
alter table public.packages enable row level security;
create policy packages_public_read on public.packages for select to anon using (publicado);
grant select on public.packages to anon;
insert into public.packages (slug, nombre, destino, publicado, orden) values ('cartagena-y-panama', 'Cartagena y Panamá', 'Cartagena y Ciudad de Panamá', true, 2);
-- A slug that already exists must be left untouched.
insert into public.packages (slug, nombre, destino, publicado, orden) values ('escapada-fin-de-semana-panama', 'Registro previo', 'Panamá', true, 1);`);

  await check('ficha migration applies and is re-runnable', async () => { await db.exec(sql('packages_ficha.sql')); await db.exec(sql('packages_ficha.sql')); });
  await check('existing rows keep ficha null', async () => {
    const { rows } = await db.query(`select ficha from public.packages where slug = 'cartagena-y-panama'`);
    assert.equal(rows[0].ficha, null);
  });
  await check('ficha must be an object', async () => {
    await assert.rejects(db.query(`update public.packages set ficha = '[]'::jsonb where slug = 'cartagena-y-panama'`));
  });
  await check('package inserts apply and are re-runnable', async () => { await db.exec(sql('panama_packages.sql')); await db.exec(sql('panama_packages.sql')); });
  await check('new packages are inserted once, unpublished, linked to Panamá, without price', async () => {
    const { rows } = await db.query(`select p.slug, p.publicado, p.destacado, p.precio_desde, p.moneda, d.slug as destino, jsonb_typeof(p.ficha) as ficha, p.galeria from public.packages p left join public.destinations d on d.id = p.destination_id where p.slug in ('panama-ciudad-canal-casco-historico', 'panama-ciudad-playa-blanca-todo-incluido') order by p.orden`);
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.equal(row.publicado, false); assert.equal(row.destacado, false);
      assert.equal(row.precio_desde, null); assert.equal(row.moneda, null);
      assert.equal(row.destino, 'panama'); assert.equal(row.ficha, 'object');
      assert.ok((Array.isArray(row.galeria) ? row.galeria : JSON.parse(JSON.stringify(row.galeria))).length >= 7);
    }
  });
  await check('an existing slug is not overwritten', async () => {
    const { rows } = await db.query(`select nombre, publicado, ficha from public.packages where slug = 'escapada-fin-de-semana-panama'`);
    assert.equal(rows.length, 1); assert.equal(rows[0].nombre, 'Registro previo'); assert.equal(rows[0].publicado, true); assert.equal(rows[0].ficha, null);
  });
  await check('anon cannot read the unpublished packages', async () => {
    const { rows } = await anon(`select slug from public.packages where slug in (${slugs.map(slug => `'${slug}'`).join(', ')})`);
    assert.deepEqual(rows.map(row => row.slug), ['escapada-fin-de-semana-panama']);
  });
  await check('after publishing, anon reads the full ficha', async () => {
    await db.exec(`update public.packages set publicado = true where slug = 'panama-ciudad-canal-casco-historico'`);
    const { rows } = await anon(`select ficha->'seo'->>'titulo' as titulo, jsonb_array_length(ficha->'creditos') as creditos from public.packages where slug = 'panama-ciudad-canal-casco-historico'`);
    assert.equal(rows[0].titulo, 'viatour | Paquete a Panamá: Canal y Casco Antiguo');
    assert.equal(rows[0].creditos, 21);
  });
  await db.close();
}

for (const [status, label, detail] of results) console.log(`${status}  ${label}${detail ? ` — ${detail}` : ''}`);
const failed = results.filter(([status]) => status === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exitCode = failed ? 1 : 0;
