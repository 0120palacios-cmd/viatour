-- Requires travel_operations.sql. No production execution authorized.
begin;
create sequence if not exists public.payment_receipt_number;
create table if not exists public.payment_receipts(
 id uuid primary key default gen_random_uuid(),
 payment_id uuid not null unique references public.payments(id),
 reservation_id uuid not null references public.reservations(id),
 number text not null unique default ('REC-'||lpad(nextval('public.payment_receipt_number')::text,8,'0')),
 snapshot jsonb not null, created_by uuid not null, created_at timestamptz not null default now()
);
alter table public.payment_receipts enable row level security;
drop policy if exists receipt_admin on public.payment_receipts;
create policy receipt_admin on public.payment_receipts for select to authenticated using(public.is_admin());
revoke all on public.payment_receipts from anon,authenticated;
grant select on public.payment_receipts to authenticated;
do $$ begin if exists(select 1 from pg_roles where rolname='service_role') then grant select on public.payment_receipts to service_role;end if;end $$;
create or replace function public.create_payment_receipt(p_payment uuid) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.payments; r public.reservations; receipt uuid; paid numeric;
begin
 if not public.is_admin() then raise exception 'forbidden';end if;
 select * into p from public.payments where id=p_payment;
 if not found then raise exception 'payment_not_found';end if;
 select * into r from public.reservations where id=p.reservation_id for update;
 -- All receipt creation on one reservation is serialized; re-read and lock payment after reservation.
 select * into p from public.payments where id=p_payment for update;
 if not found or p.reservation_id<>r.id or coalesce(p.monto,0)<=0 or p.moneda is distinct from r.moneda then raise exception 'invalid_payment_currency_or_amount';end if;
 if p.fecha_pago is null or p.fecha_pago>(now() at time zone 'America/Tegucigalpa')::date then raise exception 'future_payment_cannot_be_receipted';end if;
 select id into receipt from public.payment_receipts where payment_id=p_payment;
 if found then return receipt;end if;
 select coalesce(sum(monto),0) into paid from public.payments where reservation_id=r.id and moneda=r.moneda;
 insert into public.payment_receipts(payment_id,reservation_id,created_by,snapshot) values(p.id,r.id,auth.uid(),jsonb_build_object('customer',r.cliente_nombre,'reservation',r.codigo,'amount',p.monto,'currency',p.moneda,'method',p.metodo,'reference',p.referencia,'date',p.fecha_pago,'balance',r.total-paid)) returning id into receipt;
 return receipt;
end $$;
revoke all on function public.create_payment_receipt(uuid) from public,anon;
grant execute on function public.create_payment_receipt(uuid) to authenticated;
create or replace function public.guard_receipted_payment() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if exists(select 1 from public.payment_receipts where payment_id=old.id) then raise exception 'receipted_payment_locked'; end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
drop trigger if exists receipted_payment_locked on public.payments;
create trigger receipted_payment_locked before update or delete on public.payments for each row execute function public.guard_receipted_payment();
create table if not exists public.travel_deliveries(
 id uuid primary key default gen_random_uuid(),reservation_id uuid not null references public.reservations(id),revision integer,
 receipt_id uuid unique references public.payment_receipts(id),
 recipient text not null, status text not null default 'preparado' check(status in ('preparado','aceptado','fallido','incierto')),
 pdf_base64 text not null, calendar text, provider_id text, created_by uuid not null,created_at timestamptz not null default now(),
 unique(reservation_id,revision), foreign key(reservation_id,revision) references public.reservation_travel_history(reservation_id,revision),
 check((revision is not null and receipt_id is null) or (revision is null and receipt_id is not null))
);
alter table public.travel_deliveries enable row level security;
drop policy if exists delivery_admin on public.travel_deliveries;
create policy delivery_admin on public.travel_deliveries for all to authenticated using(public.is_admin()) with check(public.is_admin());
revoke all on public.travel_deliveries from anon,authenticated;
grant select,insert,update on public.travel_deliveries to authenticated;
create or replace function public.guard_travel_delivery() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='INSERT' then
  if new.status<>'preparado' or new.provider_id is not null or new.created_by is distinct from auth.uid() then raise exception 'invalid_delivery_attempt';end if;
  if new.receipt_id is not null and not exists(select 1 from public.payment_receipts where id=new.receipt_id and reservation_id=new.reservation_id) then raise exception 'receipt_reservation_mismatch';end if;
  return new;
 end if;
 if old.status<>'preparado' or (to_jsonb(new)-'status'-'provider_id') is distinct from (to_jsonb(old)-'status'-'provider_id') then raise exception 'delivery_snapshot_locked';end if;
 return new;
end $$;
drop trigger if exists delivery_snapshot_locked on public.travel_deliveries;
create trigger delivery_snapshot_locked before insert or update on public.travel_deliveries for each row execute function public.guard_travel_delivery();
commit;
