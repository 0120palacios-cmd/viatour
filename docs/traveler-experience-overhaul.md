# Experiencia del viajero — rediseño (Mi viaje, itinerario, confirmación, recibo, correos, mensajes)

> **Actualización 21-10-2026 (pase de QA para revisión del propietario):** la sección 11 corrige y reemplaza lo que contradiga a las anteriores (estados, saldo, recibos, envíos, migraciones y conteo de pruebas).

21 de octubre de 2026. Rama `recovery-quotation-booking-invoice`. **Todo es LOCAL.** No hubo push, merge, despliegue, migración productiva, envío de correos, OTP ni escrituras en la base de datos. La producción solo se consultó con dos lecturas `BEGIN READ ONLY` de metadatos y estructura, sin nombres, correos, pasaportes ni contenido de documentos.

## 1. Diagnóstico de lo anterior

- **Portal:** una lista de paneles de base de datos (reserva, "Confirmación del proveedor: pendiente", ítems con cantidades, tabla de pagos, facturas con estados internos y solicitudes de soporte "que no son un chat"). No tenía destino visual ni línea de tiempo por día, y no explicaba qué sigue. Mezclaba estados de agencia, proveedor y emisión sin traducirlos.
- **Vista previa del administrador:** importaba la página del cliente y leía los datos con el *service role*. Mostraba acciones que no funcionaban sin la cookie del cliente.
- **Itinerario PDF:** fechas ISO crudas, sin cubierta, sin día a día y sin número de página.
- **Confirmación de reserva:** era el PDF de la cotización con otro título.
- **Recibo:** una lista simple.
- **Correo de itinerario:** cada dato en un párrafo `<p>`, sin botón, sin texto de vista previa y con fechas ISO.
- **Envío de prueba:** aceptaba cualquier dirección y precargaba un correo personal.
- **Página de reserva del administrador:** acentos corruptos ("cotizaciÃ³n").
- **Factura:** un PDF titulado "Factura" sin CAI ni RTN se mostraba al cliente (ver `docs/honduras-documentos-fiscales.md`).

## 2. Arquitectura

**Una sola proyección:** `src/lib/trip-view.ts` (`buildTripView`) convierte la reserva en la vista del viajero.

- Toma la versión aceptada, la proyección pública de viajeros (solo nombres y categoría), los pagos, los recibos y los metadatos de documentos.
- Calcula la etapa, los hitos, el próximo paso, la línea de tiempo por día con "días en su destino", los vuelos (conexiones, cambio de día, cambio de aeropuerto), hoteles, ferris, servicios, equipaje, la lista de documentos y el saldo.
- Es pura y está probada. La usan el portal, la vista previa del administrador, el itinerario PDF, la confirmación y el correo, así que no pueden contradecirse.
- Textos de interfaz en `messages/{es,en}.json` → `trip.*`. Los PDF y los correos leen el mismo español con `src/lib/trip-copy.ts`.

**Componentes compartidos:** `src/components/trip/trip-portal.tsx` (`TripPortal`, modos `customer` y `preview`), `flight-journey.tsx` y `messages-panel.tsx`.

- `/mi-reserva` y `/admin/reservas/[id]/client-preview` renderizan el mismo componente.
- En la vista previa, los documentos abren las rutas de administrador de la misma reserva.
- WhatsApp, enviar mensajes, subir documentos y salir quedan visibles pero inertes, con la nota "Desactivado en la vista previa".
- La vista previa lee con la sesión del administrador (RLS), no con el *service role*. No crea OTP, sesión ni cookie del cliente.

**Arquitectura de información de Mi viaje (móvil primero):**

1. Saludo y botón Salir.
2. Cabecera del destino: foto real si existe en `public/destinos/`; si no, un bloque tonal de marca. Muestra la cuenta regresiva, las fechas, viajeros, días, ciudad de salida y la referencia.
3. Estado en palabras del cliente, cuatro hitos y el **Próximo paso** con acciones que funcionan.
4. Navegación fija por secciones: Itinerario · Viajeros · Documentos · Mensajes · Pagos · Ayuda.
5. Itinerario:
   - "Antes de su viaje".
   - Día a día con vuelos tipo línea de tiempo (hora, aeropuerto, vuelo, conexión), hotel con mapa, traslados y tours.
   - "N días en su destino" para los tramos sin servicios.
   - Equipaje.
6. Viajeros: nombre y categoría. Localizador y número de boleto **solo** cuando están emitidos. Nunca documentos ni fecha de nacimiento.
7. Centro de documentos:
   - Itinerario y confirmación generados.
   - Boletos (pendiente / en emisión / disponibles).
   - Voucher de hotel pendiente.
   - Recibos y archivos de la agencia.
   - Documentos enviados por el cliente, con carga desplegable.
8. Mensajes sobre este viaje.
9. Pagos: "Pagado" o "Saldo pendiente", total, recibido y recibos. Sin estados de factura.
10. "Complete su viaje a {destino}": servicios no incluidos (traslados, tours, asistencia, hotel), sin precios, con consulta por WhatsApp.
11. Ayuda: asesor, WhatsApp, mensaje y teléfono; qué hacer si algo cambia durante el viaje; cambios y cancelaciones. No promete atención 24/7.

