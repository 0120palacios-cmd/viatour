-- Ejecutar manualmente en Supabase (SQL Editor). No lo ejecuta la aplicación.
-- V4 (2026-09-30): permite que los administradores compartan, abran y eliminen documentos de viaje
-- desde /admin/reservas/{id}, con su propia sesión (nunca con la service role).
--
-- Es aditivo: no cambia el bucket ni la política "portal_docs_no_client_access", y no da acceso
-- a visitantes ni a clientes. Los clientes siguen entrando solo por /api/mi-reserva/documentos,
-- que verifica su sesión OTP en el servidor.
--
-- Rutas que usa el sitio:
--   {reservationId}/viatour/{8 hex}-{nombre}  documentos que comparte viatour
--   {reservationId}/cliente/{uuid}.{ext}       documentos que sube el cliente
--   {reservationId}/{uuid}.{ext}               subidas de clientes anteriores a V4

drop policy if exists "portal_docs_admin_select" on storage.objects;
create policy "portal_docs_admin_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'portal-docs' and public.is_admin());

drop policy if exists "portal_docs_admin_insert" on storage.objects;
create policy "portal_docs_admin_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'portal-docs' and public.is_admin());

drop policy if exists "portal_docs_admin_delete" on storage.objects;
create policy "portal_docs_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'portal-docs' and public.is_admin());

-- Verificación: deben aparecer las tres políticas, y ninguna otra que dé acceso a anon.
select policyname, cmd, roles from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like 'portal_docs%';

-- Reversión (deja el bucket como antes de V4):
--   drop policy if exists "portal_docs_admin_select" on storage.objects;
--   drop policy if exists "portal_docs_admin_insert" on storage.objects;
--   drop policy if exists "portal_docs_admin_delete" on storage.objects;
