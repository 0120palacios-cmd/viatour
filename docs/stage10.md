# Etapa 10: SEO, analítica y rendimiento

Los metadatos funcionales nuevos son borradores pendientes de aprobación editorial. El texto aprobado de Nosotros permanece intacto. Los títulos y descripciones de registros publicados se obtienen de Supabase; los respaldos usan el nombre real del registro. No se añadieron credenciales, perfiles sociales, precios, reseñas ni calificaciones.

Todas las páginas públicas tienen título y descripción propios, canonical y etiquetas Open Graph/Twitter. El respaldo `/og` usa el logotipo real sobre blanco con el acento de marca. El icono usa el punto de la marca sobre una superficie azul. Los títulos estáticos públicos se aproximan a 55–60 caracteres y sus descripciones a 150–160; los nombres editoriales largos pueden exceder ese objetivo.

El sitemap incluye las rutas públicas indexables, la página de envío de opiniones y todos los paquetes, destinos y artículos publicados. No incluye administración, API, guía interna de diseño ni documentos legales que siguen pendientes de aprobación y con `noindex`. Cuando se aprueben los documentos legales, retire su `noindex` y añada `legalLinks` al sitemap. Robots bloquea `/admin` y `/api`; esas rutas también reciben `X-Robots-Tag: noindex, nofollow`.

El esquema TravelAgency solo contiene nombre, URL, Honduras y contacto de WhatsApp. Los paquetes no emiten Offer sin un precio referencial positivo real almacenado. Las reseñas y AggregateRating proceden exclusivamente de las vistas públicas de opiniones aprobadas. Las preguntas frecuentes solo generan FAQPage cuando existen preguntas publicadas. Las páginas de detalle incluyen BreadcrumbList y los artículos BlogPosting.

ConsentGate impide montar los cargadores hasta que useCookieConsent indique aceptación. No hay scripts, píxeles de imagen, preconexiones ni solicitudes de proveedores antes de aceptar. Los IDs vacíos o inválidos no cargan nada. Los scripts son asíncronos y los eventos solo se envían cuando el proveedor terminó de cargar. Al rechazar se bloquean los eventos, se revoca el consentimiento del proveedor y se ignoran respuestas de carga tardías. No se conserva una cola de conversiones anteriores al consentimiento.

Eventos personalizados en ambos proveedores: `whatsapp_click`, `quote_submit`, `contact_submit`, `newsletter_signup`, `review_submit`. Los parámetros permitidos son `service`, `page`, `placement`, `status`; no se envían datos de contacto ni contenido de formularios. `quote_submit`, `contact_submit` y `review_submit` requieren guardado satisfactorio. El formulario existente de newsletter sigue siendo un prototipo sin persistencia: su evento usa `status=requested`, nunca `saved`; no debe contarse como suscripción confirmada. Configure los eventos de guardado como eventos clave en GA4 y conversiones personalizadas en Meta después de verificarlos en producción.

## Variables para lanzamiento

Configure las variables en Vercel para Production y vuelva a desplegar; Next.js incorpora las variables públicas al compilar. `.env.local` conserva los cuatro IDs nuevos vacíos y no se incorpora al commit.

| Variable | Valor y procedencia |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto, Supabase Project Settings / API. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anon del mismo proyecto; su acceso depende de RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role de Supabase para operaciones administrativas del servidor. Nunca use un prefijo público. |
| `NEXT_PUBLIC_SITE_URL` | `https://miviatour.com` en producción. Los metadatos y el sitemap usan el dominio canónico solicitado explícitamente. |
| `NEXT_PUBLIC_GA4_ID` | ID de medición `G-…`, Google Analytics / Administrar / Flujos de datos / Web. Opcional hasta activar GA4. |
| `NEXT_PUBLIC_META_PIXEL_ID` | ID numérico del píxel, Meta Business / Administrador de eventos / Fuentes de datos. Opcional hasta activar Meta. |
| `NEXT_PUBLIC_GSC_VERIFICATION` | Solo el valor `content` de la etiqueta HTML, Google Search Console / Verificación de propiedad / Etiqueta HTML. No instala seguimiento. |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | Reservado, vacío. Procederá de TikTok Ads / Events Manager cuando exista la cuenta. No hay integración activa. |

## Verificación

- `npm run build`, `npm run lint`, `npm run typecheck`.
- `node --test tests/stage10.test.mjs`: IDs vacíos/configurados/inválidos, eventos antes y después de carga, revocación y respuesta tardía. Los IDs de prueba son fixtures locales y no se envían a proveedores.
- `node tests/stage10-smoke.mjs`: servidor de producción en puerto 3010; puede cambiarlo con `SMOKE_ORIGIN`. Audita todas las rutas publicadas del sitemap y los cuatro documentos legales: metadatos únicos, un H1, canonicals, tarjetas sociales, JSON-LD, robots y endpoints de imágenes de marca.
- El conector de navegador no tenía navegador disponible en esta sesión. Las pruebas del cargador usan DOM y proveedores simulados; no equivalen a una captura de red de navegador ni a una medición de Core Web Vitals. Antes del lanzamiento, verifique en un navegador móvil: almacenamiento limpio y rechazo sin solicitudes a Google/Meta; aceptación con IDs vacíos sin solicitudes; aceptación con IDs reales cargando solo los proveedores configurados; eventos en DebugView/Test Events; rechazo posterior bloqueando nuevas conversiones; navegación sin errores de consola.

## Contenido y pendientes reales

Los registros publicados actuales de paquetes, destinos y un artículo están marcados como contenido de ejemplo; reemplácelos o despublíquelos antes de lanzamiento. Los precios de los paquetes actuales son nulos y no generan ofertas con precios. Las fotografías auténticas siguen pendientes en varias rutas, incluido el hero de inicio, que conserva su fondo tonal. No se añadió fotografía artificial.

Las fotografías de Supabase Storage usan optimización responsive de next/image. Las URLs externas existentes conservan next/image sin proxy de optimización hasta que se aprueben sus hosts. Los contenedores reservan proporción o dimensiones; solamente las imágenes superiores de detalle y el logotipo del encabezado tienen prioridad. Manrope conserva `display: swap` y alojamiento de Next.js. No se encontraron embeds de video/social activos que requieran carga diferida. La composición editorial Markdown sigue en el servidor.

Mida LCP, CLS e INP con contenido y fotografías definitivos en producción; no se afirma un puntaje sin medición. La convención `middleware` existente sigue deprecada en esta versión de Next.js y puede migrarse a `proxy` en mantenimiento.

La notificación de leads por correo sigue siendo un TODO previo en `/api/leads`, y la suscripción a newsletter no se guarda todavía. Esta etapa instrumenta los manejadores existentes y no afirma que esos servicios estén activos. También permanece el comportamiento previo de continuar a WhatsApp si falla la captura en los formularios de cotización; debe revisarse antes de lanzamiento para cumplir estrictamente la regla de captura y notificación previas.