**Documentos con identidad propia:**

- **Itinerario** (`itinerary-pdf.tsx`):
  - Cubierta azul con destino, fechas, "Preparado para" y la referencia.
  - Resumen y próximo paso.
  - Viajeros.
  - Día a día con filas tipo boleto electrónico (salida, vuelo y llegada) y conexiones.
  - Hotel, servicios, equipaje e información importante.
  - Contacto, encabezado y pie con número de página.
  - Sin precios.
- **Confirmación de reserva** (`reservation-confirmation-pdf.tsx`):
  - Página blanca con un panel de estado: "Su viaje está reservado", "Su reserva está registrada" o "Prerreservación…". Una prerreservación nunca se muestra como confirmada.
  - Tabla de servicios reservados con su estado.
  - Resumen de pago y condiciones aceptadas, sin la cláusula de cotización "no constituye una reserva".
  - Leyenda "No es un comprobante fiscal".
  - Conserva los controles anteriores: exige la versión aceptada y que los totales coincidan.
- **Recibo** (`receipt-pdf.tsx`): comprobante formal con número en recuadro, monto en cifras y en letras (`amount-words.ts`), datos del pago, saldo después del pago y la leyenda fiscal.
- **Cotización:** sin cambios (`quotation-pdf.tsx`, documento comercial aprobado en V5/V6).

**Correos** (`email-layout.ts`, `travel-email.ts`):

- HTML con tablas y estilos en línea, columna de 600 px fluida en el teléfono y texto de vista previa oculto.
- Botón compatible con Outlook y `color-scheme: light only`.
- Versión de texto, todo escapado.
- El botón lleva a `https://www.miviatour.com/mi-reserva?ref=CÓDIGO`. El código solo **prellena** el primer campo: el acceso sigue exigiendo apellido y OTP. No hay enlaces adivinables ni datos sensibles en la URL.
- Los adjuntos se llaman `itinerario-VT-….pdf/.ics` y `recibo-REC-….pdf`.

**Mensajes por reserva:**

- Tabla `reservation_messages` en `docs/sql/reservation_messages.sql`, aditiva y **no aplicada**.
- API del cliente `/api/mi-reserva/mensajes`:
  - La reserva sale siempre de la cookie OTP y nunca del cuerpo.
  - Controla el origen y limita a 20 mensajes por hora por reserva y 40 por IP.
  - Valida el texto y marca como leídas las respuestas mostradas.
- Panel del administrador en `/admin/reservas/[id]#mensajes`: conversación, contador de no leídos, "Marcar como leídos" y respuesta con la sesión del administrador. La política RLS exige `admin_id = auth.uid()`.
- Mientras la tabla no exista, el portal muestra WhatsApp y las solicitudes de soporte existentes, y el administrador ve la instrucción de migración.
- Sin adjuntos en los mensajes: los documentos van por el centro de documentos, con su validación de tipo y tamaño.

## 3. Política de notificaciones

| Evento | Aviso | Estado |
| --- | --- | --- |
| Mensaje nuevo del cliente | Correo interno a soporte@ con enlace al panel | Activo (no va al cliente) |
| Respuesta de la agencia | Correo breve al cliente, sin el texto del mensaje | **Desactivado** (`PORTAL_MESSAGE_EMAILS`) |
| Itinerario disponible / actualizado | Correo de itinerario con PDF e ICS, enviado por el administrador uno a uno con confirmación | **Bloqueado** (`TRAVEL_EMAIL_ENABLED`) hasta su autorización |
| Pago registrado | Correo de recibo con PDF, uno a uno | **Bloqueado** (`TRAVEL_EMAIL_ENABLED`) |
| Documento nuevo, boleto emitido, cambio de viaje | Sin correo automático. Se ve en Mi viaje; el asesor avisa por WhatsApp o mensaje | Intencional, para evitar spam |

## 4. Requisitos de viaje

El portal no presenta requisitos migratorios como hechos. Enlaza al verificador existente `/requisitos`, que muestra proveedor, fecha y descargo, y repite "confirme siempre con la autoridad oficial". Agregar requisitos por destino dentro del portal queda en P3, con fuente y fecha.

## 5. Seguridad (revisión del alcance tocado)

- **IDOR:** todas las rutas del cliente toman la reserva de la cookie firmada (HMAC, nonce, 30 min) y nunca de la petición. Las pruebas cubren mensajes con un `reservation_id` falso en el cuerpo, recibos (`id` y `reservation_id`) e itinerario.
- **Documentos:** se valida que la ruta pertenezca a la carpeta de la reserva y la URL se firma por 60 segundos al hacer clic. La nueva ruta del administrador repite el control con su sesión (prueba con traversal y con otra reserva).
- **Vista previa:** `requireAdmin` y sesión del administrador. No toca OTP, cookies ni correos. Se eliminó el uso del *service role* en el administrador.
- **PII:**
  - La proyección pública no incluye documento, fecha de nacimiento, contactos ni notas (probado).
  - Las notas internas, el costo y la comisión no se seleccionan (`tripFields`).
  - El correo de vista previa del administrador se muestra en un `iframe sandbox`.
