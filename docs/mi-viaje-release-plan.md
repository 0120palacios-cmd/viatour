# Mi viaje premium: plan de lanzamiento a producción

23 de octubre de 2026. Nada de este plan se ha ejecutado en producción. Cada paso que escribe en producción requiere la autorización explícita del dueño.

Estados: **DONE** hecho · **LOCAL-TESTED** probado localmente · **OWNER-APPROVED** aprobado por el dueño · **NEEDS-PRODUCTION** requiere producción · **NEEDS-REAL-PROVIDER** requiere Resend/Supabase reales · **NEEDS-PHYSICAL-DEVICE** requiere iPhone físico · **BLOCKED** bloqueado.

## 1. Estado de la base de datos (consulta de solo lectura, 23-oct-2026)

Se ejecutó `docs/sql/mi_viaje_release_preflight.sql` (transacción `read only`, solo metadatos y conteos) y el bloque POST de `reservation_messages_checks.sql`.

| Elemento | Producción | Estado |
|---|---|---|
| `reservations`, `is_admin()`, `hit_rate_limit`, `support_tickets`, rol `service_role`, `gen_random_uuid` | Existen | DONE |
| `reservation_messages` (paso 1) | **Ya aplicada**: 9 columnas, 6 restricciones, 3 índices y 3 políticas, como en el archivo. RLS activo. 0 mensajes | DONE |
| Permisos de `reservation_messages` | **Desviación**: `authenticated` conserva DELETE, UPDATE de `body` e INSERT de `created_at` (privilegios por defecto de Supabase). RLS lo niega a quien no es admin y no hay política DELETE; un admin podría editar o fechar mensajes. Se repara en el paso 0 de `mi_viaje_premium.sql` | NEEDS-PRODUCTION |
| `reservation_message_attachments`, `trip_service_requests`, `trip_feedback`, `post_customer_message` (paso 2) | No existen | NEEDS-PRODUCTION |
| Bucket `portal-docs` | Privado, 8 MB, PDF/JPEG/PNG/WebP; políticas admin select/insert/delete | DONE (sin cambios) |
| Archivos de chat en storage | 0 | — |
| Reservas | 2 (ambas de clientes reales) | — |
| Solicitudes de soporte abiertas o de servicio/opinión | 0 | — |

**Orden comprobado en el SQL:** `mi_viaje_premium.sql` aborta si `reservation_messages` no existe; la FK compuesta y la restricción del cuerpo dependen de esa tabla. Como el paso 1 ya está aplicado, **solo falta el paso 2**.

## 2. Escrituras exactas en producción (paso 2, una transacción)

`npx supabase db query --linked --file docs/sql/mi_viaje_premium.sql`:

1. `reservation_messages`:
   - revocar todo a `authenticated`; volver a dar SELECT, INSERT de 5 columnas y UPDATE de `agency_read_at`;
   - reemplazar la restricción del cuerpo por `reservation_messages_body_text_check` (el cliente puede enviar solo un adjunto; la agencia siempre necesita texto);
   - agregar `unique (id, reservation_id)`.
2. Crear `reservation_message_attachments` (RLS, política de lectura admin, 2 índices, FK compuesta, verificación de ruta) y `trip_service_requests` (RLS, lectura y actualización admin, 2 índices).
3. Crear `trip_feedback` (RLS, lectura admin, único por reserva).
4. Crear la función `post_customer_message` (security invoker), con execute solo para `service_role`.
5. Dar permisos a `service_role`.

No toca datos existentes (0 mensajes), ni storage, ni otras tablas. Ensayado sin red: `node scripts/test-mi-viaje-premium-sql.mjs` (PGlite, con los privilegios por defecto de Supabase y la desviación encontrada en producción) — **LOCAL-TESTED**.

## 3. Respaldo

**NEEDS-PRODUCTION (dueño).** Respaldo nuevo antes del paso 2, según el proceso habitual (el plan no tiene PITR). Lo toma el dueño (pg_dump con su contraseña o desde el panel). Basta con el esquema `public`; las tablas afectadas están vacías o son nuevas.

## 4. Verificación después de la migración

