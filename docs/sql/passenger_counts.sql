-- After travel_operations.sql. Frozen accepted totals, never editable draft totals.
begin;
create or replace function public.guard_travel_passenger_counts() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare expected jsonb; category text; field text; wanted integer; actual integer; reviewed boolean;
begin
 select accepted_snapshot#>'{quotation,detalles,pasajeros}' into expected from public.reservations where id=new.reservation_id;
 reviewed:=coalesce((new.public_data->>'reviewed')::boolean,false) or new.public_data->>'status'<>'pendiente';
 if expected is null or jsonb_typeof(expected)<>'object' then
  if reviewed then raise exception 'accepted_passenger_counts_missing';end if;
  return new;
 end if;
 for category,field in select * from (values('adulto','adultos'),('nino','ninos'),('infante','infantes')) v(category,field) loop
  if coalesce(expected->>field,'') !~ '^\d{1,2}$' then
   if reviewed then raise exception 'accepted_passenger_counts_invalid';end if;
   return new;
  end if;
  wanted:=(expected->>field)::integer;
  select count(*) into actual from jsonb_array_elements(new.public_data->'passengers') p where p->>'category'=category;
  if actual>wanted or (reviewed and actual<>wanted) then raise exception 'accepted_passenger_count_mismatch';end if;
 end loop;
 if reviewed and jsonb_array_length(new.public_data->'passengers')=0 then raise exception 'passengers_required';end if;
 if exists(select 1 from jsonb_array_elements(new.public_data->'passengers') p where coalesce(p->>'category','') not in ('adulto','nino','infante')) then raise exception 'invalid_passenger_category';end if;
 return new;
end $$;
drop trigger if exists travel_passenger_counts on public.reservation_travel;
create trigger travel_passenger_counts before insert or update of public_data on public.reservation_travel for each row execute function public.guard_travel_passenger_counts();
commit;
