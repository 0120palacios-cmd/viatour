# Checklist de verificación pre-lanzamiento

Este documento reúne las comprobaciones que deben cerrarse antes de desplegar Stage 14. No sustituye una prueba contra el proyecto Supabase real ni la revisión editorial/legal.

## Automatizado en cada candidato

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] Revisar `git diff --check` y confirmar que no hay secretos, `.env*` locales ni dumps en el commit.
- [ ] Confirmar que la rama es `stage14-hardening`; no fusionar ni desplegar desde esta rama.

## Rutas y estados esperados

- [ ] Las páginas públicas `/`, `/vuelos`, `/hoteles`, `/paquetes`, `/viaje-a-medida`, `/destinos`, `/descubrir`, `/requisitos`, `/opiniones`, `/opiniones/nueva`, `/contacto`, `/nosotros`, `/preguntas-frecuentes` y `/blog` devuelven `200` con un H1, título, descripción y canonical.
- [ ] `/og` devuelve `200` con una imagen PNG; `/robots.txt` y `/sitemap.xml` devuelven `200`.
- [ ] Un slug inexistente de `/destinos`, `/paquetes`, `/blog` y `/agencia-de-viajes` devuelve `404`.
- [ ] Las cuatro páginas legales devuelven `200` y conservan su estado editorial aprobado antes de indexarse.
- [ ] `/admin/login` devuelve `200`; `/admin` y las secciones protegidas redirigen a `/admin/login` sin sesión y funcionan con una cuenta administradora real.
- [ ] Las rutas API devuelven estados previstos: `/api/health` `200` sin sesión; solicitudes inválidas `400`; rate limit `429`; no autorizado `401/403`; fallas de dependencia `503` o `502` según la operación.
- [ ] `/api/health` no exige sesión, no consulta la base de datos, no devuelve secretos, usa `Cache-Control: no-store` y no recibe el `X-Robots-Tag` de las demás APIs. `robots.txt` permite explícitamente `/api/health` para dejar clara su función de monitorización.

## Indexación, sitemap y metadatos

- [ ] `/admin`, `/api`, `/mi-reserva` y `/styleguide` tienen `noindex`; también lo tienen los cuatro documentos legales.
- [ ] Las ciudades de Prioridad 2 (`Danlí`, `El Progreso`, `Choloma`, `Comayagua`, `Villanueva`, `Puerto Cortés`, `Choluteca`, `Siguatepeque`, `Santa Rosa de Copán`, `Juticalpa` y `Tela`) tienen `robots: noindex, follow`.
- [ ] Las ciudades de Prioridad 1 publicadas (`San Pedro Sula`, `Tegucigalpa`, `La Ceiba` y `Roatán`) tienen `index, follow` y aparecen en sitemap.
- [ ] El sitemap contiene solo rutas públicas indexables en español e inglés, ciudades P1, destinos/paquetes publicados y artículos publicados; excluye admin, API, `/mi-reserva`, styleguide, legales y ciudades P2.
- [ ] En inicio, servicios, destinos, paquetes, blog, ciudades y legales se comprueba `canonical`, `hreflang` `es`, `en` y `x-default` con el dominio canónico.
- [ ] Las páginas clave emiten JSON-LD válido y ningún nodo contiene `offers.price` ni `priceCurrency` mientras los precios no estén publicados; tampoco se emite precio `0`.
- [ ] Un paquete con precio ausente, cero o no válido muestra únicamente la CTA de cotización; no muestra un precio inventado.
- [ ] No hay fechas de viaje fijas en copy público, JSON-LD o metadatos; las fechas que el usuario introduce en un formulario y las fechas del portal autenticado son los únicos datos dinámicos permitidos.

## Formularios, abuso y notificaciones

- [ ] Cotización, contacto, newsletter, reseña, descubrir y cualquier formulario público montan Turnstile; el servidor verifica el token, el origen y los límites de tamaño.
- [ ] Cada endpoint público mutador tiene rate limit y falla cerrado cuando el RPC de rate limit no está disponible.
- [ ] Se confirma el flujo requerido: primero se guarda el lead y se intenta notificar soporte; después se abre el enlace prellenado de WhatsApp. Una falla de Resend no borra el lead guardado.
- [ ] Las fallas de notificación de lead, reseña, cotización, factura, invitación y ticket aparecen en logs y se capturan en Sentry cuando el DSN está configurado, sin enviar cuerpos de solicitudes, correos, tokens ni credenciales.
- [ ] Se prueba un fallo controlado de Resend en staging y se confirma el evento owner-visible en Sentry.
- [ ] Se comprueba que GA4 y Meta solo hacen solicitudes después del consentimiento; los eventos no contienen nombre, correo, teléfono ni contenido de cotización.

## Portal y Supabase

- [ ] El portal funciona en dos pasos: solicitar código OTP y verificar código; se prueban código correcto, incorrecto, expirado, usado, reenvío limitado, cookie de sesión, cierre de sesión y acceso a una reserva real.
- [ ] `portal-docs` y `review-photos` son buckets privados; no existen políticas amplias que concedan lectura o escritura a `anon`/`authenticated`; las URLs de documentos se generan de forma controlada.
- [ ] RLS está habilitado en tablas públicas y privadas, y las políticas se revisan en Supabase contra los SQL de `docs/sql/` sin hacer cambios destructivos.
- [ ] Los grants de `anon` permiten solo las operaciones públicas intencionales; el service role permanece solo en servidor; no se expone en navegador ni logs.
- [ ] Se revisan los límites y políticas de `storage.objects`, incluyendo `portal-docs`, `review-photos` y `blog-images`.

## Variables necesarias en Vercel

Solo nombres; configurar valores reales en Vercel y nunca en Git:

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PORTAL_SECRET`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `RAPIDAPI_VISA_KEY`, `REQUIREMENTS_PROVIDER`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GSC_VERIFICATION`, `NEXT_PUBLIC_TIKTOK_PIXEL_ID`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`

`SUPABASE_DB_URL` es un secret de GitHub Actions para backups, no una variable de Vercel.

## Pasos manuales antes de aprobar el lanzamiento

- [ ] Crear el proyecto de Sentry, copiar el DSN público y el DSN servidor a sus variables correspondientes y revisar la retención del plan gratuito.
- [ ] Crear un monitor HTTP `GET https://miviatour.com/api/health` en UptimeRobot y confirmar que una respuesta `200` queda registrada.
- [ ] Crear el secret de repositorio `SUPABASE_DB_URL` en GitHub Actions; ejecutar el workflow manualmente y verificar el artifact de backup con retención de 14 días.
- [ ] Mantener report-only y revisar reportes reales en producción; confirmar cero violaciones legítimas y luego aplicar el cambio de una línea de `docs/csp-audit.md`.
- [ ] Rotar y cargar un nuevo `RAPIDAPI_VISA_KEY`; verificar que la clave anterior quedó revocada y que nunca aparece en el cliente.
- [ ] Agregar las URLs reales y aprobadas de Instagram/TikTok en `siteConfig.socialReels` y probar consentimiento, carga diferida y fallback.
- [ ] Subir fotografías reales aprobadas, con alt text en español, a los buckets/rutas correspondientes; reemplazar placeholders antes de publicar.
- [ ] Confirmar el ID de GA4 y el Pixel de Meta, consentimiento, eventos de prueba y ausencia de PII en DebugView/Test Events.
- [ ] Verificar dominios de producción en Turnstile y Resend, remitentes, correo de soporte y recepción real de lead/reseña/cotización.
- [ ] Revisar copy pendiente, legales, ciudades P2, artículos y datos de ejemplo; obtener aprobación antes de indexar o publicar.
