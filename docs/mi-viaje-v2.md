# Mi viaje v2: portal del viajero e itinerario PDF

21 de octubre de 2026. Rama `recovery-quotation-booking-invoice`. **Todo es local**: sin commit, sin despliegue, sin correos, sin escrituras ni lecturas en Supabase de producción. Reemplaza lo descrito en `docs/traveler-experience-overhaul.md` para el portal y el itinerario; la confirmación de reserva, el recibo y los correos no cambiaron.

## Qué cambió

- **Cabecera del viaje** (`trip-portal.tsx` → `Hero`):
  - Contenido: destino, fechas, estado corto, cuenta regresiva, ruta de ida (SAP → MIA), reserva con botón Copiar, viajeros y duración.
  - Acciones: "Itinerario en PDF" y "Documentos".
  - Imagen: la foto real de `public/destinos/` cuando existe; si no, el bloque azul de marca con la ruta.
- **Estado y próximo paso**:
  - Un titular en palabras del cliente ("Sus boletos ya fueron emitidos").
  - Una frase con qué sigue.
  - El saldo en su propia línea: ya no reemplaza el estado.
  - Barra de 4 tramos; en móvil, "Paso N de 4".
  - "Antes de salir" solo en los días cercanos al viaje.
  - Pasos nuevos según la fecha: `checkin` (a 2 días o menos) y `travelDay` (el día del viaje).
- **Secciones**, en este orden: Vuelos · Estadía · Viajeros · Documentos · Pagos · Mensajes · Ayuda (lateral fijo en escritorio).
  - Se quitaron "Antes de su viaje" permanente, el día a día de vuelos con días vacíos y "Complete su viaje". Este último quedó como un desplegable dentro de Ayuda.
- **Vuelos** (`flight-journey.tsx`):
  - Una línea vertical por trayecto. El origen y el destino final van más destacados.
  - Conexión con su espera y aviso de cambio de aeropuerto o conexión nocturna.
  - La salida desde la conexión no repite el nombre del aeropuerto.
  - Equipaje en tres columnas.
- **Viajeros y boletos**:
  - El código de reserva de la aerolínea (PNR) aparece una vez, grande y copiable, cuando es compartido. Si hay varios, se muestra uno por viajero.
  - Cada viajero muestra su estado de boleto y su número, copiable.
  - Regla nueva (`trip-view.ts`): un viajero solo se ve "emitido" si el expediente está emitido **y** tiene su propio número de boleto.
  - Nunca se muestran documentos ni datos personales.
- **Documentos**: lista simple. Los recibos se resumen en una fila que lleva a Pagos, para no duplicarlos. El envío de documentos queda en un desplegable.
- **Pagos**:
  - Pagado: "Pagado en su totalidad".
  - Con saldo: el saldo, una barra de lo pagado y "Coordinar el pago".
  - Recibos con monto y fecha.
- **Mensajes**: conversación con el mensaje propio en azul. El tema pasó a un selector opcional.
- **Estados**:
  - `mi-reserva/loading.tsx`: esqueleto con la forma de la cabecera.
  - `mi-reserva/error.tsx`: qué pasó, "Intentar de nuevo" y WhatsApp.
  - Sesión sin reserva: aviso dentro del acceso.
  - Error de código de verificación: ahora explica que se use el código más reciente o "Ingresar otros datos". Sigue siendo genérico, no revela si expiró.
- **Itinerario PDF** (`itinerary-pdf.tsx`), reescrito:
  - **Página 1**: cabecera azul con la ruta, estado fechado ("Estado al…"), código de reserva de la aerolínea, tabla de viajeros y boletos, y resumen de vuelos en una línea por trayecto.
  - **Páginas siguientes**: detalle de vuelos con la misma línea vertical del portal, estadía y servicios en agenda con fecha, equipaje en tabla, "Antes de viajar" y contacto.
  - Sin precios.
  - El vuelo Miami ida y vuelta pasó de 4 a 3 páginas.

## Copy nuevo pendiente de su aprobación

Todo en `messages/es.json` → `trip.*` (inglés con las mismas claves):

- `headline.*`, `next.*`, `prepare.*`, `travelers.pnrHelp`, `documents.trouble`, `help.add*` y `states.*`.
- En el PDF: "Estado al {fecha}", "Antes de viajar" y "Su asesor de viaje viatour".

No se inventaron datos, plazos ni respuestas rápidas.

## Pruebas

- `npm run lint`, `npm run typecheck` y `npm run build`: aprobados.
- Pruebas unitarias: `node --test "tests/*.test.mjs"` da 355/355, con 4 pruebas nuevas en `traveler-experience.test.mjs`.
- `scripts/check-trip-portal.mjs`: 126 cargas. Son 7 casos × cliente/vista previa × 320–1440 px, más 8 controles de seguridad, en total 134. Resultado: 0 desbordamiento, 0 objetivos táctiles < 40 px y sin errores.
- `scripts/inspect-trip-documents.mjs`: 21 PDF y correos sin fugas.

Casos nuevos en `trip-fixtures.ts`: `miami-emitido` (forma de las reservas reales), `un-viajero` (datos en revisión, sin pagos) y `completado`.

**No probado**:

- El recorrido real con OTP y cookie.
- La foto de hotel firmada: ningún caso de prueba tiene una.
- iPhone físico.
- Lectores de pantalla reales: solo hay semántica revisada en código.
- Clientes de correo.

## Cierre (21-10-2026, tarde)

- **Ajustes visuales finales:**
  - Sin pagos, ya no se muestra "US$ 0.00 de … pagado" con barra vacía.
  - Una reserva cancelada no pide documentos ni muestra "Si algo cambia durante su viaje".
  - Se quitó la línea repetida "Llega el …" bajo cada trayecto.
- **Botón flotante de WhatsApp:** se oculta mientras se muestra el portal (`globals.css`, `body:has([data-trip-portal])`).
  - Al volver a subir, quedaba encima de los botones "Copiar" del PNR y de los boletos.
  - El portal ya tiene sus propias acciones de WhatsApp, con el código de reserva.
  - En el resto del sitio y en la pantalla de acceso sigue igual.
- **OTP:**
  - El flujo completo está probado con un doble de base de datos en memoria (`tests/portal-otp-lifecycle.test.mjs`): solicitud, código guardado solo como hash, correo capturado, verificación, sesión, código consumido y repetición rechazada, código vencido, falla del proveedor y salida.
  - Una cookie de sesión falsificada lleva a la pantalla de acceso.
  - **Sin probar:** la entrega real del correo (Resend) y el ciclo en una base real. El único Supabase configurado es el de producción.
- **Revisión del propietario:** `output/owner-review-mi-viaje-v2/`.

## Antes de desplegar (requiere su autorización)

Revise las capturas en `output/trip-portal/` y los PDF en `output/trip-documents/`, apruebe el copy y luego autorice el commit y el despliegue. `TRAVEL_EMAIL_ENABLED` sigue sin cambios.
