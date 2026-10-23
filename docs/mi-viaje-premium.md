# Mi viaje premium

22 de octubre de 2026. Local, sin commit, despliegue, correos ni SQL aplicado. Se apoya en `docs/mi-viaje-v3.md` (y v2).
Revisión visual: `output/owner-review-mi-viaje-premium/` (ver su `LEAME.md`).

## 1. Arquitectura del producto

Mi viaje deja de ser una página larga y pasa a ser **cinco páginas y una conversación**, con la misma sesión OTP:

| Página | Ruta cliente | Qué responde |
|---|---|---|
| Resumen | `/mi-reserva` | ¿A dónde, cuándo, está confirmado, boletos, quién viaja, PNR, qué hago ahora, debo algo, cómo contacto a viatour? |
| Itinerario | `/mi-reserva/itinerario` | Día por día: vuelos (tarjeta tipo aerolínea), hotel, auto, servicios, días libres, equipaje, PDF y calendario |
| Viajeros | `/mi-reserva/viajeros` | Nombres, categoría, estado y número de boleto por viajero, PNR, qué hacer si un nombre no coincide |
| Documentos | `/mi-reserva/documentos` | Documentos, envío de documentos al asesor, pagos, saldo y recibos |
| Destino | `/mi-reserva/destino` | Foto, datos útiles, requisitos, **Qué hacer**, auto de alquiler, **Mejore su viaje**, sus solicitudes, créditos de fotos |
| Mensajes | `/mi-reserva/mensajes` | Chat con su asesor, con adjuntos |

- **Teléfono:** barra inferior fija (Resumen, Itinerario, Documentos, Destino, Mensajes con contador), con `safe-area-inset-bottom`. Viajeros se abre desde la tarjeta de confirmación y desde Documentos (fila "Boletos electrónicos").
- **Escritorio:** pestañas bajo la cabecera con las seis; el Resumen tiene una columna de ayuda fija.
- Cada página es real (enlaces profundos, botón atrás, lectores de pantalla). Sin sesión, las cuatro secciones y el chat responden **307 a /mi-reserva** (la ruta `[seccion]` vive fuera del grupo `(portal)` para que el redirect no se convierta en un 200 con streaming).
- El mismo componente (`TripPortal`, prop `section`) sirve al cliente, a la vista previa del admin (`/admin/reservas/[id]/client-preview?seccion=`) y a las fixtures locales (`/qa/viaje/<caso>?modo=cliente&seccion=`).

Archivos principales: `src/components/trip/` (`trip-portal`, `trip-shell`, `trip-overview`, `trip-itinerary`, `trip-records`, `trip-destination-page`, `trip-chat`, `service-request`, `trip-feedback`, `trip-ui`, `customer-links`); `src/lib/` (`trip-model`, `trip-offers`, `trip-checklist`, `destination-guides`, `airline-links`, `photo-credits`, `chat-attachments`, `attachment-image`, `trip-requests`, `trip-request-store`, `trip-request-admin`).

## 2. Resumen (overview)

1. **Cabecera:** foto real a sangre en el teléfono, estado, cuenta regresiva (nunca duplica el estado), destino, fechas, duración, ruta, código de reserva copiable, composición del grupo ("2 adultos, 2 niños") y **una sola acción principal** según el momento: ver itinerario, coordinar el pago (si hay saldo), explorar el destino (en viaje), contarnos cómo le fue (completado), escribir al asesor (cancelado).
2. **Confirmación de su viaje** (sección 3).
3. **Estado + Próximos pasos** (sección 6).
4. **Lo próximo:** los siguientes 2–3 eventos con fecha (vuelo, entrada al hotel, retiro del auto).
5. **Complete su viaje:** hasta 3 servicios relevantes (sección 8).
6. **Ayuda** (columna en escritorio): texto según el momento, último mensaje, "Enviar mensaje", WhatsApp, teléfono y correo.
7. Después del viaje, el bloque de opinión va primero (sección 9).

## 3. Confirmación de la aerolínea