- **Enumeración:** el prellenado `?ref=` acepta solo el patrón del código y no revela si la reserva existe. El aviso de OTP sigue siendo genérico.
- **Envío de prueba:** lista blanca `TRAVEL_TEST_RECIPIENTS`. Se rechazan otras direcciones y el correo del cliente; sin lista queda deshabilitado (probado).
- **Rutas QA:** `/qa/viaje/*` solo responde con `next dev` o con `TRIP_FIXTURES=1` en local. En producción devuelve 404 y solo contiene datos ficticios.
- **Sin cambios:** OTP (6 dígitos, 10 min, 5 intentos, límite por IP y por código), carga de documentos (firma de bytes, 4 MB, 20 por día) y cifrado AES-256-GCM del expediente.
- **Riesgo residual:**
  - La sesión expira a los 30 min sin renovación (P2).
  - `/api/mi-reserva/facturas/[id]/pdf` sigue accesible para su propia reserva, aunque el portal ya no lo enlaza.
  - La CSP sigue en modo *report-only*.

## 6. Pruebas y QA (locales)

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck`, `npm run lint`, `npm run build` | Aprobados (0 errores, 0 advertencias) |
| `node --test "tests/*.test.mjs"` | **345/345** (línea base 327; +18 en `tests/traveler-experience.test.mjs`; 2 pruebas existentes actualizadas por cambio de dependencias, no de comportamiento) |
| `scripts/check-trip-portal.mjs` | 56 cargas: 4 casos × cliente/vista previa × 320, 360, 375, 390, 430, 768 y 1440 px. 0 desbordamiento horizontal, 0 objetivos táctiles < 40 px, un H1, sin errores de página, sin claves sin traducir ni datos privados. Capturas en `output/trip-portal/` |
| `scripts/inspect-trip-documents.mjs` | 12 PDF Letter (itinerario, confirmación y recibo × 4 casos) rasterizados página por página y revisados visualmente. Correos HTML y texto revisados a 375 y 720 px. Sin "INTERNAL", pasaporte ni montos en el itinerario. Salida en `output/trip-documents/` |
| Correos en clientes reales (Gmail, iPhone Mail, Outlook) | **No probado**: requiere el envío de prueba autorizado (sección 8) |
| Recorrido autenticado real (OTP, cookie, A/B) | **Bloqueado**: no hay staging; no se generaron OTP reales |
| Panel de administrador con sesión | **No probado en navegador**: sin credenciales; typecheck y build cubren la compilación |

Limitaciones del entorno:

- La extensión de Chrome no estaba conectada; se usó Playwright con Edge.
- El servidor `next dev` del usuario en el puerto 3011 llevaba días activo y fallaba al resolver `@sentry/core`. No se detuvo; se usó `next build` + `next start` en el puerto 3021.

## 7. Plan de despliegue (requiere su autorización en cada paso)

1. Revisar este diff y las capturas/PDF en `output/`. Aprobar el copy de `docs/copy-pending.md`.
2. Confirmar con su contador la sección 5 de `docs/honduras-documentos-fiscales.md`.
3. Confirmar en Vercel, para el entorno donde corre Mi viaje, que `PORTAL_SECRET` y `TRAVEL_DATA_KEY` están configurados. No se pudo verificar: la API de Vercel negó el acceso al equipo.
4. Backup recuperable de la base de datos y luego `npx supabase db query --linked --file docs/sql/reservation_messages.sql`. Es aditiva e idempotente; el *rollback* está en el encabezado del archivo. Opcional: el portal funciona sin ella.
5. Desplegar la rama en un *preview* de Vercel. Abrir `/admin/reservas/<id>/client-preview` y `/admin/reservas/<id>/correo` de las dos reservas reales y revisar.
6. Configurar `TRAVEL_TEST_RECIPIENTS` con su correo interno y enviar la prueba interna. Revisar en Gmail, iPhone Mail y Outlook.
7. Merge a `main` y despliegue a producción solo con su autorización.
8. Activar `TRAVEL_EMAIL_ENABLED` y enviar al cliente solo después de completar la lista de la sección 8.

## 8. Lista de control antes de cualquier comunicación real

- [ ] Cliente correcto (nombre y correo) en la reserva
- [ ] Reserva correcta (código VT-…) y versión aceptada correcta
- [ ] Nombres de pasajeros idénticos al documento de viaje
- [ ] Fechas, vuelos, horarios, conexiones y equipaje verificados contra la confirmación de la aerolínea
- [ ] Destino correcto
- [ ] Total, pagado y saldo del portal coinciden con la contabilidad
- [ ] Recibos generados para los pagos ya registrados (las dos reservas reales tienen un pago cada una y 0 recibos)
- [ ] Sin datos de pasaporte, notas internas ni costos internos en el portal, los PDF o los correos
- [ ] Itinerario PDF revisado
- [ ] Vista previa del correo revisada (`/admin/reservas/<id>/correo`) y prueba interna recibida
- [ ] Portal revisado como cliente (`/admin/reservas/<id>/client-preview`)
- [ ] Enlaces y documentos abren
- [ ] Revisado en el teléfono
- [ ] Copy aprobado (`docs/copy-pending.md`)
- [ ] Aprobación expresa del propietario
- [ ] Destinatario verificado en el formulario de envío

## 9. Backlog comercial y de viaje (después de este cambio)

**P0 — bloquea el uso del cliente**

- Verificar `PORTAL_SECRET` y `TRAVEL_DATA_KEY` en el entorno donde corre Mi viaje: sin ellos falla el acceso OTP o el expediente.
- Desplegar esta rama: `main` (que Vercel despliega a producción) no incluye estas mejoras ni los commits de recuperación de esta rama. No se pudo confirmar qué versión sirve hoy Mi viaje (sin acceso a Vercel).

**P1 — operación importante**

- Generar los recibos de los pagos ya registrados de las dos reservas reales (acción del administrador, sin código).
- Aplicar `reservation_messages.sql` (opcional; el portal usa el respaldo).
- Definir el flujo fiscal CAI con el contador.
- Probar el correo en clientes reales con la lista blanca.
- **Corregidos en este cambio:**
  - Acentos corruptos en la página de reserva del administrador.
  - Envío de prueba sin restricción de destinatario.
  - Vista previa con *service role* y acciones rotas.
  - Pie de página que no se imprimía en los PDF.
  - Scripts QA de PDF rotos.

**P2 — pulido y flujo**

- Renovación deslizante de la sesión del portal.
- Contador de mensajes no leídos en la lista de reservas y en el inicio del administrador.
- Tipo de documento al compartir (boleto, voucher de hotel, traslado) para que el centro de documentos los agrupe.
- Versión HTML del correo de OTP.
- Fotos de hoteles en el portal (ya se firman si existen en la cotización) y una foto de Miami u otros destinos frecuentes con licencia.
- Estado del proveedor por servicio en lugar de uno global.

**P3 — futuro**

- Requisitos de entrada por destino dentro del portal, con fuente y fecha.
- Opinión posviaje integrada.
- Agregar a Apple/Google Wallet.
- Adjuntos en mensajes.
- Varias reservas por cliente en una sola cuenta.
- Grupos y viajes corporativos con varios titulares.

## 10. Archivos

**Nuevos:**

- `src/lib/trip-view.ts`, `trip-format.ts`, `trip-data.ts`, `trip-copy.ts`, `trip-fixtures.ts`, `pdf-kit.ts`, `amount-words.ts`, `email-layout.ts`, `reservation-messages.ts`, `test-recipients.ts`, `reservation-confirmation-pdf.tsx`
- `src/components/trip/{trip-portal,flight-journey,messages-panel}.tsx`, `src/components/admin/reservation-messages.tsx`
- `src/app/api/mi-reserva/mensajes/route.ts`, `src/app/api/admin/reservas/[id]/documentos/route.ts`
- `src/app/admin/reservas/[id]/correo/page.tsx`, `src/app/admin/reservas/message-actions.ts`
- `src/app/qa/viaje/[caso]/page.tsx` y `[documento]/route.ts`
- `docs/sql/reservation_messages.sql`, `docs/honduras-documentos-fiscales.md`, este documento
- `scripts/check-trip-portal.mjs`, `scripts/inspect-trip-documents.mjs`
- `tests/trip-support.mjs`, `tests/traveler-experience.test.mjs`

**Modificados:**

- `src/app/mi-reserva/page.tsx`, `src/app/admin/reservas/[id]/page.tsx` (corrección de codificación incluida), `src/app/admin/reservas/[id]/client-preview/page.tsx`
- `src/app/admin/reservas/send-itinerary.ts`, `send-itinerary-test.ts`, `send-receipt.ts`
- `src/lib/itinerary-pdf.tsx`, `receipt-pdf.tsx`, `reservation-pdf.ts`, `travel-email.ts`, `travel-download.ts`
- `src/components/portal/access-form.tsx`, `src/components/admin/send-itinerary-test.tsx`
- Rutas PDF del cliente y del administrador (opción `inline` y nombres de archivo con el código)
- `messages/es.json`, `messages/en.json`, `.env.example`, `docs/copy-pending.md`
- `tests/commercial-security.test.mjs`, `tests/travel-operations.test.mjs`, `scripts/render-commercial-samples.mjs`

**Eliminados (reemplazados por `inspect-trip-documents.mjs`):** `scripts/render-travel-samples.mjs` y `scripts/inspect-travel-pdfs.mjs`.

**Migraciones:** solo `docs/sql/reservation_messages.sql`, **no aplicada**.

## 11. Pase de QA para revisión del propietario (21-10-2026)

Sin correos, OTP, escrituras en la base de datos, SQL aplicado, despliegues ni merge. Producción solo se leyó con consultas `BEGIN READ ONLY`.

### 11.1 Defectos encontrados y corregidos en este pase

1. **Saldo falso en una reserva real.**
   - VT-7CC608B0 tiene un total aceptado de 578, un pago de 548 y una factura de la aplicación pagada por 548. El rediseño mostraba "Saldo pendiente US$30" en el portal y en la confirmación.
   - Se restauró la regla del portal recuperado: si hay una factura *pagada* en la moneda de la reserva, su total es el total para el cliente.
   - La vista previa del administrador muestra una nota interna con la diferencia.
2. **Estados que exageraban:**
   - "Reserva confirmada" aparecía con el proveedor en "parcial" o con solo el estado de la agencia.
   - Una prerreservación aparecía como "Reserva registrada".
   - Las fechas llevaban a "en curso" o "completado" viajes nunca confirmados.
   - Corregido en `tripStage()` (ver 11.3), con pruebas.
3. **Nombre del documento de reserva.** Se llamaba "Confirmación" sin confirmación del proveedor. Ahora, hasta que el proveedor confirma, es "Resumen de reserva", con la frase "Este documento no confirma la emisión de boletos".
4. **Viaje cancelado:**
   - Mostraba la cuenta regresiva, el total como saldo pendiente y el itinerario "En preparación".
   - Ahora muestra un mensaje neutral sobre pagos o reembolsos, sin cuenta regresiva y sin documentos generados.
5. **Los clientes reales no pueden entrar a Mi viaje.**
   - Las dos reservas tienen `cliente_apellido` vacío, y el *guard* de producción `reservation_commercial_guard` impide completarlo.
   - Preparado, sin aplicar:
     - `docs/sql/portal_access_surname.sql`: permite registrar el apellido una sola vez y restaura los acentos del *guard*. Probado con `scripts/test-portal-access-surname.mjs` (7 comprobaciones).
     - Formulario de un solo uso "Apellido de acceso a Mi viaje" en `/admin/reservas/[id]`.
     - Los envíos de itinerario y de recibo se **niegan** mientras falte el apellido (con prueba).
6. **Acentos corruptos en 5 funciones de producción.**
   - Las funciones son `accept_quotation`, `convert_accepted_quotation`, `quotations_lock_accepted`, `reservation_commercial_guard` y `save_reservation_record`. Sus mensajes de error se ven como "estÃ¡n".
   - Los archivos del repositorio están bien; el defecto vino de la forma en que se aplicaron.
   - `reservation_commercial_guard` se corrige con el SQL del punto 5.
   - Las otras 4 solo afectan textos de error del administrador (P2): reaplicarlas desde `commercial_recovery.sql` con UTF-8 en un mantenimiento aprobado.
7. **Correo:**
   - En el modo oscuro de Gmail el logo negro desaparecía. Ahora es el logo blanco sobre la banda azul.
   - En Outlook el botón no tenía área de clic (el padding estaba en `<a>`). Se movió a la celda.
   - Doble punto en el texto plano ("p. m..").
   - Faltaba el renglón explícito "Estado de la reserva".
8. **PDF:**
   - La paginación (`render`) no se imprimía en react-pdf 4.9 porque `lineHeight` estaba en `Page`.
   - Quedaban encabezados de día huérfanos al pie. Ahora un día que cabe en una página se mueve completo.
9. **Código muerto eliminado:**
   - `src/components/travel-summary.tsx` (portal anterior).
   - `getPortalReservation` y `getPortalDocuments`.
   - `portal-summary.nextStep`, duplicado del nuevo `nextStepFor`.
   - Scripts de *fixture* del portal anterior. Su comprobación de 401 sin sesión pasó a `check-trip-portal.mjs`.
10. **Copy:**
    - Lista "Antes de su viaje" en imperativo de usted.
    - "Clase tarifaria"; "Conexión nocturna: continúa al día siguiente"; "Código de reserva de la aerolínea"; "Boletos en proceso de emisión"; "Plan de alimentación".
    - "Viaje completado" unificado.
11. **Migración de mensajes endurecida:**
    - `on delete restrict`: la conversación nunca se borra en cascada.
    - `insert` por columnas: el administrador no puede fechar mensajes hacia atrás.
    - Probada con 16 comprobaciones (`scripts/test-reservation-messages-sql.mjs`).

### 11.2 Reservas reales: resumen saneado (lectura del 21-10-2026)

Ver también `output/owner-review/real-reservations/sanitized-summary.md`.

| | VT-7CC608B0 | VT-CCB2E6FD |
| --- | --- | --- |
| Estado de agencia / proveedor / emisión | pendiente / pendiente / pendiente | pendiente / pendiente / pendiente |
| Viajeros (públicos) | 1 adulto | 2 adultos |
| Fechas, destino | 18–23 nov 2026, Miami | 18–24 nov 2026, Miami |
| Ruta | XPL–SAL–MGA–MIA y regreso (3 tramos por sentido; boletos separados; equipaje documentado no incluido) | Igual |
| Total aceptado / factura app / pagado | 578 / 548 *pagada* / 548 USD | 1,076 / 1,076 *pagada* / 1,076 USD |
| Lo que verá el cliente | **Pagado** (total 548). La vista previa muestra una nota interna con la diferencia | **Pagado** (total 1,076) |
| Recibos / envíos de itinerario / OTP pendientes | 0 / 0 / 0 | 0 / 0 / 0 |
| Expediente revisado, revisión | sí, 2 | sí, 3 |
| Apellido de acceso | **vacío: el cliente no puede entrar** | **vacío: el cliente no puede entrar** |
| Mi viaje mostraría | "Reserva registrada"; hitos: registrada (hecho), confirmación de proveedores (en curso); "Resumen de reserva"; boletos "Pendiente" | Igual |

### 11.3 Estados para el cliente (regla en `src/lib/trip-view.ts`)

| Dato real | El cliente ve |
| --- | --- |
| `estado = cancelada` | Reserva cancelada |
| `prerreserva` | Prerreservación registrada |
| Proveedor `pendiente` o `parcial` (aunque la agencia marque otro estado) | Reserva registrada: "Recibimos su reserva y estamos confirmando cada servicio…" |
| Proveedor `confirmada` o `emitida`, sin emisión aérea | Reserva confirmada |
| Vuelos con emisión `en_emision` | Boletos en proceso de emisión |
| Vuelos `emitida` **y** proveedor confirmado. Sin vuelos: proveedor confirmado y documentos de la agencia | Todo listo para su viaje |
| Confirmado y fechas en curso o vencidas, o estado `en_curso` / `completada` | Su viaje está en curso / Viaje completado |

El documento se llama "Confirmación de reserva" solo con el proveedor confirmado; si no, "Resumen de reserva". El correo usa la misma frase de estado.

### 11.4 Vista previa del administrador (verificado)

- `/admin/reservas/[id]/client-preview` y `/admin/reservas/[id]/correo` exigen sesión de administrador.
- Sin sesión redirigen a `/admin/login`, sin emitir ninguna cookie del portal (prueba de navegador).
- No crean OTP, no envían correo y no escriben en la base: solo leen, con `loadTrip`, `readThread` y `getAdminReservation`.
- Las acciones del cliente aparecen desactivadas: WhatsApp, enviar mensaje, subir documento y salir.
- Los documentos abren las rutas de administrador de la misma reserva.

URL (requieren su sesión):

- VT-7CC608B0
  - Vista como cliente: `https://www.miviatour.com/admin/reservas/cd98204f-d604-455e-929e-3c6ca0441bef/client-preview`
  - Vista previa de correos: `https://www.miviatour.com/admin/reservas/cd98204f-d604-455e-929e-3c6ca0441bef/correo`
