-- Read-only. Run with owner-authorized access; retain output for release review.
select table_name,column_name,data_type,is_nullable from information_schema.columns
where table_schema='public' and table_name in ('quotations','quotation_versions','reservations','reservation_items','customers','invoices','payments','portal_otps') order by table_name,ordinal_position;
select c.relname,t.tgname,pg_get_triggerdef(t.oid) from pg_trigger t join pg_class c on c.oid=t.tgrelid
where not t.tgisinternal and c.relname in ('quotations','quotation_versions','reservations','reservation_items','invoices','payments');
select conrelid::regclass,conname,pg_get_constraintdef(oid) from pg_constraint
where conrelid in ('public.quotations'::regclass,'public.reservations'::regclass,'public.reservation_items'::regclass,'public.invoices'::regclass);
select tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public'
and tablename in ('quotations','quotation_versions','reservations','reservation_items','invoices','payments','customers');
select quotation_id,count(*) from public.reservations where quotation_id is not null group by quotation_id having count(*)>1;
select reservation_id,count(*) from public.invoices where estado<>'anulada' group by reservation_id having count(*)>1;
select count(*) as accepted_without_version from public.quotations where estado='aceptada' and version_aceptada is null;
select indexname,indexdef from pg_indexes where schemaname='public' and tablename in ('reservations','invoices','quotation_versions');
select routine_name,security_type from information_schema.routines where routine_schema='public' and routine_name in ('is_admin','hit_rate_limit','accept_quotation','convert_accepted_quotation','create_reservation_invoice','save_reservation_record');
