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
