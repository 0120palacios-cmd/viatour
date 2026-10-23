-- Admin overhaul, step 6: reusable passenger profiles, linked to a customer.
-- A profile is the agency's record of a traveller (the customer or a companion). Reservations still keep their
-- own encrypted passenger file: loading a profile into a reservation copies it, like catalogs into quotations.
-- In clear only what is needed to find a person and to warn about expiry: names, category, nationality,
-- document type, issuing country, document expiry (owner-approved) and the last 4 characters of the number.
-- Everything else (birth date, sex, document number, contacts, notes) is AES-256-GCM encrypted by the app with
-- the same key as the passenger file (TRAVEL_DATA_KEY), in "privado".
-- Images (profile photo, passport page) live in the private bucket passenger-docs, as re-encoded JPEG (no
-- metadata). The passport image is deleted 30 days after the last linked trip (pasaporte_borrar_despues) by the
-- daily job; the photo stays until the profile is deleted.
-- Rehearsal: node scripts/test-passenger-profiles-sql.mjs. Apply only with owner approval.
begin;

create table if not exists public.passenger_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 120),
  otros_nombres text not null default '' check (char_length(otros_nombres) <= 120),
  apellidos text not null check (char_length(btrim(apellidos)) between 1 and 120),
  categoria text not null default 'adulto' check (categoria in ('adulto', 'nino', 'infante')),
  nacionalidad text not null default '' check (char_length(nacionalidad) <= 60),
  tipo_documento text not null default 'pasaporte' check (tipo_documento in ('ninguno', 'pasaporte', 'identidad', 'otro')),
  pais_emision text not null default '' check (char_length(pais_emision) <= 60),
  vence_documento date,
  documento_final text not null default '' check (documento_final ~ '^[A-Z0-9]{0,4}$'),
  privado text check (privado ~ '^v1\.'),
  foto_path text check (foto_path ~ '^[0-9a-f-]{36}/foto-[0-9a-f]{32}\.jpg$'),
  pasaporte_path text check (pasaporte_path ~ '^[0-9a-f-]{36}/pasaporte-[0-9a-f]{32}\.jpg$'),
  pasaporte_borrar_despues date,
  creado_por uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((pasaporte_path is null) or (pasaporte_borrar_despues is not null))
);
create index if not exists passenger_profiles_customer_idx on public.passenger_profiles (customer_id);
create index if not exists passenger_profiles_retention_idx on public.passenger_profiles (pasaporte_borrar_despues) where pasaporte_path is not null;

drop trigger if exists passenger_profiles_updated_at on public.passenger_profiles;
create trigger passenger_profiles_updated_at before update on public.passenger_profiles for each row execute function public.set_updated_at();

alter table public.passenger_profiles enable row level security;
drop policy if exists "staff passenger profiles" on public.passenger_profiles;
create policy "staff passenger profiles" on public.passenger_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.passenger_profiles from anon, authenticated, service_role;
grant select, insert, update, delete on public.passenger_profiles to authenticated;
-- The daily job only finds expired passport images and clears their path after deleting the file.
grant select, update on public.passenger_profiles to service_role;

alter table public.admin_audit_log drop constraint if exists admin_audit_log_entity_check;
alter table public.admin_audit_log add constraint admin_audit_log_entity_check
  check (entity = any (array['quotation', 'reservation', 'invoice', 'payment', 'receipt', 'travel', 'admin', 'passenger_profile']));

-- Activity history: which profile and which kind of change, never names, numbers or images.
create or replace function public.audit_passenger_profile()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare changed text[];
begin
  if tg_op = 'INSERT' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, details)
      values (auth.uid(), 'passenger.created', 'passenger_profile', new.id, jsonb_build_object('customer_id', new.customer_id));
  elsif tg_op = 'DELETE' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, details)
      values (auth.uid(), 'passenger.deleted', 'passenger_profile', old.id, jsonb_build_object('customer_id', old.customer_id));
  else
    select array_agg(key order by key) into changed from jsonb_each(to_jsonb(new)) n
      where key not in ('updated_at') and n.value is distinct from to_jsonb(old)->key;
    if changed is not null then
      insert into public.admin_audit_log (actor, action, entity, entity_id, details)
        values (auth.uid(), case when 'pasaporte_path' = any(changed) and new.pasaporte_path is null then 'passenger.passport_image_removed' else 'passenger.updated' end,
          'passenger_profile', new.id, jsonb_build_object('customer_id', new.customer_id, 'campos', to_jsonb(changed)));
    end if;
  end if;
  return null;
end; $function$;
drop trigger if exists audit_passenger_profile on public.passenger_profiles;
create trigger audit_passenger_profile after insert or update or delete on public.passenger_profiles for each row execute function public.audit_passenger_profile();
revoke all on function public.audit_passenger_profile() from public, anon, authenticated, service_role;

-- Private bucket: JPEG only, 5 MB, admins only; names tie each file to its profile.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('passenger-docs', 'passenger-docs', false, 5242880, array['image/jpeg'])
  on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];
drop policy if exists passenger_docs_admin_select on storage.objects;
create policy passenger_docs_admin_select on storage.objects for select to authenticated using (bucket_id = 'passenger-docs' and public.is_admin());
drop policy if exists passenger_docs_admin_insert on storage.objects;
create policy passenger_docs_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'passenger-docs' and public.is_admin() and name ~ '^[0-9a-f-]{36}/(foto|pasaporte)-[0-9a-f]{32}\.jpg$'
    and exists (select 1 from public.passenger_profiles p where p.id::text = split_part(name, '/', 1)));
drop policy if exists passenger_docs_admin_delete on storage.objects;
create policy passenger_docs_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'passenger-docs' and public.is_admin());

commit;
