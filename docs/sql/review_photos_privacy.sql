-- Ejecutar manualmente en Supabase. No lo ejecuta la aplicación.
-- Hay cero opiniones actualmente; este cambio deja el bucket preparado para
-- que solo las vistas aprobadas obtengan URLs firmadas de corta duración.
update storage.buckets
set public = false
where id = 'review-photos';

alter table storage.objects enable row level security;
drop policy if exists "review_photos_no_client_access" on storage.objects;
create policy "review_photos_no_client_access"
  on storage.objects for all to anon, authenticated
  using (bucket_id = 'review-photos' and false)
  with check (bucket_id = 'review-photos' and false);

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects';

-- Verifique que no exista una política amplia de lectura para anon o
-- authenticated que incluya bucket_id = 'review-photos'. La aplicación ya
-- no construye URLs /storage/v1/object/public/ para este bucket.
