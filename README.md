# viatour

Etapa 3b: captura real de cotizaciones en Supabase antes de continuar a WhatsApp.

## Desarrollo

1. Instale las dependencias con `npm install`.
2. Copie `.env.example` a `.env.local` y configure `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Ejecute `npm run dev`.
4. Abra [la guía temporal](http://localhost:3000/styleguide).

El middleware requiere la URL y la clave pública de Supabase para atender las páginas. Con los valores vacíos, las solicitudes devuelven un error. La clave de servicio se reserva para uso del servidor.

La página principal incluye el formulario de vuelos, hoteles, paquetes y viajes a medida, destinos destacados, paquetes sin precios, asesoría, opiniones vacías y CTA final. `/styleguide` y las rutas de navegación y legales conservan sus stubs. Los seis destinos destacados resuelven en `/destinos/[slug]`.

La moneda se guarda en la cookie `viatour-currency` durante un año. `useCurrency()` expone `currency` y `setCurrency` a los componentes cliente. El servidor lee la cookie para evitar un cambio de moneda al hidratar la página; esto hace que las rutas se rendericen por solicitud.

El formulario de newsletter valida los datos localmente, sin guardarlos ni enviarlos. Su texto de consentimiento, validación y estados está marcado como borrador pendiente de aprobación. El TODO de `src/components/layout/newsletter.tsx` señala la futura integración de almacenamiento. Los enlaces generales de WhatsApp abren directamente el mensaje autorizado para esta etapa.

## Verificación

- `npm run lint`
- `npm run build`
- `npm run typecheck`

Se conserva el archivo `src/middleware.ts` solicitado. Next.js 16 muestra una advertencia de obsolescencia para esta convención.


## Etapa 3: cotizaciones

`src/lib/quote.ts` separa la composición del mensaje, la captura y la navegación a WhatsApp. Los botones esperan `captureLead(payload)` antes de navegar en la misma pestaña para evitar bloqueos de ventanas emergentes. Si falla la captura, registran un diagnóstico sin datos personales y continúan a WhatsApp sin mostrar un error de almacenamiento.

La ruta `POST /api/leads` valida JSON y `servicio`, mapea las columnas conocidas, conserva el cuerpo completo en `payload` (incluidos `formData`, tramos y habitaciones), registra `user_agent` e inserta mediante el cliente Supabase del servidor con la clave pública anon y RLS. Genera un UUID antes del INSERT y lo devuelve tras su confirmación; no usa `.select()` ni necesita permisos de lectura. `estado` conserva el valor predeterminado de la tabla. No se usa la clave service role.

Todas las pestañas y botones de cotización envían la moneda del contexto. El presupuesto se almacena como número, con moneda separada; los campos vacíos se guardan como `null`. La composición del mensaje de WhatsApp no cambia. El botón conserva `disabled` y `aria-busy` mientras espera, sin demora artificial. El INSERT tiene un límite de 2 segundos y la petición del navegador de 2,5 segundos para continuar incluso si la red no responde. La captura es de mejor esfuerzo: un fallo o timeout puede dejar una solicitud sin guardar, pero no impide continuar a WhatsApp. No se reintenta automáticamente para evitar duplicados.

**TODO:** notificar soporte por email (Resend) en una etapa futura. No se envían correos en esta etapa. Los textos funcionales conservan la indicación de aprobación final pendiente.

### Verificar la captura

1. Ejecute `npm run dev` y abra `http://localhost:3000`.
2. Seleccione USD o HNL, complete una pestaña y pulse «Solicitar cotización por WhatsApp». En Network de las herramientas del navegador, active Preserve log: `POST /api/leads` debe devolver HTTP 201 con `{ ok: true, id }` antes de navegar.
3. En Supabase → Table Editor → `public.leads`, filtre `id` por el UUID recibido. Revise `servicio`, `moneda`, `presupuesto`, `notas`, `payload`, `user_agent` y `estado = nuevo`. No necesita enviar el mensaje de WhatsApp para guardar el lead.
4. Repita con Hoteles (huéspedes y habitaciones), Vuelos multidestino (tramos en `payload`), Paquetes y Viaje a medida (presupuesto).

Verificación real de esta etapa: se envió un payload de formulario a la API local y Supabase confirmó HTTP 201, ID `eb1294ec-09e6-49e9-b04e-ac4ad75f1985`, nombre `Prueba tecnica etapa 3b`, servicio `Viaje a medida`, HNL, presupuesto 25000 y nota de prueba «No contactar». La política anon de solo INSERT impide leer la fila desde esta integración; la inspección de sus columnas se realiza en Table Editor.

Pruebas automatizadas de validación, mapeo de los cuatro servicios y navegación tras éxito/fallo: `node --test tests/leads.test.mjs`. Estas pruebas aíslan Supabase y navegación; no crean leads reales ni envían mensajes.