- VT-CCB2E6FD
  - Vista como cliente: `https://www.miviatour.com/admin/reservas/fb492418-4a10-4c18-9228-2615d014dc77/client-preview`
  - Vista previa de correos: `https://www.miviatour.com/admin/reservas/fb492418-4a10-4c18-9228-2615d014dc77/correo`

Estas URL solo funcionan donde esté desplegada esta rama; hoy solo existe en local. En un *preview* de Vercel, use el mismo camino con el dominio del *preview*.

### 11.5 Compatibilidad del correo (revisión de código): RUNTIME TEST REQUIRED

| Aspecto | Implementación | Gmail (móvil y escritorio) | iPhone Mail | Outlook (escritorio y web) |
| --- | --- | --- | --- | --- |
| Estructura | Tablas; 600 px con `width`; fluida con `@media` | Soportado | Soportado | Ancho fijo de 600 (respeta `width`) |
| CSS | En línea. `@media` y `border-radius` como mejora progresiva | Algunos clientes de terceros ignoran `<style>`: queda una columna de 600 px | Correcto | Sin esquinas redondeadas (cosmético) |
| Botón | Celda con color y padding (`mso-padding-alt`) | Correcto | Correcto | La celda va coloreada; el enlace es el texto |
| Modo oscuro | `color-scheme: light only`; logo blanco sobre azul | Puede invertir los fondos claros; el azul y el logo resisten | Respeta *light only* | Outlook.com puede invertir; sigue legible |
| Imágenes bloqueadas | Texto alternativo "viatour" en blanco sobre azul | Correcto | Correcto | Correcto |
| Fuente | Manrope no se carga; se usa Segoe UI, Helvetica o Arial | Correcto | Correcto | Correcto |
| Texto plano | Incluido (`text`) | — | — | — |