`docs/sql/mi_viaje_premium_checks.sql`, bloque POST (solo lectura). Valores esperados:

- los tres `*_rls` en true;
- `anon_*` en false;
- `auth_insert_*` y `auth_update_service` en false; `auth_update_status` en true;
- `auth_exec_post` en false y `service_exec_post` en true;
- `body_check` presente;
- `rm_auth_delete`, `rm_auth_update_body` y `rm_auth_insert_created_at` en false;
- conteos en 0.

Luego, volver a ejecutar el bloque POST de `reservation_messages_checks.sql`; ahora debe dar `auth_delete`, `auth_insert_created_at` y `auth_update_body` en false.

## 5. Reservas de prueba seguras (DONE, 23-oct-2026, con autorización del dueño)

En producción solo hay 2 reservas de clientes reales; **no se usan para pruebas**. El 23-oct-2026 se insertaron, en una sola transacción y solo en `public.reservations`, dos reservas QA (sin cliente en `customers`, partidas, pagos, recibos, facturas, expediente de viaje, boletos, PNR, documentos ni mensajes):

| Campo | Reserva A (viaje próximo) | Reserva B (viaje completado) |
|---|---|---|
| Código | `VT-PRUEBA01` | `VT-PRUEBA02` |
| id | `16814c51-a087-40e7-958d-c14e0bca7edb` | `911d3d01-40cb-414a-baf8-cc3a12348845` |
| Cliente / apellido | "Prueba Interna QA" / `PRUEBA` | Igual |
| `cliente_email` | Buzón interno del dueño (el destinatario de prueba aprobado) | Igual |
| Destino y fechas | Miami, 27-nov al 2-dic-2026 | Orlando, 13 al 18-oct-2026 |
| Estado | confirmada | completada |
| Proveedor | `confirmada`, referencia `PRUEBA-QA-NO-REAL` | Igual |
| Total | 0 USD (sin saldo) | 0 USD |
| Snapshot aceptado | Vuelos ficticios "PRUEBA 1/2" SAP–MIA–SAP, `qa: true` | Vuelos "PRUEBA 3/4" + "Hotel de prueba QA (no es una reserva real)" |
| `notas` (solo admin) | "REGISTRO DE PRUEBA QA… No emitir, no facturar, no cobrar…" | Igual |

`reservations` no tiene triggers de INSERT y la base no tiene extensiones HTTP ni webhooks. El cron diario solo los lista en el resumen interno a soporte@. B nunca recibe la invitación automática a opinar, porque esta se dispara exactamente 2 días después del regreso (el 20-oct, ya pasado). A recibiría el recordatorio de "viaje en 7 días" el 20-nov solo si se activa `CUSTOMER_REMINDERS=1`, que hoy está apagado, y el correo iría al buzón interno. No se deben enviar correos de itinerario ni de recibo (`TRAVEL_EMAIL_ENABLED` sigue en false). El correo OTP sí se envía, al buzón interno.

**Retiro al terminar:** A se puede pasar a `cancelada`. B no se puede cancelar, porque `completada` es un estado final según el guard. Para borrarlas del todo hace falta un SQL revisado en este orden:

1. Borrar los mensajes y adjuntos QA (las FK son `restrict`).
2. Borrar las solicitudes y la opinión QA.
3. Borrar los objetos de Storage `<id>/mensajes/`.
4. `delete from public.reservations where codigo in ('VT-PRUEBA01','VT-PRUEBA02')`. Los OTP y tickets caen en cascada.

## 6. Pruebas reales de punta a punta (con las reservas de prueba)

### A. Acceso al portal — NEEDS-PRODUCTION, NEEDS-REAL-PROVIDER

1. `/mi-reserva`: código A + apellido. Debe responder "Si los datos coinciden…" y llegar un correo (Resend acepta el envío; en Resend queda el mensaje con id).
2. El correo trae solo el código de 6 dígitos (sin código de reserva ni apellido).
3. **Código incorrecto:** mensaje genérico. **Cinco intentos:** se bloquea. **Código vencido** (esperar más de 10 minutos): falla. **Código ya usado** (reutilizarlo tras salir): falla.
4. **Código correcto:** se abre Mi viaje A. Cookie `viatour-portal` HttpOnly, Secure, path `/`.
5. Repetir el paso 1 en `/en/mi-reserva`: el código también se acepta (corrección del path de la cookie pendiente) y, tras verificarlo, el portal se queda en `/en/mi-reserva`; "Sign out" también vuelve a `/en/mi-reserva`.
6. "Salir": la cookie desaparece y las páginas de sección responden 307 a `/mi-reserva`.