Verifique en móvil y escritorio las cuatro pestañas con teclado, solo ida sin regreso, añadir y eliminar tramos, fechas ordenadas, adultos/niños, moneda USD/HNL en presupuesto, mensajes de cada servicio y los enlaces de destinos/paquetes. Los paquetes reales llegan en Etapa 4 y las opiniones reales en Etapa 6.

## Etapa 5: destinos

El hub y las páginas individuales consultan destinos publicados mediante el cliente Supabase del servidor (anon + RLS), ordenados por `orden` y `slug`. Inicio filtra `destacado = true`; ambos reutilizan la misma tarjeta. El contenido editorial procede de la base de datos, incluidos los avisos de ejemplo de los seis registros sembrados. Los textos funcionales nuevos están pendientes de aprobación final.

Las páginas incluyen cuerpo con párrafos, mejor época, paquetes vinculados por `destination_id`, acordeón accesible Radix con los tokens existentes, metadatos, canonical, BreadcrumbList, FAQPage únicamente con preguntas válidas e ItemList sin precios. Los detalles de paquetes enlazan al destino publicado. `/sitemap.xml` consulta las rutas publicadas de destinos y paquetes e incluye las rutas estáticas de navegación y legales.

Las cotizaciones reutilizan Stage 3b: `servicio: destino`, nombre en `fields.Destino` e identidad en `formData` (slug, nombre, destination_id). La captura precede al enlace de WhatsApp y su fallo no bloquea la navegación. La notificación por correo conserva el TODO existente.

### Verificar destinos

- Ejecute `npm run dev` y después `node tests/destinations-smoke.mjs`. La prueba solo lee datos públicos y páginas; no modifica Supabase. Puede cambiar el origen con `SMOKE_ORIGIN`.
- La prueba verifica todos los destinos publicados, sus metadatos, un H1, esquema FAQ condicional, tarjetas destacadas, vínculos en ambas direcciones, precio nulo, sitemap y HTTP 404 para un slug inexistente.
- Los seis slugs comprobados son punta-cana, cartagena, dubai, cancun, rio-de-janeiro y panama. Los tres primeros tienen un paquete vinculado cada uno.
- Revise visualmente móvil/escritorio, foco y navegación del acordeón con teclado. Revise los textos de ejemplo antes de publicar contenido definitivo.
- En Network, confirme que la cotización hace POST a /api/leads antes de abrir WhatsApp y conserva el destino y la moneda. La notificación de soporte por correo aún no está implementada.

## Etapa 6: opiniones

`/opiniones` y el inicio leen exclusivamente `reviews_resumen` y `reviews_publicas`. Con cero aprobadas se muestra «Aún no tenemos opiniones publicadas.» y se omite el JSON-LD de valoraciones; el inicio conserva un estado vacío visible. La lista tiene paginación de 30 opiniones; el inicio muestra hasta tres. Correo y número de reserva nunca se consultan para la presentación pública.

`/opiniones/nueva` envía multipart a `/api/reviews`. Configure `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` (solo servidor). El servidor valida campos, honeypot, tamaño y firma de JPG/PNG/WebP (máximo 3 MB), sube a `review-photos` e inserta con `estado=pendiente`, `fuente=formulario`, `verificada=false`. Devuelve únicamente `ok/id`; elimina la foto si falla el INSERT. El límite total del cuerpo se comprueba durante su lectura. El honeypot constituye la protección básica solicitada; no hay captcha ni limitador distribuido de solicitudes.

Los textos funcionales nuevos (etiquetas, validaciones, carga, errores, aviso de foto pública y navegación), salvo las frases provistas en el encargo, son **borradores pendientes de aprobación final**. No se ha añadido contenido testimonial. El bucket es público: las fotos son accesibles mediante su URL antes de moderarse, pero solo se muestran en el sitio al aprobar la opinión. No suba fotos con información privada. Las notificaciones de soporte por correo conservan la integración pendiente documentada en etapas anteriores.

### Verificar envío y moderación

1. Ejecute `npm run dev`, abra `/opiniones` y compruebe el estado vacío. En el HTML no debe aparecer `AggregateRating` ni esquema `Review` con cero aprobadas.
2. Abra `/opiniones/nueva`. Para una prueba técnica, use datos claramente identificados como prueba y nunca apruebe esa fila. Para comprobar la publicación, utilice exclusivamente una opinión genuina con permiso de su autor. Complete nombre, correo, estrellas (Tab y flechas), texto y opcionalmente una foto real. Network debe mostrar `POST /api/reviews` → 201 con `ok/id` y el mensaje de moderación.
3. En Supabase → Table Editor → `reviews`, filtre por ese `id`: compruebe `estado=pendiente`, `fuente=formulario`, correo privado y `foto_path`. En Storage → `review-photos`, busque ese path y compruebe la foto. La fila pendiente no debe aparecer en ninguna vista pública ni en el inicio.
4. Hasta la Etapa 7, apruebe **solo una opinión genuina** cambiando `estado` a `aprobada` en Table Editor. Recargue `/opiniones` y el inicio para ver la tarjeta y los agregados; el correo no debe figurar en HTML/JSON-LD. Cambie a `rechazada` para retirarla. Elimine las pruebas técnicas y sus fotos al terminar; no las publique.

