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

**Hecho el 2026-10-23.** Variables de Preview cambiadas por el propietario con scripts (el modo automático de Claude Code bloquea escrituras en Vercel); producción conserva sus valores. Preview `37cccf2` construido con staging: `/paquetes` muestra 0 paquetes y la sesión de administración de producción no sirve allí. Seed aplicado en staging: 1 administrador (el usuario creado por el propietario), 2 leads, 7 clientes, cotizaciones 1 borrador / 2 enviadas (1 vencida) / 1 rechazada / 3 aceptadas, 2 reservas con pago y factura, 23 entradas en el registro de actividad. Staging no tiene contenido público (paquetes, destinos, blog): el sitio público en Preview sale vacío. Los despliegues Preview anteriores a `37cccf2` conservan las variables antiguas (producción).

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

## Ramas (paso 2, 2026-10-23)
El propietario decidió no publicar Mi viaje premium junto con la administración. `admin-release` = `main` (lo que corre en producción) + solo los commits de administración; es la rama que se fusionará. El único conflicto (encabezado de la reserva) se resolvió conservando la versión de producción y añadiendo el formulario de correo de acceso. Los commits de administración no cambian ningún archivo del cliente ni traducciones; la huella del área del cliente se regeneró con aprobación del propietario sobre la versión de producción (66 archivos, 15 propios del cliente). `admin-overhaul` conserva Mi viaje premium hasta que el propietario decida publicarlo.

Verificación: 361 de 362 pruebas (la que falla, paquetes de Panamá, depende de fotos sin commit que solo existen en la carpeta principal y falla igual en `main`), typecheck y lint sin errores, 5 ensayos SQL, build de Vercel correcto. Preview: https://viatour-git-admin-release-miviatour.vercel.app (staging).

Las 19 vistas previas antiguas (construidas con las variables de producción) se eliminaron el 2026-10-23 con autorización del propietario.

## Paso 3: integridad de cotizaciones (2026-10-23)
SQL `docs/sql/quotation_integrity.sql` (ensayo 12 de 12; **aplicado solo en staging**). Código en `admin-release` (`a4c703f`, `c7b6b79`).

| Cambio | Verificación |
|---|---|
| Reenvío tras un envío fallido reutiliza la versión no entregada (mismo número, PDF y clave de idempotencia) si nada cambió y el medio es el mismo | Pruebas unitarias |
| Rechazo con motivo obligatorio (columna, fecha y regla en la base) | Pruebas + preview en staging: motivo y fecha visibles |
| Enmienda que reemplaza: al aceptarla, la original pasa a «Reemplazada por enmienda» y su reserva toma la nueva versión (total, servicios, fechas); pagos, facturas, pasajeros y acceso a Mi viaje no cambian; se rechaza con otra moneda o cliente, reserva cancelada o completada, o pagos mayores al nuevo total | Ensayo SQL + preview: Marta Flores 578 → 600, pago de 300 intacto, saldo 300 |
| Una sola enmienda abierta por cotización | Preview: «Ya existe la enmienda … en curso» |
| Copia y enmienda en una sola transacción (`create_quotation_copy`) | Ensayo SQL + pruebas |

«Reemplazada» vive en `src/lib/admin-quotation-status.ts`: `quotation-types.ts` es compartido con el área del cliente congelada.

Pendiente para pasos siguientes: la factura anterior conserva el total previo (578) tras una enmienda (paso de finanzas); en la cotización aceptada aún se muestran los paneles de envío (el servidor los rechaza); los enlaces «Abrir reserva» y «Ver versión aceptada» aparecen pegados.

## Paso 4: compartir por WhatsApp (2026-10-23)
SQL `docs/sql/quotation_shares.sql` (ensayo 8 de 8; **aplicado solo en staging**). Código en `admin-release` (`fc8d153`, `e550a14`).

