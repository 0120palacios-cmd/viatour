-- STAGING ONLY: synthetic test data for viatour-staging (ref cmbptpscpigtcefsmhwe). Never run in production.
-- Run: npx supabase db query --linked --project-ref cmbptpscpigtcefsmhwe --file docs/sql/staging_seed.sql
--
-- Every name, phone and e-mail is invented ([PRUEBA], example.test, +504 9999-xxxx). No real passengers,
-- passports or customers. Reservations are created through the real RPCs (send → accept → convert →
-- payment → invoice), so the seed also exercises the commercial workflow end to end.
--
-- Safety: it aborts if the database holds any quotation, reservation or customer it did not create
-- (production has real rows), and does nothing if it already ran. It needs one admin: if public.admins is
-- empty and auth.users holds exactly one user (the staging admin created by the owner), that user becomes it.
begin;

do $seed$
declare
  admin_id uuid;
  tag constant text := 'seed:staging';
  q record;
  v_id uuid;
  r_id uuid;
  plan jsonb := '[
    {"key":"borrador","nombre":"[PRUEBA] Ana Martínez","email":"ana.martinez@example.test","tel":"+50499990001","destino":"Cancún","total":1250,"estado":"borrador"},
    {"key":"enviada","nombre":"[PRUEBA] Luis Romero","email":null,"tel":"+50499990002","destino":"Madrid","total":1890,"estado":"enviada"},
    {"key":"vencida","nombre":"[PRUEBA] Carla Mejía","email":"carla.mejia@example.test","tel":"+50499990003","destino":"Bogotá","total":640,"estado":"enviada","validez":-1},
    {"key":"rechazada","nombre":"[PRUEBA] Jorge Pineda","email":"jorge.pineda@example.test","tel":"+50499990004","destino":"Lima","total":980,"estado":"rechazada"},
    {"key":"aceptada","nombre":"[PRUEBA] Sofía Rivera","email":"sofia.rivera@example.test","tel":"+50499990005","destino":"Orlando","total":2100,"estado":"aceptada"},
    {"key":"reserva_parcial","nombre":"[PRUEBA] Marta Flores","email":"marta.flores@example.test","tel":"+50499990006","destino":"Miami","total":578,"estado":"reserva","apellido":"FLORES","pago":300},
    {"key":"reserva_sin_correo","nombre":"[PRUEBA] Pedro Castillo","email":null,"tel":"+50499990007","destino":"Ciudad de Panamá","total":1076,"estado":"reserva","apellido":"CASTILLO","pago":1076}
  ]';
begin
  if exists (select 1 from public.customers where notas = tag) then
    raise notice 'staging_seed: already applied, nothing to do';
    return;
  end if;
  if exists (select 1 from public.quotations) or exists (select 1 from public.reservations) or exists (select 1 from public.customers) then
    raise exception 'staging_seed: this database already has real data; refusing to run (production?)';
  end if;

  select user_id into admin_id from public.admins limit 1;
  if admin_id is null then
    if (select count(*) from auth.users) <> 1 then
      raise exception 'staging_seed: create exactly one staging admin user in Authentication first';
    end if;
    select id into admin_id from auth.users limit 1;
    insert into public.admins (user_id) values (admin_id);
  end if;
  -- auth.uid() for the RPCs: Supabase reads the JWT claims; the local PGlite rehearsal reads test.uid.
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  perform set_config('test.uid', admin_id::text, true);

  insert into public.leads (servicio, nombre, destino, fechas, pasajeros, telefono, email, referencia, estado, notas) values
    ('vuelos', '[PRUEBA] Daniel Ortiz', 'Nueva York', 'Diciembre', '2 adultos', '+50499990010', 'daniel.ortiz@example.test', 'PRUEBA-0001', 'nuevo', tag),
    ('paquetes', '[PRUEBA] Elena Cruz', 'Roatán', 'Semana Santa', '2 adultos, 1 niño', '+50499990011', null, 'PRUEBA-0002', 'contactado', tag);

  for q in select * from jsonb_to_recordset(plan) as x(key text, nombre text, email text, tel text, destino text, total numeric, estado text, validez int, apellido text, pago numeric) loop
    declare
      c_id uuid;
      quote_id uuid;
      snap jsonb;
    begin
      insert into public.customers (nombre, email, telefono, notas, created_by) values (q.nombre, q.email, q.tel, tag, admin_id) returning id into c_id;
      insert into public.quotations (customer_id, cliente_nombre, cliente_email, cliente_telefono, destino, moneda, total, estado, validez, notas, agente_id, tipo, detalles)
        values (c_id, q.nombre, q.email, q.tel, q.destino, 'USD', q.total, 'borrador', current_date + coalesce(q.validez, 15), tag, admin_id, 'general',
                jsonb_build_object('fechaSalida', (current_date + 45)::text, 'fechaRegreso', (current_date + 52)::text))
        returning id into quote_id;
      insert into public.quotation_items (quotation_id, descripcion, tipo, cantidad, precio_unitario, orden)
        values (quote_id, 'Paquete de viaje a ' || q.destino || ' (datos de prueba)', 'Paquete', 1, q.total, 0);
      if q.estado = 'borrador' then continue; end if;

      -- Registered as shared by WhatsApp: a frozen version 1 linked as the sent version (as registerQuotationSent does).
      snap := jsonb_build_object('quotation', (select to_jsonb(t) from public.quotations t where t.id = quote_id) || '{"version":1}',
                                 'items', (select jsonb_agg(to_jsonb(i)) from public.quotation_items i where i.quotation_id = quote_id),
                                 'emitida_en', now(), 'canal', 'whatsapp');
      insert into public.quotation_versions (quotation_id, version, snapshot, emitida_por) values (quote_id, 1, snap, admin_id) returning id into v_id;
      update public.quotations set estado = 'enviada', version = 1, sent_version_id = v_id where id = quote_id;
      if q.estado = 'enviada' then continue; end if;
      if q.estado = 'rechazada' then
        update public.quotations set estado = 'rechazada' where id = quote_id;
        continue;
      end if;

      perform public.accept_quotation(quote_id, v_id, 'Aceptada por WhatsApp (datos de prueba)');
      if q.estado = 'aceptada' then continue; end if;

      r_id := public.convert_accepted_quotation(quote_id, v_id, false, q.apellido);
      perform public.record_reservation_payment(gen_random_uuid(), r_id, q.pago, 'USD', 'transferencia', current_date, 'PRUEBA-TRF', 'Pago de prueba');
      perform public.create_reservation_invoice(r_id, current_date + 10);
    end;
  end loop;
  raise notice 'staging_seed: done (admin %)', admin_id;
end
$seed$;

commit;
