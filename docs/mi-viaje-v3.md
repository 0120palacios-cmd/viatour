# Mi viaje v3: portal, mensajes e itinerario

21 de octubre de 2026. Local, sin commit, despliegue, correos ni SQL. Se apoya en `docs/mi-viaje-v2.md`.

## Qué cambió

- **Accesos rápidos** bajo la cabecera: itinerario PDF, mensajes (con contador de nuevos), documentos y WhatsApp. En el teléfono, una barra fija inferior (`sticky-trip-bar.tsx`) repite tres de ellos cuando la fila sale de la pantalla.
- **Cabecera:** sin foto, el código del destino se ve en grande y tenue detrás de la ruta. Con foto, la imagen se oscurece un poco más arriba para que el texto se lea mejor.
- **"Confirmación de su viaje"**:
  - Código de reserva de la aerolínea, grande y copiable, y "N de M boletos emitidos".
  - "Con este código y su apellido puede consultar su reserva en el sitio web de {aerolínea}".
  - Solo aparece con datos que lo prueben: el PNR registrado y los boletos con número.
- **"Su destino"**:
  - Solo con la introducción y el texto que el sitio ya publica para ese destino (tabla `destinations`), más enlaces a requisitos de entrada y a la página del destino.
  - Si no hay contenido publicado, la sección no aparece. No se inventan atracciones ni consejos.
- **Mensajes** en una pantalla propia, `/mi-reserva/mensajes` (`trip-chat.tsx`):
  - Burbujas, separadores por día, hora, estado vacío con sugerencias, carga, error con reintento y WhatsApp.
  - Requiere la misma sesión OTP: sin sesión responde 307 a `/mi-reserva`. La API sigue tomando la reserva solo de la cookie.
  - **Funciona hoy sin SQL**: si `reservation_messages` no existe, lee y escribe en `support_tickets` (las solicitudes de soporte que ya existen en producción). Cada solicitud se muestra como un mensaje del cliente seguido de la respuesta de la agencia.
  - Cuando se aplique `docs/sql/reservation_messages.sql`, cambia sola a la tabla nueva.
  - En el portal queda una vista previa con el último mensaje.
- **"Más de viatour"**:
  - Tarjetas de los programas reales de `/gira`: "Comparta su viaje y gane" y "Recomiende viatour" (este último solo si `referralProgram` está activo).
  - "Ideas para su próximo viaje": destinos destacados con foto propia, nunca el destino actual.
  - Sin precios ni ofertas inventadas. No se muestra en reservas canceladas.
- **Itinerario PDF**:
  - Portada propia: foto real del destino (`public/destinos`) o la ruta en tipografía sobre azul de marca; destino, fechas, preparado para, reserva, viajeros, duración, código de la aerolínea y estado fechado.
  - Página 2: viajeros y boletos, resumen de vuelos, equipaje y "Antes de viajar".
  - Después: detalle de vuelos, estadía y servicios, y contacto.
  - La foto se pasa como bytes: en Windows, react-pdf ignoraba la ruta del archivo.
- **Otros:**
  - El botón flotante de WhatsApp del sitio también se oculta en la pantalla de mensajes.
  - La pantalla de carga de `/mi-reserva` pasó a un grupo de rutas `(portal)`, para que la redirección del chat sin sesión sea un 307 real.
  - Se eliminaron `messages-panel.tsx` y `ticket-panel.tsx`, reemplazados por el chat.

## Copy nuevo para aprobar

`messages/es.json` → `trip.quick.*`, `trip.confirmation.*`, `trip.destination.*`, `trip.chat.*`, `trip.more.*`, `trip.messages.open|write|reassurance` (inglés con las mismas claves).

- El texto de los programas resume lo publicado en `/gira`.
- No se promete un tiempo de respuesta: "Su asesor de viatour lee cada mensaje sobre esta reserva" y "Su asesor le responderá en esta conversación".

## Pendiente de aprobación

- SQL opcional `docs/sql/reservation_messages.sql`, con respaldo previo y aplicación por CLI según el proceso habitual. Sin él, el chat usa las solicitudes de soporte.
- Copy anterior: `docs/mi-viaje-v2.md`.
- Commit y despliegue.