Adjuntos:

- Itinerario: `itinerario-VT-….pdf`, más `itinerario-VT-….ics` cuando hay vuelos. Los eventos del ICS van en estado TENTATIVE o CANCELLED, con un UID estable por tramo.
- Recibo: `recibo-REC-….pdf`.

**No se probó en bandejas reales.** Requiere un envío de prueba a `TRAVEL_TEST_RECIPIENTS`.

### 11.6 Seguridad de los envíos (revisado; sin envíos)

**Prueba interna:**

- Solo va a direcciones de `TRAVEL_TEST_RECIPIENTS`, normalizadas (minúsculas, sin espacios, formato válido).
- Se rechaza, antes de generar nada, cualquier dirección fuera de la lista o igual a la del cliente.
- No crea registro en `travel_deliveries`.
- El asunto lleva `[PRUEBA INTERNA]` y el cuerpo un aviso visible.
- Es independiente de `TRAVEL_EMAIL_ENABLED`, a propósito: permite probar antes de habilitar.
- Pruebas en `traveler-experience.test.mjs`.

**Envío real** (`send-itinerary.ts`):

- Exige `TRAVEL_EMAIL_ENABLED=true` y `RESEND_API_KEY`.
- El destinatario debe ser exactamente el correo del cliente de la reserva.
- El expediente debe estar revisado y con pasajeros, y la reserva debe tener **apellido de acceso** (nuevo).
- Genera el PDF y el ICS **antes** de reservar el envío.
- Reserva el intento en `travel_deliveries`, único por reserva y revisión: la misma revisión no sale dos veces. Además usa `Idempotency-Key` por intento.
- Un resultado incierto **no** se reintenta.
- Solo adjunta el itinerario y el ICS: nunca recibos, facturas ni datos privados.
- El recibo va por su propio flujo, con un registro por recibo.

