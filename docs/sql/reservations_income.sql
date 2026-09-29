-- Ejecutar manualmente en Supabase. La aplicación no ejecuta migraciones. Seguro de volver a ejecutar.
-- Ingreso neto (comisión) y segmento por reserva, para reportes de ingresos. Solo administración:
-- las políticas RLS existentes de reservations ya limitan lectura y escritura a administradores.
alter table public.reservations add column if not exists comision numeric(12, 2) check (comision is null or comision >= 0);
alter table public.reservations add column if not exists segmento text;
create index if not exists reservations_created_at_idx on public.reservations (created_at desc);
create index if not exists reservations_fecha_inicio_idx on public.reservations (fecha_inicio);
