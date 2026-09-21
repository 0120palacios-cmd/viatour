-- Ejecutar manualmente en Supabase. No lo ejecuta la aplicación.
create table if not exists public.portal_otps (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now()
);

create index if not exists portal_otps_reservation_created_idx
  on public.portal_otps (reservation_id, created_at desc);

alter table public.portal_otps enable row level security;
drop policy if exists "portal_otps_staff_only" on public.portal_otps;
create policy "portal_otps_staff_only"
  on public.portal_otps for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on table public.portal_otps from anon, public;
grant select, insert, update, delete on table public.portal_otps to authenticated;

-- El service-role usado exclusivamente en el servidor omite RLS. No conceda
-- permisos de esta tabla al cliente ni exponga code_hash en una API.