### 11.7 Notificaciones de mensajes

| Evento | Qué pasa |
| --- | --- |
| El cliente escribe | Un correo interno a soporte@ por mensaje (`Idempotency-Key` por mensaje; límite de 20 por hora por reserva). Contador "N sin leer" en la reserva del administrador |
| El administrador responde | Se publica en Mi viaje. Correo al cliente **solo** si `PORTAL_MESSAGE_EMAILS=true` (desactivado): uno por respuesta y sin el texto |
| El cliente abre Mi viaje | Las respuestas mostradas se marcan como leídas. Sin correo |
| WhatsApp | Solo con un clic explícito del cliente o del asesor |

Usted la llamó `TRAVEL_MESSAGE_EMAILS`; en el código, la variable es `PORTAL_MESSAGE_EMAILS`.

### 11.8 Migración de mensajes: revisión (NO aplicada)

**Antes de migrar:** bloque 1 de `docs/sql/reservation_messages_checks.sql`, de solo lectura. Debe confirmar que existen `is_admin()`, `reservations` y el rol `service_role`, y que la tabla aún no existe.

**Migración:** `docs/sql/reservation_messages.sql`. Es transaccional e idempotente; se aplica después de un respaldo.

**Después de migrar:** bloque 2. Resultado esperado:
- RLS activado y 3 políticas.
- `anon` sin `select`.
- `authenticated`: sin `insert` sobre `created_at`, sin `update` sobre `body`, solo `update` sobre `agency_read_at` y sin `delete`.
- FK con `restrict` y 3 índices.

