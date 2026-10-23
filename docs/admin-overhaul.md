# Renovación de la administración (2026-10-23)

Rama `admin-overhaul` (desde `recovery-quotation-booking-invoice`, 20e2256). Nada se ha subido, fusionado, desplegado ni aplicado en producción.

La auditoría de la fase 1 (inventario, flujos, hallazgos F-*, diseño de pasajeros y hoja de ruta) se entregó al propietario el 2026-10-23. El propietario aprobó todas las recomendaciones:

1. Registrar envío por WhatsApp o en persona, sin correo.
2. Crear un entorno de pruebas (staging).
3. Renombrar «Factura» a «Estado de cuenta» y guardar el número de la factura CAI externa, **después de la confirmación del contador**.
4. Cancelación guiada con lista de verificación financiera.
5. Reversos y reembolsos como movimientos nuevos.
6. Roles, si más de una persona usa el panel.
7. Lectura de pasaporte (MRZ) solo en el navegador.
8. Imágenes de pasaporte eliminadas 30 días después del regreso, y vencimiento del pasaporte guardado sin cifrar.
9. Pasajeros vinculados a clientes.
10. Lectura de solo estructura de producción.
11. Revisión visual con sesión iniciada por el propietario.

## Fase 0: fundamentos

| Elemento | Estado |
|---|---|
| Esquema de producción versionado | **Hecho.** `docs/sql/schema_baseline_readonly.sql` (consulta `BEGIN READ ONLY`, solo estructura: sin filas ni secretos) → `scripts/schema-baseline.mjs` → `docs/sql/000_baseline_schema.sql`. Ejecutado una vez contra producción el 2026-10-23 con autorización. Revisado: sin correos, claves ni URLs privadas. |
| Base de pruebas con el esquema real | **Hecho.** `scripts/baseline-db.mjs` reconstruye el esquema en PGlite, con roles, `auth.uid()`, `storage` y los privilegios por defecto de Supabase. `node scripts/test-baseline-schema.mjs`: 5 de 5. |
| Registro de actividad | **Escrito y ensayado, NO aplicado.** `docs/sql/admin_audit_log.sql`: tabla solo de agregado, disparadores en cotizaciones, reservas, facturas, pagos, recibos y expediente; solo estados, códigos y montos, nunca datos personales. `node scripts/test-admin-audit-log-sql.mjs`: 8 de 8. Aplicarlo requiere respaldo y autorización. |
| Protección del área del cliente | **Hecho.** `scripts/customer-freeze.mjs` calcula la huella de 99 archivos (31 del cliente y 68 compartidos que importa) y de 6 espacios de traducción. `tests/customer-freeze.test.mjs` falla si alguno cambia. Solo se regenera con aprobación: `node scripts/customer-freeze.mjs --update`. |
| Línea base visual y de documentos del portal | Capturas con `TRIP_FIXTURES=1` y `scripts/check-trip-portal.mjs` / `inspect-trip-documents.mjs`; ver `output/phase0-*.log`. |
| Tarea diaria (F-H9) | **Confirmado inactivo.** Vercel no tiene `CRON_SECRET`: `/api/cron/daily` responde 401 cada día, las cotizaciones enviadas no vencen solas y no hay resumen diario. Activarlo es un cambio de configuración de producción: decisión del propietario. |

### Hechos confirmados en producción (solo estructura)
- 34 tablas en `public`, todas con RLS. Sin tabla de historial de migraciones.
- `customers` no tiene índice único de correo: la unicidad solo existe en la aplicación (F-M4).
- `admins` ya tiene una columna `role` (predeterminado `'agent'`) que el código no usa: base para los roles de la fase 6.
- `payment_recording_requests` existe: el registro idempotente de pagos está aplicado.
- Buckets: `portal-docs` y `quotation-media` privados; `blog-images` y `review-photos` públicos.

## Pendiente del propietario
- Número de personas que usarán el panel (define los roles).
- Crear el proyecto de staging en Supabase con su cuenta (yo no puedo crear cuentas): luego se carga `000_baseline_schema.sql` y datos anónimos.
- Respaldo y autorización para aplicar `admin_audit_log.sql`.
- `CRON_SECRET` en Vercel (activa el vencimiento automático y el resumen al propietario; los correos a clientes siguen apagados por sus propias variables).
- Respuesta del contador sobre «Factura».
- Revisión visual del panel con su sesión.

## Staging (2026-10-23)
Proyecto Supabase `viatour-staging` (ref `cmbptpscpigtcefsmhwe`, Canadá central, plan gratuito), creado por el propietario. Contiene el esquema de producción (`000_baseline_schema.sql`, buckets y políticas de storage, privilegios exactos): la comparación de estructura contra producción da **0 diferencias**. Sin datos. Se usa siempre con `--linked --project-ref cmbptpscpigtcefsmhwe`; el enlace local del CLI sigue apuntando a producción.

