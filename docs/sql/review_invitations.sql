-- Stage 7: ejecutar manualmente en Supabase SQL Editor.
-- La tabla contiene solo datos administrativos; no se expone a visitantes.
create table if not exists public.review_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  nombre text not null,
  token text not null unique,
  estado text not null default 'enviada' check (estado in ('enviada', 'usada')),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index if not exists review_invitations_estado_idx on public.review_invitations (estado, created_at desc);

alter table public.review_invitations enable row level security;

drop policy if exists "review_invitations_staff_all" on public.review_invitations;
create policy "review_invitations_staff_all"
  on public.review_invitations
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on table public.review_invitations from anon, public;
grant select, insert, update on table public.review_invitations to authenticated;