### Importar opiniones genuinas (utilidad local del propietario)

Use Node 24 (disponible en este proyecto). Copie `data/reviews-import.sample.csv` a `data/reviews-import.csv`: la plantilla contiene **solo encabezados**. Exporte su hoja de cálculo como CSV UTF-8 con comas; se admiten celdas entre comillas, comas y saltos de línea dentro de ellas. Complete únicamente opiniones reales de Facebook o WhatsApp, nombres y fechas originales `YYYY-MM-DD`. `email`, `numero_reserva` y `verificada` son opcionales; `verificada` admite `true/false/1/0`, vacío significa false. Un correo ausente se inserta como NULL, nunca como uno inventado; la base debe permitirlo para importaciones (el formulario siempre exige correo).

```powershell
node --env-file=.env.local scripts/import-reviews.ts data/reviews-import.csv --dry-run
node --env-file=.env.local scripts/import-reviews.ts data/reviews-import.csv
```

El script valida el archivo completo antes de una sola inserción (hasta 500 filas) usando SERVICE ROLE y `estado=aprobada`. No lo ejecute dos veces sobre el mismo archivo: compruebe la tabla antes de reintentar una operación con resultado incierto. Los archivos privados en `data/` están ignorados por Git. La utilidad está fuera de `src/` y `public/`, sin ruta web. Nunca comparta la clave ni importe reseñas ficticias. La plantilla vacía puede validarse sin insertar nada.

## Etapa 7: motor de valoración e invitaciones

Ejecute manualmente `docs/sql/reviews_views_audit.sql` para imprimir las definiciones con `pg_get_viewdef` y aplicar sus correcciones solo si una vista no filtra `estado='aprobada'`. Ejecute `docs/sql/review_invitations.sql` antes de usar el panel de invitaciones en `/admin/opiniones`; la aplicación no ejecuta SQL de esquema.

`scripts/seed-reviews-dev.mjs` exige `SEED_DEV=1`, rechaza `NODE_ENV=production` y el dominio de producción, y solo carga cinco fixtures identificados como `dev-fixture`. Espera promedio `3.4` y distribución `c5=1`, `c4=2`, `c3=1`, `c2=0`, `c1=1`. El script está fuera de la aplicación y nunca se despliega.

### Verificación realizada

Build, lint, typecheck y `node --test tests/reviews.test.mjs` completados. La verificación HTTP confirmó inicio y opiniones vacíos, ausencia de `AggregateRating`, formulario con cinco radios y aviso de correo privado. Una solicitud técnica temporal obtuvo 201; se comprobó la fila pendiente, la foto en Storage y su ausencia de las vistas públicas. La fila y el archivo se eliminaron sin aprobarlos: `reviews` terminó con **0 filas**. No se importaron opiniones. El bucket indicado no existía en el proyecto conectado; se creó `review-photos` público, limitado a 3 MB y JPG/PNG/WebP. El servidor dev quedó disponible en `http://localhost:3000`. No hubo navegador conectado para completar la revisión visual y de teclado; esa comprobación manual queda pendiente.
# UI polish verification

Public forms share a single managed Turnstile check (`appearance: interaction-only`).
`/api/human` verifies it on the server and issues a signed, HttpOnly, SameSite=Strict
cookie for 30 minutes (Secure in production). Lead, review, and newsletter endpoints
validate that cookie before skipping Siteverify; their existing database rate limits
still run on every submission. The signing key derives from `TURNSTILE_SECRET_KEY`,
so rotating that secret also invalidates existing human sessions. Pure WhatsApp links
do not submit forms or request a challenge.

Configure a **Managed** widget and both Turnstile environment variables for deployment.
This repository cannot change the widget mode in the Cloudflare dashboard. Managed
mode normally needs no visible interaction, but Cloudflare may request one when needed.

Run `npm run build`, `node --test "tests/*.test.mjs"`, and `npm run lint`.
For browser QA, start a local server with a dummy `NEXT_PUBLIC_TURNSTILE_SITE_KEY`,
set `PLAYWRIGHT_PACKAGE` to an installed Playwright package.json, then run
`node tests/polish-smoke.mjs` and `node tests/hero-smoke.mjs`.
These tests intercept verification and submissions without creating real leads.
The polish test covers 320/360/390/430/768/1440px; optional `POLISH_SCREENSHOTS`
sets its screenshot directory. `SMOKE_ORIGIN` defaults to `http://localhost:3011`.
