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

---

# Copy de la ronda 5: UX, SEO y presencia en Google (2026-09-30), pendiente de aprobación

Detalle técnico en `docs/ux-seo-round-5.md`. No se inventaron cifras, credenciales, reseñas ni plazos de respuesta.

## Textos reescritos (`messages/es.json` → `static.*`; versión en inglés en `messages/en.json`)
- `contactIntro` antes: "Contacto con sus asesores de viaje desde Honduras con viatour. Consulte la información disponible y cuéntenos qué busca para recibir asesoría sobre su viaje." Ahora: "Escríbanos por WhatsApp, por correo o con el formulario. Cuéntenos a dónde desea viajar, en qué fechas y cuántas personas viajan, y un asesor le preparará opciones."
- `blogIntro` antes: "Consulte nuestras publicaciones para planificar su viaje." Ahora: "Guías para viajar desde Honduras: documentos y requisitos, mejor época para cada destino y cómo elegir entre opciones parecidas." (Describe solo temas que las nueve guías publicadas ya tratan.)

## Texto para buscadores (no visible en las páginas)
- Cierre de descripciones cortas: "Solicite su cotización con viatour." (antes "Conozca más y solicite su cotización con viatour.", que se cortaba). Fichas: "Solicite su cotización con viatour desde Honduras." Solo se agrega cuando cabe completo.
- Tres descripciones aprobadas superan los 160 caracteres y ahora terminan en su última oración completa: `seo.home` (pierde "Solicite su cotización por WhatsApp."), `seo.destinations` y `seo.requirements` (pierde "Verifique siempre los requisitos con la autoridad oficial."). Si desea conservar esas frases en Google, acorte el texto a 160 caracteres.

## Reutilizados, sin texto nuevo
- Página de ciudad: los tres puntos de confianza del inicio ("Una persona real lo asesora", "Cotización sin costo ni compromiso", "Experiencia desde 2018"), la calificación real, "Cómo funciona" y las opiniones del inicio.
- Confirmación de una opinión enviada en el sitio: agrega `reviews.googleSubline` y `reviews.googleCta` ("Déjenos su opinión en Google"), mostrados a todas las personas por igual, sin importar su calificación.

---

# Copy de la V3: descubrimiento, promoción y confianza (2026-09-30), pendiente de aprobación

Detalle técnico en `docs/ux-v3.md`. No se inventaron cifras, reseñas, credenciales, precios ni plazos de respuesta. Los conteos de paquetes y la lista de destinos adicionales salen de los paquetes publicados. Versión en inglés en `messages/en.json` → `v3.*`.

## Textos nuevos (`messages/es.json` → `v3.*`)
- **Tipos de viaje (inicio):** "¿Qué tipo de viaje busca?" / "Elija un estilo y vea los paquetes que encajan con usted. Si su idea es otra, la armamos a su medida." Estilos: "Playa y Caribe", "Luna de miel", "En pareja", "En familia", "En grupo", "Cultura e historia", "Aventura y naturaleza", "Cruceros". Conteo: "{n} paquetes". Cierre: "¿Busca otro tipo de viaje? Cuéntenos su idea".
- **Destinos:**
  - Intro: "Algunos de los destinos favoritos de nuestros viajeros. Son solo el comienzo: también planificamos viajes a muchos otros lugares del mundo." **Confirme que esta afirmación es correcta para su operación.**
  - Ficha final: "¿No encuentra su destino?" / "También lo planificamos. Cuéntenos a dónde quiere viajar."
  - Bloque: "Y muchos destinos más" / "Algunos de los viajes que también preparamos:"
- **Promoción (inicio):**
  - Etiqueta: "Promoción para viajeros de viatour".
  - Título: "Viaje. Comparta. Gane."
  - Intro: "Si viajó con viatour, comparta el video de su viaje y participe en nuestra ruleta de premios para viajeros."
  - Pasos: "Viaje con viatour." / "Grabe un video de su viaje y publíquelo en TikTok, Instagram o Facebook." / "Etiquete a @miviatour y envíenos el enlace por WhatsApp." / "Al aprobar su publicación, reciba su código y gire la ruleta."
  - Botón: "Descubra cómo participar".
  - Condiciones: "Aplican condiciones. Un giro por viaje; premios sujetos a disponibilidad y a confirmación de su asesor."
  - Redes: "Síganos en".
  - Imagen ilustrativa: "Mi viaje con @miviatour", con el texto alternativo "Vista de ejemplo de una publicación de viaje que etiqueta a @miviatour".
