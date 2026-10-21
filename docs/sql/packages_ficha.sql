-- Ejecutar manualmente en Supabase (SQL Editor o `npx supabase db query --linked --file`). No lo ejecuta
-- la aplicación.
-- 2026-10-16: contenido enriquecido opcional de un paquete (columna packages.ficha).
--
-- Antes: respaldo (pg_dump). Después: la consulta de verificación al final (solo lectura).
--
-- Es aditivo y se puede volver a ejecutar. No modifica filas existentes: la columna nace vacía (null) y los
-- paquetes actuales se ven exactamente igual.
--   * ficha guarda lo que la ficha pública muestra además de las columnas actuales: subtítulo, lo más
--     destacado, opciones de cotización (por ejemplo, hotel en la ciudad o con una noche todo incluido),
--     secciones informativas, servicios adicionales que se pueden pedir, aviso de precios, título y
--     descripción de búsqueda y créditos de las fotografías. La forma la valida src/lib/package-sheet.ts.
--   * La escriben los scripts de datos (scripts/package-insert-sql.mjs, scripts/import-packages.mjs); el
--     panel no la edita y guardar un paquete desde el panel la conserva.
--   * Hereda las políticas y permisos de public.packages: anon la lee solo en paquetes publicados.
--   * Sin precios ni disponibilidad.

begin;

alter table public.packages add column if not exists ficha jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'packages_ficha_check' and conrelid = 'public.packages'::regclass) then
    alter table public.packages add constraint packages_ficha_check
      check (ficha is null or (jsonb_typeof(ficha) = 'object' and pg_column_size(ficha) <= 65536));
  end if;
end $$;

comment on column public.packages.ficha is 'Contenido opcional de la ficha pública (src/lib/package-sheet.ts). Sin precios.';

commit;

-- Verificación (solo lectura):
-- select column_name, data_type, is_nullable from information_schema.columns
--   where table_schema = 'public' and table_name = 'packages' and column_name = 'ficha';
-- select count(*) filter (where ficha is not null) as con_ficha, count(*) as paquetes from public.packages;
