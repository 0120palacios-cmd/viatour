# viatour

Etapa 3: inicio y herramienta de cotización con cuatro servicios, sobre la estructura global de la Etapa 2.

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

`src/lib/quote.ts` separa la composición del mensaje, la captura y la navegación a WhatsApp. Los nuevos botones esperan `captureLead(payload)` antes de navegar en la misma pestaña para evitar bloqueos de ventanas emergentes. Si falla la captura, muestran un error y permiten reintentar.

**TODO Etapa 3b:** guardar el lead en Supabase y notificar soporte antes de abrir WhatsApp. La función actual solo resuelve: no almacena ni envía correos. Los textos de esta etapa llevan comentarios de aprobación final pendiente; esto incluye los borradores de etiquetas y validación.

Verifique en móvil y escritorio las cuatro pestañas con teclado, solo ida sin regreso, añadir y eliminar tramos, fechas ordenadas, adultos/niños, moneda USD/HNL en presupuesto, mensajes de cada servicio y los enlaces de destinos/paquetes. Los paquetes reales llegan en Etapa 4 y las opiniones reales en Etapa 6.