### B. Mensajes — NEEDS-PRODUCTION

1. **Cliente A:** "Mensajes", escribir "Prueba 1". Debe aparecer al instante, llegar el aviso a soporte@ y verse en `/admin/reservas/<A>#mensajes` con "Nuevo".
2. **Admin** responde "Respuesta de prueba". El cliente recarga: la respuesta tiene la insignia "Nuevo" y el contador de la barra inferior baja al abrir el chat.
3. "Marcar como leídos" en el admin: el contador "Mensajes sin leer" del Inicio baja.
4. **Inmutabilidad** (después del paso 2): desde la consola SQL como admin no se puede editar `body` ni borrar.

### C. Adjuntos — NEEDS-PRODUCTION (y luego NEEDS-PHYSICAL-DEVICE)

1. **Cliente A** envía:
   - una foto JPG con datos GPS (de un teléfono);
   - un PNG o WebP;
   - un PDF simple.
   Cada uno debe mostrar progreso, aparecer en el chat y abrirse desde el chat.
2. **Storage (consulta de solo lectura):** los nombres empiezan por `<id A>/mensajes/<uuid>.<ext>`.
3. **Metadatos:** descargar la foto desde el admin y comprobar con `exiftool` que no tiene GPS ni marca de cámara.
4. **Rechazos:** un SVG, un `.html` renombrado a `.jpg`, un PDF de más de 4 MB y un PDF con JavaScript son rechazados y no dejan archivo en storage.
5. **Aislamiento:** con la sesión de B abierta, pedir `/api/mi-reserva/mensajes/adjuntos/<id de un adjunto de A>`. Debe responder 404. Sin sesión, 401.
6. **Admin:** el adjunto se abre desde la conversación de la reserva A.

### D. Solicitud de servicio — NEEDS-PRODUCTION

1. **Cliente A:** Destino, "Cotizar auto", escribir una nota y enviar.
   - Debe mostrar "Recibimos su solicitud" y "Continuar en WhatsApp" (solo abre WhatsApp si se toca).
   - Debe llegar el aviso a soporte@.
2. **Admin** (`/admin/reservas/<A>#solicitudes`): servicio "Auto de alquiler" con destino, fechas y viajeros correctos. El Inicio muestra "Solicitudes de Mi viaje".
3. **Admin** cambia el estado a "En cotización": el cliente ve "En cotización" y ya no se le ofrece el auto.
4. **Envío repetido:** al pedir un servicio ya abierto, no vuelve a aparecer. Más de 10 en una hora: límite.

### E. Opinión — NEEDS-PRODUCTION

1. **Cliente B** (completado): enviar 2 de 5 con comentario. Debe confirmar el envío.
2. La invitación pública (viatour y Google) sigue visible e igual, sea cual sea la calificación.
3. **Admin** (`/admin/reservas/<B>#solicitudes`): ve 2 de 5 con el comentario.
4. **Cliente A** (viaje no terminado): `POST /api/mi-reserva/opinion` responde 409.

### F. A no ve B — LOCAL-TESTED; repetir en producción con A y B

Con la sesión de A:

- `/api/mi-reserva/recibos/<recibo de B>`: 404.
- `/api/mi-reserva/documentos?ruta=<B>/…`: 404.
- `/api/mi-reserva/facturas/<factura de B>/pdf`: 404.
- Adjunto de B: 404.
- Las páginas y el itinerario solo muestran A (la reserva sale únicamente de la cookie).

## 7. iPhone físico — NEEDS-PHYSICAL-DEVICE

No se ha probado en un dispositivo físico. Verificar en Safari (iPhone moderno y SE):