- PNR grande, "Copiar código", estado "N de M boletos emitidos" (verde completo, azul parcial), botón **específico de la aerolínea** y enlace a Viajeros y boletos.
- Sin PNR todavía: tarjeta neutra ("aparecerá aquí cuando…", o "estamos emitiendo…").
- Con todos los boletos emitidos y antes del viaje: nota de sincronización genérica (decisión del dueño, 23-oct-2026): la reserva con viatour ya está confirmada y emitida; algunas aerolíneas tardan más en mostrarla en su propio sistema; puede seguir consultándola con el botón de la aerolínea. **Sin plazos.** Con emisión parcial no se muestra.
- Logos: **no se usan logos de aerolíneas** (marcas de terceros sin archivo autorizado en el repositorio). Se muestra el código IATA en un círculo neutro. Se pueden agregar si el dueño aporta logos autorizados.

### Mapa de aerolíneas (`src/lib/airline-links.ts`, verificado el 22-oct-2026)

Cada URL se tomó del propio sitio de la aerolínea (navegación de su página de inicio, cargada en Edge y comprobada con el formulario de código + apellido o el título de la página). Nunca se pone el PNR ni el apellido en la URL.

| Aerolínea | Botón | URL |
|---|---|---|
| Avianca (AV) | Ver reserva en Avianca | avianca.com/es/mi-reserva/servicios/gestiona-tu-reserva |
| American (AA) | Ver reserva | aa.com/reservation/view/find-your-trip |
| JetBlue (B6) | Ver reserva | jetblue.com/manage-trips |
| Southwest (WN) | Ver reserva | southwest.com/air/manage-reservation/ |
| Frontier (F9) | Ver reserva | flyfrontier.com/travel/my-trips/manage-trip/ |
| Volaris (Y4) | Ver reserva | volaris.com/mytrips |
| Viva Aerobus (VB) | Ver reserva | vivaaerobus.com/es-mx/manage/find-booking |
| Air Europa (UX) | Ver reserva | aireuropa.com/es/es/mytrips |
| KLM (KL) | Ver reserva | klm.com/trip |
| Air France (AF) | Ver reserva | wwws.airfrance.us/trip |
| British Airways (BA) | Ver reserva | britishairways.com/travel/managebooking/public/es_pr |
| Copa Airlines (CM) | Ver reserva en Copa Airlines | mytrips.copaair.com ("My Trips" en la navegación de copaair.com; verificada en navegador visible el 23-oct-2026: "Mis Viajes", pide código y apellido) |
| United, Delta, Aeroméxico, Iberia, Air Canada, Lufthansa, Turkish | "Ir al sitio de …" (página de inicio oficial) | El sitio bloquea la verificación automática o la búsqueda está detrás de un script; no se inventa una ruta |
| Otra aerolínea | Sin botón; texto neutro | — |

Spirit Airlines se excluyó: su dominio no resolvió el 22-oct-2026. Todas las URLs de gestión se volvieron a cargar el 23-oct-2026.

## 4. Destino y "Qué hacer"

- Contenido editorial en `src/lib/destination-guides.ts` (es/en), **no generado en tiempo de ejecución**: nombre, foto aprobada, descripción breve, categorías, enlace oficial opcional, orden, marca "familia".
- Sin precios, horarios, disponibilidad, calificaciones ni garantías (lo comprueba un test). Aviso: "Horarios, precios y disponibilidad cambian; confírmelos en el sitio oficial…".
- Datos útiles por destino: aeropuerto, moneda, idioma, electricidad, propinas o transporte (solo hechos estables).
- Hechos revisados en sitios oficiales de turismo y de cada atracción el 22-oct-2026.
- Viajes con niños o infantes: las recomendaciones familiares aparecen primero, sin ocultar las demás.
- Teléfono: carrusel deslizable (una tarjeta y el borde de la siguiente); escritorio: grilla.
- Guías: Miami (7), Nueva York (4), Orlando (4), Houston (2), Cancún (4), Punta Cana (4), Cartagena (3), Panamá (5, con las fotos ya existentes de `public/experiencias`).
- Un destino sin guía muestra foto (si hay), introducción publicada, requisitos y servicios; nunca contenido inventado.
- **Copy nuevo para aprobar:** todo el texto de `destination-guides.ts`.

