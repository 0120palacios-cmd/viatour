-- Admin overhaul, step 4: sharing a quotation by WhatsApp with a secure, expiring link.
-- quotation_shares records every share of a frozen version: channel, phone, message, template and status.
-- Today only manual sharing exists ('whatsapp_manual': the advisor opens WhatsApp and then confirms "Lo envié");
-- opening WhatsApp is never treated as sent. The same table, statuses and audit entries are meant for a future
-- official WhatsApp Business integration ('whatsapp_api', proveedor_id, enviado/entregado/leido/fallido),
-- which is NOT configured here.
-- The customer link carries a random token; only its SHA-256 is stored (token_hash), so the table never holds
-- a usable link. The public page (/cotizacion/<token>) reads it through the service role only.
-- Rehearsal: node scripts/test-quotation-shares-sql.mjs. Apply only with owner approval.
begin;

create table if not exists public.quotation_shares (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  version_id uuid not null references public.quotation_versions(id),
  canal text not null check (canal in ('whatsapp_manual', 'whatsapp_api', 'correo')),
  telefono text check (telefono ~ '^\+[1-9][0-9]{7,14}$'),
  mensaje text check (char_length(mensaje) <= 1000),
  plantilla text not null default 'cotizacion_v1' check (char_length(plantilla) <= 60),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  estado text not null default 'preparado'
    check (estado in ('preparado', 'confirmado', 'cancelado', 'revocado', 'enviado', 'entregado', 'leido', 'fallido')),
  proveedor_id text,
  expira_en timestamptz not null,
  creado_por uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  confirmado_en timestamptz,
  confirmado_por uuid references auth.users(id),
  cerrado_en timestamptz,
  abierto_en timestamptz,
  aperturas integer not null default 0 check (aperturas >= 0),
  check (expira_en > created_at and expira_en <= created_at + interval '90 days')
);
create index if not exists quotation_shares_quotation_idx on public.quotation_shares (quotation_id, created_at desc);

alter table public.quotation_shares enable row level security;
drop policy if exists "staff quotation shares" on public.quotation_shares;
create policy "staff quotation shares" on public.quotation_shares for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.quotation_shares from anon, authenticated, service_role;
grant select, insert, update on public.quotation_shares to authenticated;
-- The public page only finds a share by its hash and counts the opening.
grant select, update on public.quotation_shares to service_role;

-- What was shared never changes; only the status moves forward, and the opening counter only grows.
create or replace function public.quotation_shares_guard()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if (new.quotation_id, new.version_id, new.canal, new.telefono, new.mensaje, new.plantilla, new.token_hash, new.expira_en, new.creado_por, new.created_at)
     is distinct from (old.quotation_id, old.version_id, old.canal, old.telefono, old.mensaje, old.plantilla, old.token_hash, old.expira_en, old.creado_por, old.created_at) then
    raise exception 'Un envío registrado no se puede modificar.' using errcode = '23514';
  end if;
  if new.aperturas < old.aperturas then raise exception 'Contador inválido.' using errcode = '23514'; end if;
  if new.estado is distinct from old.estado and not (
       (old.estado = 'preparado' and new.estado in ('confirmado', 'cancelado', 'enviado', 'fallido'))
    or (old.estado in ('confirmado', 'enviado', 'entregado', 'leido') and new.estado = 'revocado')
    or (old.estado = 'enviado' and new.estado in ('entregado', 'leido', 'fallido'))
    or (old.estado = 'entregado' and new.estado = 'leido')) then
    raise exception 'Cambio de estado del envío no permitido (% a %).', old.estado, new.estado using errcode = '23514';
  end if;
  return new;
end; $function$;
drop trigger if exists quotation_shares_guard on public.quotation_shares;
create trigger quotation_shares_guard before update on public.quotation_shares for each row execute function public.quotation_shares_guard();

-- Activity history: channel, version and status only; never the phone, the message or the token.
create or replace function public.audit_quotation_share()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if tg_op = 'INSERT' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
      values (auth.uid(), 'quotation.share_prepared', 'quotation', new.quotation_id, null,
        jsonb_build_object('share_id', new.id, 'canal', new.canal, 'version_id', new.version_id, 'plantilla', new.plantilla));
  elsif new.estado is distinct from old.estado then
    insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
      values (auth.uid(), 'quotation.share_' || new.estado, 'quotation', new.quotation_id, null,
        jsonb_build_object('share_id', new.id, 'canal', new.canal, 'version_id', new.version_id, 'from', old.estado));
  end if;
  return null;
end; $function$;
drop trigger if exists audit_quotation_share on public.quotation_shares;
create trigger audit_quotation_share after insert or update on public.quotation_shares for each row execute function public.audit_quotation_share();

-- "Lo envié": the advisor confirms the share went out. Records the version as the sent one (like registering a
-- send) and the share as confirmed, together. Repeating it changes nothing.
create or replace function public.confirm_quotation_share(p_share uuid)
 returns uuid
 language plpgsql
 set search_path to ''
as $function$
declare s public.quotation_shares; q public.quotations;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into strict s from public.quotation_shares where id = p_share for update;
  if s.estado = 'confirmado' then return s.version_id; end if;
  if s.estado <> 'preparado' then raise exception 'Este envío ya no está pendiente (%).', s.estado using errcode = '23514'; end if;
  if s.expira_en < now() then raise exception 'El enlace de este envío ya venció. Prepare uno nuevo.' using errcode = '23514'; end if;
  select * into strict q from public.quotations where id = s.quotation_id for update;
  if q.estado not in ('borrador', 'enviada') then
    raise exception 'La cotización está %; ya no se registra como enviada.', q.estado using errcode = '23514'; end if;
  update public.quotation_shares set estado = 'confirmado', confirmado_en = now(), confirmado_por = auth.uid() where id = s.id;
  update public.quotations set estado = 'enviada', sent_version_id = s.version_id where id = q.id;
  return s.version_id;
end; $function$;

revoke all on function public.quotation_shares_guard(), public.audit_quotation_share() from public, anon, authenticated, service_role;
revoke all on function public.confirm_quotation_share(uuid) from public, anon, service_role;
grant execute on function public.confirm_quotation_share(uuid) to authenticated;

commit;
