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

## Siguiente: fase 1, integridad comercial
Registrar envío sin correo (F-C1), recuperación de envíos fallidos (F-M1), motivo de rechazo, enmienda que reemplaza a la aceptada, duplicado transaccional (F-M7).