### Miami

Cabecera: rascacielos frente a la bahía (P. Hughes, CC BY-SA 4.0). Qué hacer: South Beach y Ocean Drive; La Pequeña Habana y la Calle Ocho; Museo y Jardines Vizcaya; Parque Nacional Everglades; Bayside Marketplace; Dolphin Mall; Brickell. Enlaces oficiales: miamiandbeaches.com, vizcaya.org, nps.gov/ever, baysidemarketplace.com (el sitio de Dolphin Mall no cargó; queda sin enlace).

### Cobertura de imágenes

Fuente única: Wikimedia Commons, solo licencias con uso comercial (CC BY, CC BY-SA, CC0, dominio público). Descarga y recorte con `node scripts/fetch-commons-photos.mjs data/trip-photos.json`; créditos en `data/trip-photo-credits.json` (38 fotos). Las licencias BY/BY-SA exigen atribución: se muestran en "Créditos de las fotos" (página Destino) y en la portada del PDF.

| Destino | Cabecera | Qué hacer | Fuente / licencia |
|---|---|---|---|
| Miami | nueva | 7 | Commons, CC BY / BY-SA |
| Nueva York | nueva | 4 | Commons, CC BY-SA |
| Orlando | nueva | 4 | Commons, CC BY / BY-SA / CC0 |
| Houston | nueva | 2 | Commons, CC BY / BY-SA |
| San Andrés, Costa Rica, Guatemala, Medellín, Bogotá, España | nueva | — | Commons, CC BY / BY-SA |
| Cancún, Punta Cana, Cartagena | existente del sitio | 4 / 4 / 3 nuevas | Cabecera: foto ya publicada; qué hacer: Commons |
| Panamá | existente | 5 | Fotos existentes del paquete (créditos en `data/panama-photo-credits.json`) |
| Europa, Argentina, Medio Oriente, Dubái, Cruceros, Río, Salinitas | existente | — | Foto ya publicada del sitio |
| Destinos no publicados del catálogo (Aruba, Perú, Italia, Japón, …) | sin foto | — | Cabecera de marca (sin foto ajena). Agregar = una línea en `data/trip-photos.json` |

Las fotos de cabecera se detectan solas por nombre (`public/destinos/<slug>.jpg`), así que también mejoran el PDF del itinerario. Los alt están en español; los de las recomendaciones, en ambos idiomas.

## 5. Auto de alquiler y servicios adicionales

- Nuevo tipo de servicio **"Auto de alquiler"** en el registro de cotizaciones V6 (`auto` en `packageServiceTypes`, ícono en el editor). Las cotizaciones antiguas con un "otro" que dice "renta de auto", "rent a car", etc. también se reconocen.
- Con auto: "Su auto de alquiler" (retiro, lugar, duración, rentadora, qué incluye y nota sobre requisitos de la rentadora). Sin auto: "¿Necesita un auto en {destino}?" con las fechas del viaje y "Cotizar auto".
- **Reglas de personalización** (`src/lib/trip-offers.ts`):
  - Cancelada: nada. Completada: solo próximo viaje.
  - Solo vuelo: hotel, traslado, auto, tours, seguro. Vuelo + hotel: traslado, auto, tours, seguro. Sin vuelo: vuelos, traslado, tours, seguro, auto.
  - Durante el viaje: tours, auto, traslado.
  - Maleta documentada cuando la tarifa no la incluye.
  - Nunca algo comprado ni algo ya solicitado y abierto.
  - Viaje familiar: recomendaciones familiares primero.
- **Flujo de solicitud:** botón → hoja inferior (teléfono) o modal → nota opcional → `POST /api/mi-reserva/servicios`.
  - El servidor toma reserva, destino, fechas y viajeros de la sesión; el navegador solo dice el servicio y la nota.
  - Guarda primero; después ofrece "Continuar en WhatsApp" (mensaje con servicio, destino y código) por toque del cliente.
  - Aviso interno a soporte@.
  - "Sus solicitudes" muestra el estado (Recibida, En cotización, Cotizada, Confirmada, Cerrada).

