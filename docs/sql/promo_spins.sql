-- Ejecutar manualmente en Supabase. No lo ejecuta la aplicación.
create table if not exists public.promo_spins (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'usada', 'expirada')),
  premio_id text null,
  premio_label text null,
  cliente_nombre text null,
  reservation_ref text null,
  created_at timestamptz not null default now(),
  used_at timestamptz null,
  expires_at timestamptz not null
);

alter table public.promo_spins enable row level security;
drop policy if exists "promo_spins_staff_only" on public.promo_spins;
create policy "promo_spins_staff_only" on public.promo_spins for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on table public.promo_spins from anon, public;
grant select, insert, update, delete on table public.promo_spins to authenticated;

-- El RPC bloquea el código mientras selecciona y consume el premio: un código
-- no puede producir dos resultados concurrentes. Solo el service role lo invoca.
create or replace function public.redeem_promo_spin(p_code text, p_segments jsonb)
returns table(premio_id text, premio_label text)
language plpgsql security definer set search_path = '' as $$
declare
  v_spin public.promo_spins%rowtype;
  v_total integer;
  v_pick integer;
  v_sum integer := 0;
  v_segment jsonb;
begin
  select * into v_spin from public.promo_spins where code = p_code for update;
  if not found or v_spin.estado <> 'pendiente' then
    return;
  end if;
  if v_spin.expires_at <= now() then
    update public.promo_spins set estado = 'expirada' where id = v_spin.id;
    return;
  end if;
  select sum((value->>'weight')::integer) into v_total from jsonb_array_elements(p_segments);
  if v_total is null or v_total < 1 then return; end if;
  v_pick := floor(random() * v_total)::integer + 1;
  for v_segment in select value from jsonb_array_elements(p_segments) loop
    v_sum := v_sum + (v_segment->>'weight')::integer;
    if v_pick <= v_sum then
      update public.promo_spins set estado = 'usada', premio_id = v_segment->>'id',
        premio_label = v_segment->>'label_es', used_at = now()
        where id = v_spin.id and estado = 'pendiente';
      if found then
        return query select v_segment->>'id', v_segment->>'label_es';
      end if;
      return;
    end if;
  end loop;
end;
$$;
revoke all on function public.redeem_promo_spin(text, jsonb) from public, anon, authenticated;
grant execute on function public.redeem_promo_spin(text, jsonb) to service_role;