**Seguridad:**
- El cliente nunca toca la tabla: la API usa la reserva de la cookie OTP.
- El administrador accede por RLS, con `admin_id = auth.uid()`.
- Probado el aislamiento entre reservas.
- Texto y autor inmutables; sin borrado.
- Mensajes de 1 a 2000 caracteres; temas de una lista cerrada; sin adjuntos.
- `created_at` lo pone el servidor.

**Reversión:**
- Antes de que existan conversaciones que conservar: `drop table public.reservation_messages`. La aplicación vuelve al respaldo (solicitudes de soporte y WhatsApp).
- Si ya hay conversaciones, la tabla se conserva.

**Veredicto:** apta para aplicar con su aprobación y un respaldo. No es necesaria para la revisión visual.

### 11.9 Recibos de los pagos reales (preparado, NO ejecutado)

- Hoy no existe ningún recibo para estas reservas, ni directo ni indirecto (`payment_receipts`: 0).
- **Generar un recibo es irreversible:**
  - Inserta una instantánea inmutable.
  - Consume un número de la secuencia `REC-…`.
  - Bloquea la edición y el borrado del pago (`guard_receipted_payment`).
- La instantánea guarda el saldo como **total de la reserva − pagos**. En VT-7CC608B0 quedaría grabado "Saldo US$30.00", que contradice la factura pagada por 548. **No generarlo** hasta que usted decida cuál es el total correcto. VT-CCB2E6FD quedaría con saldo 0.
- Los pagos son del 20-10-2026, en USD como la reserva, con referencia y método "otro".
- Acción preparada, solo con su aprobación: botón de recibo del pago en `/admin/reservas/<id>#pagos`. Requiere su sesión; nadie lo ejecutó.

### 11.10 Variables de entorno a verificar (sin valores)