## 6. Próximos pasos según el momento (`src/lib/trip-checklist.ts`)

| Fase | Pasos (solo si aplican) |
|---|---|
| Más de 7 días | Nombres, pasaportes, itinerario, requisitos |
| 5–7 días | Documentos listos, requisitos, equipaje, itinerario |
| 2–4 días | Consultar la reserva con la aerolínea (solo con boletos y PNR), app de la aerolínea, documentos, equipaje |
| 1 día | Check-in en línea "cuando la aerolínea lo habilite" (solo con boletos emitidos), documentos, llegar con tiempo |
| Hoy | Vuelos de hoy, documentos, estamos pendientes |
| Durante | (último día) ¿Cómo va su viaje?, destino, tours, asistencia |

Un saldo pendiente siempre va primero. Después del viaje, la lista se reemplaza por el bloque de opinión.

## 7. Mensajes y adjuntos

- **Chat:**
  - Burbujas, separadores por día, divisor "Mensajes nuevos", insignia "Nuevo".
  - Estados de carga (esqueleto), vacío con sugerencias y error con reintento.
  - Envío optimista con "No enviado · Reintentar / Editar".
  - Compositor fijo con zona segura, desplazamiento al último mensaje que no queda bajo el compositor, botón de WhatsApp en la cabecera.
- **Adjuntos:** fotos JPG/PNG/WebP y PDF de hasta 4 MB (límite real de Vercel: 4,5 MB por solicitud).
  - En el navegador: las fotos se redibujan (máximo 2400 px, orientación corregida) y se les quitan los metadatos.
  - En el servidor (`chat-attachments.ts`, `attachment-image.ts`):
    - El tipo se decide por los bytes y debe coincidir con la etiqueta. Se rechazan SVG, HTML, ejecutables y archivos renombrados.
    - Se rechazan PDF con JavaScript, `/Launch`, archivos incrustados, rich media o XFA.
    - Las imágenes se re-codifican con sharp, lo que elimina EXIF/GPS y cualquier contenido oculto.
    - El nombre se sanea y solo es texto visible.
  - Almacenamiento: bucket privado existente `portal-docs`, ruta `{reserva}/mensajes/{uuid}.{ext}`, creada por el servidor.
  - Mensaje y adjunto se guardan en una sola transacción (`post_customer_message`). Si falla, el archivo subido se borra.
  - Lectura: `GET /api/mi-reserva/mensajes/adjuntos/[id]` busca por id **y** reserva de la sesión. Otra reserva da 404, igual que inexistente.
    - Los bytes se sirven desde el sitio, sin URL de almacenamiento.
    - Cabeceras: `nosniff`, CSP `sandbox`, `no-store`, `Referrer-Policy: no-referrer` y CORP same-origin.
  - Personal: `GET /api/admin/reservas/[id]/adjuntos/[attachment]` con la sesión del admin (RLS + políticas del bucket).
- **Disponibilidad:** sin `reservation_messages.sql` el chat sigue usando las solicitudes de soporte (sin botón de adjuntar). Sin `mi_viaje_premium.sql` no aparece el clip y el servidor no sube nada.
- **Microcopy de respuesta (decisión del dueño, 23-oct-2026):** "Envíenos un mensaje y uno de nuestros asesores le responderá por esta conversación." Sin plazos ni SLA; AGENTS.md no cambia. Un test vigila que no aparezcan plazos en el copy.

## 8. Opiniones, "Comparta su viaje y gane" y referidos

- **Último día del viaje:** pregunta ligera "¿Cómo va su viaje?" (primer paso de la lista y bloque en el Resumen).
- **Después:** formulario privado de 1 a 5 estrellas (ámbar, permitido para calificaciones) con comentario → `POST /api/mi-reserva/opinion`. Se abre solo desde el último día, una opinión por reserva y nunca se publica.
- La invitación a opinión **pública** (viatour `/opiniones/nueva?destino=` y Google) se muestra a **todos**, sin depender de la calificación. No se condiciona ningún premio a una opinión positiva.
- **UGC y referidos:**
  - Antes del viaje: una línea en Destino.
  - Durante: una nota discreta.
  - Después: tarjetas "Comparta su viaje y gane" (texto de `/gira`) y "Recomiende viatour" (solo con `siteConfig.referralProgram`).
  - No se inventan premios ni condiciones.