- **Cierre del inicio:**
  - Cotización: "¿Está planificando un viaje?" / "Cuéntenos a dónde quiere ir, sus fechas y quiénes viajan. Un asesor le prepara opciones sin costo ni compromiso."
  - Reserva: "¿Ya tiene una reserva?" / "En Mi reserva puede consultar su itinerario, sus documentos, sus pagos y sus solicitudes de ayuda." / "Ir a Mi reserva".
- **Paquetes (/paquetes):**
  - Búsqueda: "Buscar paquetes", "Destino, país o tipo de viaje", "Buscar", "Tipo de viaje", "Región", "Quitar filtros", "Resultados para «…»".
  - Sin resultados: "No encontramos un paquete publicado con estos filtros" / "Podemos preparar una opción personalizada para usted. Cuéntenos a dónde quiere viajar y un asesor le arma la propuesta." / "Planifiquemos su viaje".
  - Después de la lista: "¿No ve el viaje que busca?" / "Los paquetes publicados son ideas para inspirarse. También cotizamos otros destinos, fechas y estilos de viaje." / "Cuéntenos su idea".
- **Ficha de paquete:** "Ideal para:" antes de los estilos del paquete.
- **Pie de página:** enlace "Comparta su viaje y gane" (`common.sharePromo`).

## Reutilizados, sin texto nuevo
- /gira conserva su título, introducción, pasos y condiciones; solo cambió el diseño y se agregaron migas de pan ("Inicio > Comparta su viaje y gane").

## V3, segunda pasada (2026-09-30), pendiente de aprobación
- Opiniones: "Cómo publicamos las opiniones" / "Cada opinión se revisa antes de publicarse. Toque una calificación para ver solo esas opiniones, también las más bajas." (describe la moderación y el filtro que ya existen).
- Resumen de viajeros en el formulario del inicio: "1 adulto", "2 adultos, 1 niño" (antes "Adultos: 2; Niños: 1").
- Etiqueta accesible del botón que cierra el menú móvil: "Cerrar menú" (antes "Cerrar").
- Sin texto nuevo: la guía destacada del blog y los cierres de /blog y /opiniones reutilizan textos aprobados.

## V3, tercera pasada (2026-09-30), pendiente de aprobación
- Mi reserva: "Todo su viaje en un solo lugar" / "Por su seguridad, le enviaremos un código de verificación al correo registrado en su reserva." / "¿No encuentra su código de reserva?" / "Escríbanos por WhatsApp y su asesor le ayuda a ingresar." La lista de secciones reutiliza los nombres que ya usa el portal.
- Nosotros: la tarjeta lateral reutiliza textos aprobados ("Experiencia desde 2018", "Una persona real lo asesora", "Gestione su reserva en línea", la nota IATA del pie de página y "Encuéntrenos en Google"). El texto aprobado de la página no cambió.
- Requisitos: "Guías relacionadas" (texto existente).

# Copy de la V4 (2026-09-30), pendiente de aprobación

Detalle técnico en `docs/v4-audit.md`. Los textos están en `messages/es.json` → `v4.*` (con versión en inglés en `messages/en.json`). No se inventaron cifras, credenciales, plazos de respuesta ni políticas: cada línea sobre dinero repite lo que ya dicen los Términos (§4–6) y la Política de Cancelaciones (§1–5), o es una lista de verificación para el cliente.

