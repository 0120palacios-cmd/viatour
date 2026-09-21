# Etapa 7: opiniones, moderación e invitaciones

La presentación pública de opiniones lee únicamente `reviews_resumen` y `reviews_publicas`. El resumen debe calcularse sobre `estado = 'aprobada'`, redondear `promedio` a un decimal y contar `c5` a `c1`; al ser vistas, vuelve a calcularse después de aprobar, rechazar, despublicar o eliminar una fila.

Antes de usar invitaciones, ejecute manualmente [review_invitations.sql](sql/review_invitations.sql). La tabla y sus políticas no se aplican automáticamente desde la aplicación. Para cerrar la auditoría de las vistas, ejecute [reviews_views_audit.sql](sql/reviews_views_audit.sql), revise las definiciones impresas por `pg_get_viewdef` y aplique las correcciones incluidas solo si alguna no filtra `estado = 'aprobada'`.

El formulario de invitación está en `/admin/opiniones`. Cada enlace usa un token de un solo uso; la opinión se inserta como `pendiente`, se asocia mediante `fuente = 'invitacion'` y el registro se marca `usada` después de la inserción. Los correos salen por Resend desde `no-reply@miviatour.com` con respuesta a `soporte@miviatour.com`.

## Fixtures locales

`seed-reviews-dev.mjs` es una utilidad de desarrollo y está fuera de `src/`; la aplicación nunca la importa. Se niega con `NODE_ENV=production`, exige `SEED_DEV=1` y rechaza el dominio de producción. Ejecútela solo contra un proyecto local/de desarrollo con las variables `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y, si aplica, `NEXT_PUBLIC_SITE_URL` configuradas. Los cinco registros tienen `fuente = 'dev-fixture'` y esperan promedio `3.4`, total `5` y distribución `c5=1`, `c4=2`, `c3=1`, `c2=0`, `c1=1`. Nunca se despliegan ni se importan en producción.