- Panel «Compartir por WhatsApp»: número del cliente (editable, E.164) y mensaje editable con `{enlace}` → «Preparar envío» congela la versión (o reutiliza la preparada si nada cambió) y crea el enlace seguro → «Abrir WhatsApp» (wa.me con el mensaje), «Compartir PDF» (menú nativo del sistema, solo si el navegador admite archivos), «Descargar PDF», «Copiar enlace» → «Lo envié» / «No lo envié». Solo «Lo envié» marca la cotización como enviada. Un envío preparado se puede confirmar desde el historial después de recargar.
- Enlace `/cotizacion/<token>`: muestra la versión congelada y su PDF; token aleatorio de 256 bits, en la base solo su SHA-256 (el mensaje se guarda con `{enlace}`, nunca con el enlace); vence con la validez (máximo 60 días); límite de solicitudes, `noindex`, `no-referrer`; enlaces cancelados, desactivados o vencidos no muestran nada. Cuenta aperturas de la página.
- `quotation_shares` guarda canal, versión, teléfono, plantilla y estado (`preparado`, `confirmado`, `cancelado`, `revocado`, y para la futura API `enviado`, `entregado`, `leido`, `fallido`, `proveedor_id`). La API de WhatsApp Business **no** está configurada.
- Historial de actividad: preparado, confirmado y desactivado, sin teléfono, mensaje ni token.
- Los paneles de envío solo aparecen en borradores y cotizaciones enviadas.

Verificado en el preview con staging: preparar, enlace de WhatsApp correcto, página del cliente, PDF, enlace alterado rechazado, «Lo envié» desde el historial, enlace desactivado. No verificado: «Compartir PDF» en un teléfono real (Android/iPhone).

**Textos pendientes de aprobación del propietario:** el mensaje predeterminado de WhatsApp (`src/lib/quotation-share.ts`) y los textos de la página del cliente (`src/app/cotizacion/[token]/page.tsx`).

## Paso 5: finanzas (2026-10-23)
SQL `docs/sql/finance_ledger.sql` (ensayo 11 de 11; se aplica **después** de `quotation_integrity.sql`; **aplicado solo en staging**). Código en `admin-release` (`4bb2fb4`, `dbe7d8e`).

- Devoluciones (hasta lo recibido) y reversos (un pago registrado por error, antes de tener recibo, sin dejar el neto en negativo) son filas nuevas negativas en `payments` con `tipo` y `motivo`. Todas las sumas existentes (saldo del panel, facturas, recibos, resumen diario y «Recibido» de Mi viaje) las descuentan sin cambiar el código del cliente. Idempotentes por solicitud.
- Los pagos ya no se pueden editar ni borrar; las facturas y reservas ya no se pueden borrar (se anulan o cancelan). Recibos solo para pagos reales.
- «Cancelar reserva»: lista de revisión con datos reales (pagado neto, facturas pendientes, proveedor, boletos emitidos), motivo obligatorio, anulación opcional de facturas no pagadas; las pagadas y los pagos se conservan. El formulario general ya no ofrece «Cancelada».
- Aviso cuando una factura tiene un total distinto al de la reserva (por ejemplo, tras una enmienda). En producción marcará VT-7CC608B0 (548 frente a 578).
- «Comparar copias» (solo lectura): expediente cifrado frente a lo que ve el cliente, por identificador de pasajero, y si «Guardar expediente revisado» se aceptaría. Solo funciona donde está la clave del expediente (producción, o Preview con su clave de prueba).

Verificado en el preview con staging: aviso de factura desactualizada (578 frente a 600), devolución de 50 (pagado 250, saldo 350), reverso rechazado por dejar el neto en negativo, cancelación guiada con motivo y factura anulada. No verificado en pantalla: «Comparar copias» (las reservas de prueba no tienen expediente).

**Decisiones del propietario pendientes para las dos reservas reales:** VT-7CC608B0, ¿578 o 548? VT-CCB2E6FD, ¿pasar a «confirmada»?