- teclado y compositor del chat;
- zona segura e indicador de inicio;
- barra inferior;
- desplazamiento;
- adjuntar foto (HEIC de la cámara) y PDF;
- vista previa de imagen;
- copiar PNR;
- botón de la aerolínea;
- descargar el itinerario PDF;
- Documentos;
- carrusel de Destino;
- solicitud de servicio;
- VoiceOver en la opinión.

Lista detallada: `docs/mi-viaje-premium.md` §13.

## 8. Despliegue

1. **Dueño:** aprobar el commit local y hacer push de la rama `recovery-quotation-booking-invoice`. Revisar la vista previa de Vercel (sin `TRIP_FIXTURES`: las rutas `/qa/*` deben responder 404).
2. **Sin variables nuevas.** Confirmar en Vercel que **`TRIP_FIXTURES` no existe** en Production ni en Preview y que `TRAVEL_EMAIL_ENABLED` y `PORTAL_MESSAGE_EMAILS` siguen en false.
3. **Orden recomendado:** primero el paso 2 de SQL (las tablas nuevas no afectan al código actual de producción), luego merge a main, luego el despliegue automático de Vercel.
   - El código nuevo también funciona sin el paso 2: usa las solicitudes de soporte y oculta los adjuntos.
4. **Humo después del despliegue:**
   - `/mi-reserva` carga;
   - `/mi-reserva/itinerario` sin sesión responde 307;
   - `/qa/viaje/miami-emitido` responde 404;
   - las APIs sin sesión responden 401;
   - con la reserva de prueba A: las secciones, el chat, la solicitud de auto y el PDF del itinerario.

## 9. Reversión

- **Código:** "Instant Rollback" en Vercel a la implementación anterior. Mientras no se haga merge, main no cambia.
- **SQL** (solo si no hay datos que conservar; comprobar antes con los conteos POST): bloque de rollback al inicio de `mi_viaje_premium.sql`.
  - Borra la función y las 3 tablas nuevas y restaura la restricción del cuerpo (falla si existe un mensaje solo con adjunto: entonces dejar la restricción nueva).
  - La reparación de permisos **no** se revierte: es una corrección.
- **Los adjuntos subidos** quedan en `portal-docs/<reserva>/mensajes/`. Si se revierte, el admin puede borrarlos (política `portal_docs_admin_delete`).

## 10. Clasificación general

| Ítem | Estado |
|---|---|
| Dirección visual, copy de destinos, marcas de terceros, frase de respuesta, mensaje de sincronización | OWNER-APPROVED |
| URL de Copa verificada y habilitada | DONE |
| 38 fotos: licencia, autor, fuente y créditos verificados contra Commons; archivos de créditos incluidos en git | DONE |
| Lint, typecheck, pruebas unitarias, ensayos SQL, build, barrido del portal, flujos de interacción | LOCAL-TESTED |
| Aislamiento A/B (mensajes, adjuntos, solicitudes, opinión, documentos, recibos, facturas) | LOCAL-TESTED |
| Rutas `/qa/*` en 404 sin `TRIP_FIXTURES` | LOCAL-TESTED (confirmar la variable en Vercel) |
| Corrección del path de la cookie OTP pendiente (portal en inglés) | LOCAL-TESTED |
| Redirección en inglés tras verificar el código y al salir (`/en/mi-reserva`, commit 0097c3f) | LOCAL-TESTED |
| Paso 1 `reservation_messages.sql` | DONE (ya estaba en producción) |
| Reparación de permisos y paso 2 `mi_viaje_premium.sql` | NEEDS-PRODUCTION |
| Respaldo previo | NEEDS-PRODUCTION (dueño) |
| Reservas de prueba A y B (`VT-PRUEBA01`, `VT-PRUEBA02`) | DONE (creadas el 23-oct-2026) |
| OTP real con Resend | NEEDS-REAL-PROVIDER |
| Chat, adjuntos, solicitudes y opinión reales | NEEDS-PRODUCTION |
| iPhone físico | NEEDS-PHYSICAL-DEVICE |
| Push, merge y despliegue | NEEDS-PRODUCTION (autorización del dueño) |

**Corregido (0097c3f):** tras verificar el código o al salir, el portal en inglés se queda en `/en/mi-reserva`.