| Variable | Requerida | Ámbito | Propósito | Antes del *preview* | Antes de producción | Antes de enviar al cliente |
| --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Pública | Cliente Supabase | Del proyecto correcto | Igual | Igual |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Solo servidor | Portal, OTP, mensajes | Presente | Presente | Presente |
| `PORTAL_SECRET` | Sí | Solo servidor | Firma de cookies y OTP | Presente, ≥ 32 caracteres aleatorios | **El mismo** que hoy (cambiarlo cierra sesiones) | Presente |
| `TRAVEL_DATA_KEY` | Sí | Solo servidor | Cifrado del expediente | **La misma** clave con que se cifraron los expedientes reales (64 hex); sin ella no se leen los datos privados | Igual, con respaldo seguro | Igual |
| `RESEND_API_KEY` | Sí, para correos | Solo servidor | OTP, avisos y envíos | Si existe, el *preview* puede enviar OTP reales | Presente | Presente; remitente verificado |
| `TRAVEL_EMAIL_ENABLED` | No | Solo servidor | Habilita los envíos al cliente | **Ausente o distinto de `true`** | Ausente o distinto de `true` | `true` solo durante el envío autorizado |
| `TRAVEL_TEST_RECIPIENTS` | No | Solo servidor | Lista blanca de pruebas | Solo correos internos aprobados | Igual | Igual |
| `PORTAL_MESSAGE_EMAILS` | No | Solo servidor | Aviso al cliente por respuesta | Ausente | Ausente | Solo si usted lo autoriza |
| `NEXT_PUBLIC_SITE_URL` | Sí | Pública | URL canónica | URL del *preview* o de producción | `https://www.miviatour.com` | Igual |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Sí | Servidor / pública | Formularios públicos | Presentes | Presentes | — |
| `TRIP_FIXTURES` | No | Solo servidor | Rutas de QA locales | **Ausente** | **Ausente** | Ausente |

### 11.11 OWNER REVIEW READINESS

**READY FOR OWNER REVIEW**

- **Portal Mi viaje** con datos de ejemplo: 4 escenarios × 9 anchos, vista del cliente y vista previa (`output/owner-review/portal/`).
- **PDF** (`output/owner-review/pdfs/`):
  - Cotización (vuelo y paquete).
  - Resumen y confirmación de reserva.
  - Itinerario (conexiones, paquete, grupo de 9).
  - Recibo.
- **Correos** de itinerario, recibo y cancelación, en móvil y escritorio, con texto plano (`output/owner-review/emails/`).
- **Las 2 reservas reales**, renderizadas **enmascaradas** con el código actual: itinerario, resumen y correo (`output/owner-review/real-reservations/`).

**NEEDS OWNER REVIEW**

- Copy nuevo (`docs/copy-pending.md`), sobre todo `help.duringBody` y la sección de servicios adicionales.
- Diferencia de US$30 en VT-7CC608B0: total aceptado 578 frente a la factura pagada de 548.
- El apellido de acceso que se registrará para cada cliente.

**BLOCKED**

- Acceso de los clientes reales a Mi viaje: falta el apellido de acceso y aplicar `portal_access_surname.sql`.
- Vista previa autenticada en navegador de las reservas reales: requiere su sesión y un despliegue de esta rama.
- Acceso a Vercel para verificar las variables.

**RUNTIME TEST REQUIRED**

- Correo en Gmail, iPhone Mail y Outlook (prueba interna con `TRAVEL_TEST_RECIPIENTS`).
- Importación del ICS.
- Recorrido OTP completo en un *preview*.
- Mensajes con la tabla aplicada.

**ACCOUNTANT CONFIRMATION REQUIRED**

- CAI, papel de intermediaria, ISV y momento de emisión de la factura (`docs/honduras-documentos-fiscales.md`).
- Total correcto de VT-7CC608B0 antes de emitir su recibo.

**GO / NO-GO**

| Decisión | Veredicto |
| --- | --- |
| Revisión visual del propietario | **GO** |
| Despliegue a *preview* de Vercel | **GO condicionado**: con su autorización y `TRAVEL_EMAIL_ENABLED` apagado. Tenga en cuenta que el *preview* usa la base de producción, así que un OTP pedido desde el *preview* enviaría un correo real |
| Producción | **NO-GO** hasta la revisión, el *preview* aprobado, la decisión fiscal, la de los US$30 y el SQL del apellido aplicado |
| Envío real del itinerario | **NO-GO** hasta todo lo anterior, más la prueba interna en bandejas reales y la lista de control de la sección 8 |

### 11.12 Pruebas de este pase

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck`, `npm run lint`, `npm run build` | Aprobados |
| `node --test "tests/*.test.mjs"` | **351/351** (línea base 327; +24 nuevas) |
| `scripts/test-portal-access-surname.mjs` (PGlite) | 7/7 |
| `scripts/test-reservation-messages-sql.mjs` (PGlite) | 16/16 |
| `scripts/check-trip-portal.mjs` | 80 comprobaciones (detalle abajo) |
| `scripts/inspect-trip-documents.mjs` | 12 PDF Letter, sin fugas ("INTERNAL", pasaporte, fecha de nacimiento), sin montos en el itinerario, con paginación |
| Inspección visual | Segunda revisión de capturas (430 y 1024 px; cancelada a 390), de todas las páginas de los PDF reales enmascarados y del correo real enmascarado en móvil |

Detalle de `check-trip-portal.mjs`:
- 6 rutas del cliente sin sesión responden 401.
- 2 vistas previas del administrador redirigen al inicio de sesión, sin cookie.
- 72 cargas: 4 casos × cliente y vista previa × 9 anchos (320, 360, 375, 390, 414, 430, 768, 1024 y 1440 px). Sin desbordamiento, con objetivos táctiles de al menos 40 px y un solo H1.