## 9. Personal / admin

- **Reserva** (`/admin/reservas/[id]`):
  - Nueva sección **"Solicitudes desde Mi viaje"** (`#solicitudes`): servicio, destino, fechas, viajeros, nota del cliente, cambio de estado y nota interna (acción con la sesión del admin y RLS), más la opinión privada con estrellas.
  - Insignia "N solicitudes nuevas" en la cabecera.
  - Los adjuntos aparecen en la conversación con su tamaño.
- **Inicio:**
  - Contadores "Solicitudes de Mi viaje" y "Mensajes sin leer" (muestran "—" hasta aplicar el SQL).
  - Panel con las solicitudes abiertas.
- **Sin el SQL:** las solicitudes y opiniones llegan como solicitudes de soporte ("Solicitud de servicio: Auto de alquiler", "Opinión del viaje (4 de 5)") en `/admin/tickets`, con correo a soporte@. El cliente las ve igual en "Sus solicitudes".
- Vista previa del cliente con secciones (`?seccion=`). Las acciones del cliente quedan inertes y no se pasa ningún endpoint de escritura.

## 10. Itinerario PDF

- **Portada:**
  - Foto real del destino con crédito de autor y licencia (obligatorio para CC BY/BY-SA).
  - Destino, fechas, ruta, preparado para, reserva, viajeros, duración y estado fechado.
  - Recuadro del PNR con **"Consulte su reserva en {aerolínea}: {URL verificada}"**.
- **Después:**
  - Viajeros y boletos, resumen de vuelos, equipaje, "Antes de viajar".
  - Detalle de vuelos y estadía/servicios (el auto aparece como "Auto de alquiler").
  - Bloque **"Asistencia antes y durante su viaje"**.
- El título "Estadía y servicios" ya no queda huérfano al pie de página.
- Sin promociones en el PDF.

## 11. Seguridad

- **Rutas nuevas** (`servicios`, `opinion`, `mensajes` con archivo, `adjuntos/[id]`):
  - La reserva sale solo de la cookie OTP firmada.
  - Los IDs del cuerpo se ignoran.
  - Origen distinto da 403, sin sesión da 401.
  - Límite de tasa por reserva e IP, tamaño máximo del cuerpo y validación compartida.
- **Pruebas "A no ve B"** (en `tests/mi-viaje-premium.test.mjs`): adjunto de B pedido por A da 404 sin leer el archivo; fila manipulada fuera de la carpeta no se sirve; subidas y RPC siempre con la reserva de la sesión; solicitudes y opiniones con la reserva de la sesión aunque el cuerpo diga otra.
- **Ya cubiertos por tests anteriores:** mensajes, documentos, recibos, itinerario y facturas.
- **SQL** (ensayado en PGlite con `scripts/test-mi-viaje-premium-sql.mjs`):
  - anon sin permisos; un usuario autenticado no admin no ve nada.
  - Solo el service role ejecuta `post_customer_message`.
  - Un adjunto no puede apuntar a un mensaje de otra reserva (FK compuesta) ni a una ruta fuera de `{reserva}/mensajes/`.
  - El admin solo cambia estado y nota, y queda registrado como `handled_by` propio.
  - Nada en cascada.
- **Enlaces externos:** `rel="noopener noreferrer"`, solo https verificados. WhatsApp abre por toque del cliente.
- **Vistas previas:**
  - Las imágenes del chat usan `<img>` de este mismo origen (no `next/image`), para no cachear archivos privados.
  - CSP del sitio sigue en modo report-only (sin cambios).

## 12. Dependencias de SQL y despliegue (nada aplicado)

