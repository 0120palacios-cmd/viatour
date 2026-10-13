-- Copia de seguridad de los datos de cotizaciones ANTES de quotations_v5.sql. Ejecutar en el SQL Editor.
-- Crea copias en un esquema privado "backup_v5" que la API del sitio no expone (no está en los esquemas
-- públicos de Supabase) y que los visitantes y clientes no pueden leer. No modifica las tablas originales.
-- Puede ejecutarse más de una vez: reemplaza la copia anterior.

begin;
create schema if not exists backup_v5;
revoke all on schema backup_v5 from public, anon, authenticated;

drop table if exists backup_v5.quotations;
drop table if exists backup_v5.quotation_items;
drop table if exists backup_v5.customers;
drop table if exists backup_v5.reservations;
create table backup_v5.quotations as table public.quotations;
create table backup_v5.quotation_items as table public.quotation_items;
create table backup_v5.customers as table public.customers;
create table backup_v5.reservations as table public.reservations;
commit;

-- Conteos de la copia (anótelos; deben coincidir con el preflight).
select 'quotations' as tabla, count(*) from backup_v5.quotations
union all select 'quotation_items', count(*) from backup_v5.quotation_items
union all select 'customers', count(*) from backup_v5.customers
union all select 'reservations', count(*) from backup_v5.reservations;

-- Cuando el sistema funcione bien durante algunas semanas, puede borrar la copia con:
--   drop schema backup_v5 cascade;
