# Copy de la implementación de OPPORTUNITY-AUDIT (2026-09-29)

**Estado: aprobado por el propietario el 2026-09-29.** La sección de referidos en `/gira` quedó activada. Los recordatorios al cliente se activan con `CUSTOMER_REMINDERS=1` en Vercel. Los dos puntos de "Pendiente de decisión del propietario" (al final) no tenían texto que aprobar y siguen abiertos.

Todo el texto siguiente se agregó durante la implementación. Está activo en el sitio salvo donde se indica lo contrario. Nada se inventó sobre credenciales, reseñas, cifras ni tiempos de respuesta. Apruebe, corrija o retire cada punto antes de lanzar. Las versiones en inglés están en `messages/en.json` con las mismas claves.

## Formularios de cotización (`messages/es.json` → `quote.*`)
- `contactLegend` "Sus datos de contacto"; `phone` "Número de WhatsApp"; `email` "Correo electrónico (opcional)".
- `phoneHint` "Si no logra enviarnos el mensaje, un asesor lo contactará a este número."
- `phoneError`, `emailError`, `verifying` "Verificando conexión segura…", `saving` "Guardando su solicitud…".
- Panel de confirmación: `savedTitle` "Recibimos su solicitud", `savedReference`, `savedBody`, `savedFallback` "Si no le es posible escribirnos ahora, un asesor lo contactará al número que nos indicó.", `continueWhatsapp`, `newRequest`, `openForm`, `closeForm`.
- Bloque "Cómo funciona su cotización": `howTitle`, `how1` (sin costo ni compromiso), `how2` (precio final confirmado antes de reservar), `how3` (pago coordinado con el asesor por tarjeta o transferencia; no se realiza en el sitio; coincide con `legal-content.ts`).

## Mensajes prellenados de WhatsApp
- Línea final `Referencia: VT-XXXXX` en cada cotización (`src/lib/quote.ts`).
- Botones directos (encabezado, flotante, pie): se agrega "Estoy viendo: {título de la página}" (`src/lib/navigation.ts`).
- Saludo del asesor al cliente desde la bandeja de leads: "Hola {nombre}, le saluda su asesor de viatour. Recibimos su solicitud {referencia} y con gusto le ayudamos a planificar su viaje." (`src/lib/lead-admin.ts`).

## Páginas
- Ciudades (`cityPage.*`): "Paquetes para viajar desde {ciudad}", "Planifiquemos su viaje desde {ciudad}", texto de apoyo y enlace a requisitos.
- Requisitos (`requirements.planTitle`, `planBody`, `planCta`) tras cada resultado.
- Compartir (`common.sharePage`, `common.shareText` "Mire esta opción de viaje de viatour: {título}").
- `/gira` (en `src/app/gira/page.tsx`): la mecánica ahora pide publicar el video en TikTok, Instagram o Facebook etiquetando a @miviatour y enviar el enlace por WhatsApp; los términos agregan "su publicación debe ser pública". **Confirme que @miviatour es el usuario correcto en las tres redes** (hoy Instagram es `viatour.inc`).
- Sección "Recomiende viatour" en `/gira`: **desactivada** (`siteConfig.referralProgram = false`). Es un compromiso comercial nuevo (código de ruleta cuando el referido reserve). Actívela solo si aprueba la política.

## Correcciones de copy existente
- Pie: "Encuéntranos" → "Encuéntrenos en Google" (regla de usted); línea IATA en español: "Ventas IATA a través de una agencia anfitriona acreditada." Verifique la redacción con su agencia anfitriona.
- Newsletter: el mensaje de éxito ya no promete envíos "pronto".
- `requirements.otherDestinationHint`: faltaba en ambos idiomas (error en consola); se reutilizó el texto existente del formulario de cotización.

## Correos
- Aviso de lead a soporte: líneas etiquetadas, enlace para escribir al cliente y enlace a la administración (`src/lib/notifications.ts`). Uso interno.
- Invitación a opinar: línea adicional con el enlace a Google (`src/lib/review-invitation-send.ts`).
- Resumen diario al propietario (`src/lib/daily-job.ts`). Uso interno.
- **Recordatorios al cliente** (viaje en 7 días; saldo pendiente 14 días antes): **desactivados** hasta aprobar su texto (`CUSTOMER_REMINDERS=1` los activa).

## Pendiente de decisión del propietario (no implementado)
- Renombrar "Factura" a "Recibo" en PDF, correos y portal: confirme con su contador (auditoría D4).
- Política de privacidad: agregar la captura del número de WhatsApp, la atribución de origen (página, fuente de campaña) y los plazos de conservación. Es texto legal; requiere su aprobación.

---

# Copy de la revisión UX/UI (2026-09-29) — pendiente de aprobación

Detalle de la revisión en `docs/ux-overhaul.md`. No se modificó ningún texto aprobado (titular del inicio, Nosotros, legales). Los textos nuevos son de interfaz; están en `messages/es.json` → `ux.*` y `home.*` (con versión en inglés en `messages/en.json`).

## Nuevos (`ux.*`)
- `skipToContent` "Saltar al contenido" (accesibilidad, visible solo con teclado).
- `proofFree` "Cotización sin costo ni compromiso" — prueba en el inicio; resume `quote.how1`, ya aprobado.
- `proofRating` "{rating} de 5 en {count} opiniones" — se calcula de las opiniones aprobadas; no se muestra si no hay.
- `allPackages` "Ver todos los paquetes", `allReviews` "Ver todas las opiniones".
- `filterLabel` "Filtrar por región", `filterAll` "Todos", `packageCount` "{n} paquetes" (filtros de /paquetes; las regiones son las categorías de los paquetes).
- `copyright` "{año} viatour. Todos los derechos reservados." (el símbolo © se agrega en el pie)
- `notFoundNext` "Puede continuar por aquí:" (página 404).
- `menu` "Menú" (botón del menú móvil).
- `quickFacts` "Datos del viaje" (etiqueta accesible de los datos del paquete).

