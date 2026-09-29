-- Ejecutar manualmente en Supabase (SQL editor). La aplicación no ejecuta migraciones.
-- Seguro de volver a ejecutar. Antes de ejecutarlo, la aplicación sigue funcionando:
-- /api/leads guarda teléfono, correo, referencia y atribución dentro de `payload`.

-- 1. Contacto, referencia, atribución y segmento del lead.
alter table public.leads add column if not exists telefono text;
alter table public.leads add column if not exists email text;
alter table public.leads add column if not exists referencia text;
alter table public.leads add column if not exists origen_web jsonb;
alter table public.leads add column if not exists segmento text;
alter table public.leads add column if not exists motivo_perdida text;
create unique index if not exists leads_referencia_key on public.leads (referencia) where referencia is not null;
create index if not exists leads_estado_created_idx on public.leads (estado, created_at desc);

-- Copia los datos de leads guardados antes de este script (quedaron en payload).
update public.leads set
  telefono = coalesce(telefono, nullif(payload->'contacto'->>'telefono', '')),
  email = coalesce(email, nullif(payload->'contacto'->>'email', '')),
  referencia = coalesce(referencia, nullif(payload->>'referencia', '')),
  origen_web = coalesce(origen_web, case when payload->'origen' = '{}'::jsonb then null else payload->'origen' end),
  segmento = coalesce(segmento, nullif(payload->>'segmento', ''))
where payload is not null;

-- 2. Estados del embudo: se agregan ganado y perdido (cerrado se conserva para registros previos).
do $$
declare c record;
begin
  for c in select conname from pg_constraint
    where conrelid = 'public.leads'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%estado%'
  loop
    execute format('alter table public.leads drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.leads add constraint leads_estado_check
  check (estado in ('nuevo', 'contactado', 'ganado', 'perdido', 'cerrado'));

-- 3. Relación cotización → lead para medir la conversión.
alter table public.quotations add column if not exists lead_id uuid references public.leads (id) on delete set null;
create index if not exists quotations_lead_id_idx on public.quotations (lead_id);

-- Las políticas RLS existentes de leads y quotations cubren las columnas nuevas; no se agregan grants.
