-- Ejecutar manualmente en Supabase. No lo ejecuta la aplicación.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portal-docs', 'portal-docs', false, 8388608,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;
drop policy if exists "portal_docs_no_client_access" on storage.objects;
create policy "portal_docs_no_client_access"
  on storage.objects for all to anon, authenticated
  using (bucket_id = 'portal-docs' and false)
  with check (bucket_id = 'portal-docs' and false);

-- No cree políticas de lectura/escritura para anon o authenticated en este
-- bucket. El servidor usa SUPABASE_SERVICE_ROLE_KEY y genera URLs firmadas
-- después de verificar la sesión. Revise que no exista una política amplia
-- sobre storage.objects que permita acceso al bucket portal-docs:
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects';

-- Si existe una política genérica que permita a anon/authenticated leer o
-- escribir cualquier objeto, elimínela o restrínjala para excluir
-- bucket_id = 'portal-docs'. No se debe publicar este bucket.