## Movidos o reutilizados
- `home.discoverTitle` / `home.discoverBody`: el texto de "Descubra su destino" estaba escrito en el código solo en español; ahora está en los mensajes (inglés en borrador).
- `home.resumeImages` "Reanudar imágenes": etiqueta del botón de pausa del inicio al reanudar.
- En el inicio se combinan textos aprobados: "Somos sus asesores de viaje, no una página más." + `home.assistance`, y como pruebas `home.why1Title` y `home.why6Title`.
- El pie usa "Somos sus asesores de viaje, no una página más." como línea de marca.

## Correcciones
- `reviews.googleSubline`: "Su opini?n nos ayuda mucho." → "Su opinión nos ayuda mucho." (error de codificación visible).
- `quote.otherDestination` y `packageQuote.otherDestination`: "Otro / Other" → "Otro destino" (mezclaba idiomas).

## Avisos internos ocultos
- Los avisos "Contenido funcional en borrador, pendiente de aprobación." (Contacto, Preguntas frecuentes) y "Texto en borrador, pendiente de aprobación." (banner de cookies) ya no se muestran al público. Para volver a mostrarlos en Contacto y Preguntas frecuentes: `siteConfig.showDraftNotices = true`. El aviso de borrador de los textos legales en inglés se mantiene.
- El recuadro vacío del logotipo IATA en el pie se retiró; la línea de texto IATA se mantiene.

---

# Copy de la ronda 3: UX, SEO y visibilidad en IA (2026-09-30), pendiente de aprobación

Detalle técnico en `docs/ux-seo-round-3.md`. No se modificó ningún texto aprobado. Todo lo nuevo se armó con datos ya publicados o con textos aprobados; no se inventaron cifras, credenciales ni plazos de respuesta.

## Textos de interfaz (`messages/es.json` → `ux.*`, versión en inglés en `messages/en.json`)
- `readingTime` "Lectura de {minutes} min" (guías).
- `updatedOn` "Actualizado el {date}". Solo aparece si la guía cambió después de publicarse.
- `contents` "Contenido" (índice de la guía).
- `relatedGuides` "Guías relacionadas" (guías y paquetes).
- `destinationGuides` "Guías para viajar a {name}" (destinos).
- `requirementsTitle` "Requisitos para viajar a {name}" (destinos y paquetes).
- `requirementsBody` "Consulte el pasaporte, la visa y los requisitos de entrada para viajeros hondureños antes de planificar su viaje. Confirme siempre con la fuente oficial."
- `requirementsCta` "Consultar requisitos".
- `otherDestinations` "Otros destinos".
- `ratingLabel` "Valoración de viajeros" (etiqueta accesible de la valoración; el número sale de las opiniones aprobadas).
- `seo.notFound`: título "viatour | Página no encontrada" y descripción de la página 404.

## Texto para buscadores y asistentes de IA (no visible en las páginas)
- **`/llms.txt` y `/llms-full.txt`** (`src/lib/llms.ts`): resumen de viatour y "Datos clave".
  - Qué ofrece, cómo se solicita, precio (sin costo ni compromiso; el precio final se confirma antes de reservar), pago (con el asesor, tarjeta o transferencia; no en el sitio), Mi reserva y acompañamiento, idiomas, área de servicio (Honduras y las ciudades publicadas), valoración calculada, contacto y la línea IATA.
  - Incluye una instrucción para asistentes: no indicar precios, disponibilidad ni plazos de respuesta.
  - Descripciones breves de Servicios y de Ayuda.
- **Datos estructurados de la agencia** (`src/lib/seo.ts`): descripción ampliada ("…vuelos, hoteles, paquetes y viajes a medida, cotizados personalmente por un asesor y coordinados por WhatsApp.") y una descripción por servicio.
- **RSS** (`/blog/rss.xml`): título "viatour | Guías de viaje desde Honduras" y descripción "Guías y artículos de viatour para planificar viajes al exterior desde Honduras."

---

# Copy de la ronda 4: UX, SEO y visibilidad en IA (2026-09-30), pendiente de aprobación

Detalle técnico en `docs/ux-seo-round-4.md`. No se modificó ningún texto aprobado ni se inventaron cifras, credenciales ni plazos de respuesta.

## Textos de interfaz nuevos (`messages/es.json` → `reviews.*`; versión en inglés en `messages/en.json`)
- `filterLabel` "Filtrar opiniones por calificación" (etiqueta accesible de la distribución de estrellas en /opiniones).
- `filterRow` "Ver las {n} opiniones de {estrellas}" (etiqueta accesible de cada fila).
- `filterActive` "Opiniones de {estrellas}: {n}" (aviso sobre la lista filtrada).
- `filterClear` "Ver todas las opiniones".
- `footer.coverage` "Cobertura": el título ya existía en el pie; solo se movió a los mensajes.

## Cambios de forma, sin cambio de texto
- Boletín: en "Acepto recibir ideas de viaje y ofertas de temporada según la Política de Privacidad." el enlace ahora es "Política de Privacidad". Antes se repetía después como "Privacidad.".
- Títulos de paquetes en buscadores: si "viatour | {paquete} a su medida desde Honduras" supera 60 caracteres, se usa "viatour | {paquete} desde Honduras" o "viatour | {paquete}", en lugar de cortar la frase.
- Botones de envío: muestran su texto aprobado desde el inicio; "Verificando conexión segura…" (ya aprobado) solo aparece si el visitante envía antes de terminar la verificación.