## Requiere su decisión
- **Titular del inicio (reemplaza el texto aprobado "Cotice con nosotros.").** Nuevo: "Su agencia de viajes en Honduras, con un asesor real." con la entrada "Le cotizamos vuelos, hoteles, paquetes y viajes a la medida según su presupuesto y sus fechas, y lo acompañamos antes, durante y después de su viaje." (la última parte repite `home.why4Body`, ya aprobado). Motivo: el titular anterior no decía qué es viatour (ronda 5, decisión D1). Para volver al anterior: en `src/components/home/sections.tsx`, cambiar `v4.heroTitle` por `home.heroTitle`.

## Transparencia de precios ("Antes de pagar, todo claro")
Aparece en el inicio (junto a "Cómo funciona"), en cada paquete (después del itinerario) y en Vuelos, Hoteles y Viaje a medida.
- "Su asesor le confirma antes de que usted pague": "El precio final de su viaje." / "Qué incluye y qué no incluye." / "Si hace falta un depósito, su monto y sus condiciones." / "Las condiciones de cambio, cancelación y reembolso de cada proveedor."
- "Revise también en su cotización": "Hasta qué fecha es válida la tarifa." / "Impuestos o cargos que se pagan en el aeropuerto o en el destino." / "Servicios del hotel que se cobran aparte o dependen de disponibilidad."
- Cierre: "No hay cargo alguno hasta que usted acepta una opción y realiza el pago. El pago se coordina con su asesor, con tarjeta o transferencia; este sitio no procesa pagos."
- En la tarjeta "No incluye" de cada paquete: "¿Hay cargos que se pagan en el destino? Pregunte a su asesor cuáles aplican a su viaje antes de pagar."
- Paso 4 de "Cómo funciona": "Lo acompañamos durante el viaje" / "Con Mi reserva consulta su itinerario, sus pagos y sus documentos. Si surge algo, escríbanos con su código de reserva."
- Inicio: "¿Solo necesita una parte del viaje?" (enlaces a Vuelos, Hoteles, Viaje a medida, Descubra su destino).

## Títulos (H1)
"Paquetes de viaje desde Honduras", "Destinos para viajar desde Honduras", "Guías para viajar desde Honduras", "Opiniones de nuestros viajeros", "Preguntas frecuentes sobre viajes desde Honduras".

## Mi reserva
"Reserva {código}" · "Faltan N días para su viaje" / "Su viaje comienza hoy" / "Su viaje está en curso" / "Su viaje terminó el {fecha}" · "Fechas" · "Saldo pendiente" · "Próximo paso" con uno de: "Esta reserva está cancelada. Si tiene preguntas, escríbanos por WhatsApp." / "Tiene un saldo pendiente de {monto}. Coordine el pago con su asesor." / "Su reserva está pendiente de confirmación con los proveedores." / "Sus documentos de viaje aparecerán en esta página cuando su asesor los comparta." / "Revise sus documentos y los requisitos de su destino antes de viajar." · "Durante su viaje" / "Si surge algo durante su viaje, escríbanos por WhatsApp o por correo e indique su código de reserva {código}." · "Compartidos por viatour" / "Enviados por usted" y sus estados vacíos · "Cambios, cancelaciones y reembolsos se rigen por las condiciones de cada proveedor." · "Ingresar otros datos" · Mensaje de WhatsApp desde el portal: "Hola, necesito ayuda con mi reserva {código}." (antes estaba en inglés para todos) · Subida de documentos: "máximo 4 MB; las fotos más grandes se reducen automáticamente" y "El documento pesa más de 4 MB. Si es un PDF, comprímalo o envíelo a su asesor por WhatsApp."

## Preguntas frecuentes nuevas (`data/faqs.mjs`, órdenes 12–21)
Tres categorías nuevas: "Precios y cargos", "Cambios y cancelaciones" y "Después de reservar". Diez preguntas; las respuestas repiten los Términos y la Política de Cancelaciones. No se publican hasta que usted ejecute `node scripts/import-faqs.mjs`. Ojo: el script también vuelve a escribir las 11 preguntas existentes con el texto de `data/faqs.mjs` (busca por el texto de la pregunta). Si editó alguna respuesta desde el panel, copie primero esa respuesta en `data/faqs.mjs`, o agregue las diez preguntas nuevas desde el panel en lugar de usar el script.
