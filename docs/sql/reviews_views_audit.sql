-- Stage 7: auditoría solicitada. Ejecutar manualmente; este archivo no lo ejecuta la aplicación.
select 'reviews_publicas' as view_name, pg_get_viewdef('public.reviews_publicas'::regclass, true) as definition
union all
select 'reviews_resumen', pg_get_viewdef('public.reviews_resumen'::regclass, true);

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'reviews'
order by ordinal_position;

select estado, count(*)::integer as total
from public.reviews
group by estado
order by estado;

-- Si alguna definición no contiene where estado = 'aprobada', ejecute las dos
-- correcciones exactas siguientes para cerrar el filtro público.
create or replace view public.reviews_publicas
with (security_invoker = true)
as
select
  id,
  nombre,
  calificacion,
  texto,
  destino,
  foto_path,
  coalesce(fecha_original, created_at::date) as fecha,
  verificada,
  created_at
from public.reviews
where estado = 'aprobada';

create or replace view public.reviews_resumen
with (security_invoker = true)
as
select
  count(*)::integer as total,
  round(avg(calificacion)::numeric, 1) as promedio,
  count(*) filter (where calificacion = 5)::integer as c5,
  count(*) filter (where calificacion = 4)::integer as c4,
  count(*) filter (where calificacion = 3)::integer as c3,
  count(*) filter (where calificacion = 2)::integer as c2,
  count(*) filter (where calificacion = 1)::integer as c1
from public.reviews
where estado = 'aprobada';