### Aislamiento de Preview (paso 1, aprobado el 2026-10-23)
Hasta ahora Preview usaba la base de producción, la clave de servicio y la clave real de Resend: un despliegue de prueba podía escribir datos reales y enviar correos a clientes. Objetivo:

| Variable | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | producción | **staging** (`cmbptpscpigtcefsmhwe`) |
| `RESEND_API_KEY` | sí | **no**: todo envío responde «no configurado»; nada sale |
| `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | sí | **no** |
| `TRAVEL_DATA_KEY`, `PORTAL_SECRET` | claves reales | **claves de prueba propias** |
| `CRON_SECRET`, `TRAVEL_EMAIL_ENABLED`, `PORTAL_MESSAGE_EMAILS` | sí | no |
| Turnstile, `NEXT_PUBLIC_SITE_URL` | sí | sí (sin riesgo) |

Vercel solo ejecuta cron en producción. Las variables se leen al construir: un despliegue Preview anterior al cambio sigue apuntando a producción y debe volver a desplegarse.

Datos de prueba: `docs/sql/staging_seed.sql` (solo staging; se niega a correr si encuentra datos reales). Crea leads, clientes y cotizaciones en todos los estados, y dos reservas por las RPC reales (envío por WhatsApp → aceptación → conversión → pago → factura), una sin correo y con saldo. Todo es inventado (`[PRUEBA]`, `example.test`, `+504 9999-…`). Ensayo: `node scripts/test-staging-seed-sql.mjs`, 8 de 8. Requiere que el propietario cree un único usuario en Authentication de staging; el seed lo convierte en administrador.

**Aplicado en producción el 2026-10-23** por el propietario (sin respaldo previo, por su decisión; los tres archivos son aditivos o solo de texto, cada uno en una transacción), en este orden: `fix_function_encoding.sql`, `conversion_without_email.sql`, `admin_audit_log.sql`. Verificación de solo lectura: 0 funciones con tildes dañadas, conversión con correo opcional y correo de acceso de una sola vez presentes, 6 disparadores de auditoría, RLS activo, anon sin lectura y authenticated sin inserción en el registro; conteos sin cambios (38 cotizaciones, 4 reservas). `000_baseline_schema.sql` se regeneró desde producción y staging coincide con 0 diferencias. Los ensayos de esas migraciones usan el esquema anterior (commit `fb8a56f`) mediante `snapshotAt()`.

## Hallazgos de la revisión visual con sesión (2026-10-23)
- 38 cotizaciones, 36 en borrador y 0 enviadas: se comparten por WhatsApp y nunca se podían aceptar. Las dos reservas reales se crearon a mano.
- El correo obligatorio produjo correos de relleno (`cliente@miviatour.com` compartido por dos clientes) y clientes con el teléfono como nombre.
- **VT-7CC608B0 y VT-CCB2E6FD**: el cliente ve «Boletos emitidos» (copia pública, revisiones 4/5 del 21-oct a las 18:02:59, escritas por el arreglo manual de esa sesión), pero la copia cifrada que carga el administrador sigue en «Pendiente de emisión» y sin boletos. **No pulse «Guardar expediente revisado» en esas dos reservas** hasta aplicar la protección: guardaría la copia antigua y el cliente vería «pendiente» otra vez.
- La factura de VT-7CC608B0 (548 USD, pagada) no coincide con la reserva (578 USD, saldo 30).
- Cinco funciones de producción tienen tildes dañadas por una codificación incorrecta al aplicarlas («versiÃ³n»); el administrador ve esos mensajes. Corrección en `fix_function_encoding.sql`.

## Fase 1: integridad comercial (en curso)
| Cambio | Estado |
|---|---|
| «Registrar envío» por WhatsApp o en persona: versión fija con su canal, cotización enviada, PDF de la versión y chat de WhatsApp; luego se puede aceptar (F-C1) | Hecho en código, con pruebas |
| Cotización sin correo: el cliente se vincula o se crea por teléfono (E.164) | Hecho en código, con pruebas |
| Ficha de cliente: correo opcional, nombre más teléfono o correo, sin duplicar correos ni teléfonos | Hecho en código, con pruebas |
| Convertir sin correo y registrar después un correo de acceso una sola vez (`conversion_without_email.sql`, 8 de 8 en PGlite) | SQL en staging; código hecho |
| Protección del expediente: no volver atrás la emisión ni perder boletos que el cliente ya ve | **Bloqueado**: el sistema de permisos de Claude Code denegó la edición de `src/app/admin/reservas/travel-actions.ts`; requiere autorización del propietario |
| Recuperación de envíos fallidos (F-M1), motivo de rechazo, enmienda que reemplaza, duplicado transaccional (F-M7) | Pendiente |
