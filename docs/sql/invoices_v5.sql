-- Ejecutar manualmente en Supabase (SQL Editor). No lo ejecuta la aplicación.
-- 2026-10-13: la tabla invoices de producción no tiene las columnas que usa el panel (detalle de ítems,
-- correo y teléfono del cliente). Por eso fallaba crear facturas. Es aditivo: no cambia ni borra datos;
-- las facturas existentes (hoy, ninguna) quedan con ítems vacíos y sin correo.
-- Se puede volver a ejecutar sin efecto.

begin;
alter table public.invoices add column if not exists items jsonb not null default '[]'::jsonb;
alter table public.invoices add column if not exists cliente_email text;
alter table public.invoices add column if not exists cliente_telefono text;
commit;

-- Verificación: 3 filas.
select column_name, data_type, is_nullable, column_default from information_schema.columns
where table_schema = 'public' and table_name = 'invoices' and column_name in ('items', 'cliente_email', 'cliente_telefono');

-- Reversión (solo si no hay facturas nuevas que necesiten estos datos):
--   alter table public.invoices drop column if exists items, drop column if exists cliente_email, drop column if exists cliente_telefono;