1. Respaldo nuevo (proceso habitual de producción).
2. `docs/sql/reservation_messages.sql`: **ya está aplicado en producción** (comprobado en solo lectura el 23-oct-2026: tabla, columnas, restricciones, 3 índices y 3 políticas como en el archivo; 0 mensajes). Desviación encontrada: `authenticated` conserva DELETE, UPDATE de `body` e INSERT de `created_at` (privilegios por defecto de Supabase). RLS ya lo niega a quien no es admin; `mi_viaje_premium.sql` lo repara (paso 0).
3. `docs/sql/mi_viaje_premium.sql` (+ `mi_viaje_premium_checks.sql`, PRE y POST): tablas `reservation_message_attachments`, `trip_service_requests`, `trip_feedback` y función `post_customer_message`; permite mensajes de cliente solo con adjunto. Exige el paso 2. Rollback documentado en el archivo.
4. **Sin variables nuevas.** `PORTAL_MESSAGE_EMAILS` sigue apagada (aviso por correo al cliente cuando el asesor responde). `TRAVEL_EMAIL_ENABLED` sigue sin cambios.
5. Bucket `portal-docs`: ya existe y es privado; no requiere cambios.
6. Commit, revisión y despliegue: pendientes de aprobación.

## 13. QA

- `npm run lint`, `npm run typecheck`, `node --test "tests/*.test.mjs"`, `node scripts/test-mi-viaje-premium-sql.mjs`, `next build`.
- `TRIP_FIXTURES=1 next start -p 3021` y luego:
  - `node scripts/check-trip-portal.mjs <playwright package.json>`: 12 casos × 5 páginas, 320–1440 px, sin desbordes, un h1, sin errores, sin datos privados, redirecciones sin sesión.
  - `node scripts/build-owner-review-premium.mjs <playwright package.json>`: paquete del dueño.
- **Casos de fixture:** `miami-emitido`, `miami-pendiente`, `un-viajero`, `cancun-listo`, `grupo-multidestino` (9 viajeros), `orlando-familia` (auto, familia, saldo, sale en 3 días), `boletos-parciales`, `hotel-solo`, `en-viaje` (último día), `sin-guia`, `completado`, `cancelada`.

### Lista para iPhone físico

1. Abrir Mi viaje con un código real de prueba interno (no de cliente) y Safari en iPhone (13 o posterior, y SE).
2. Barra inferior: no la tapa el indicador de inicio; se toca bien con el pulgar; el contador de Mensajes se ve.
3. Cabecera: la foto se recorta bien en vertical y el texto se lee sobre ella.
4. Copiar PNR y código de reserva: aparece "Copiado".
5. "Ver reserva en …" abre el sitio de la aerolínea en una pestaña nueva.
6. Qué hacer: el carrusel se desliza con un dedo y se detiene en cada tarjeta.
7. Cotizar auto: la hoja sube desde abajo, el teclado no tapa "Enviar solicitud" y "Continuar en WhatsApp" abre la app.
8. Chat: al tocar el campo, el compositor queda sobre el teclado; enviar texto; adjuntar una foto de la cámara (HEIC) y un PDF; ver el progreso; abrir el adjunto.
9. Modo avión durante el envío: "No enviado · Reintentar".
10. Opinión (viaje completado): elegir estrellas y enviar con VoiceOver activo.
11. Girar a horizontal: sin desbordes.
12. Con texto grande (Ajustes > Accesibilidad): sin cortes.

## 14. Decisiones del dueño (23-oct-2026)

- **Aprobado:** dirección visual (congelada), copy y contenido de destinos, referencias factuales a marcas de terceros (sin logos ni afiliación implícita).
- **Respuesta:** frase sin plazos (sección 7). **Sincronización:** mensaje genérico sin plazos (sección 3). **Copa:** URL oficial verificada y habilitada.
- **Licencias:** las 38 fotos de Commons se volvieron a verificar contra Commons con `node scripts/verify-photo-licenses.mjs` (licencia comercial vigente; autor, licencia y fuente coinciden; archivo presente; toda foto de guía con crédito): 0 problemas.
- **Pendiente:** SQL en producción, despliegue y pruebas reales (ver el plan de lanzamiento en `docs/mi-viaje-release-plan.md`).
