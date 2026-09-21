-- Ejecutar manualmente en Supabase. No lo ejecuta la aplicación.
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  asunto text not null check (char_length(asunto) between 1 and 160),
  mensaje text not null check (char_length(mensaje) between 1 and 4000),
  estado text not null default 'abierto' check (estado in ('abierto', 'en_revision', 'resuelto', 'cerrado')),
  respuesta text check (respuesta is null or char_length(respuesta) <= 4000),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_reservation_created_idx
  on public.support_tickets (reservation_id, created_at desc);
create index if not exists support_tickets_estado_created_idx
  on public.support_tickets (estado, created_at desc);

alter table public.support_tickets enable row level security;
drop policy if exists "support_tickets_staff_only" on public.support_tickets;
create policy "support_tickets_staff_only"
  on public.support_tickets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on table public.support_tickets from anon, public;
grant select, insert, update on table public.support_tickets to authenticated;

-- El portal y el panel usan el service-role en el servidor después de una
-- comprobación de sesión/admin. No otorgue permisos directos a anon.
