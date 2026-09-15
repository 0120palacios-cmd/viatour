# viatour

Etapa 2: estructura global con encabezado, menú móvil, pie de página, WhatsApp y selección persistente de moneda.

## Desarrollo

1. Instale las dependencias con `npm install`.
2. Copie `.env.example` a `.env.local` y configure `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Ejecute `npm run dev`.
4. Abra [la guía temporal](http://localhost:3000/styleguide).

El middleware requiere la URL y la clave pública de Supabase para atender las páginas. Con los valores vacíos, las solicitudes devuelven un error. La clave de servicio se reserva para uso del servidor.

La página principal está vacía; `/styleguide` se conserva dentro de la estructura global. Las rutas de navegación y legales contienen únicamente sus títulos hasta las etapas correspondientes.

La moneda se guarda en la cookie `viatour-currency` durante un año. `useCurrency()` expone `currency` y `setCurrency` a los componentes cliente. El servidor lee la cookie para evitar un cambio de moneda al hidratar la página; esto hace que las rutas se rendericen por solicitud.

El formulario de newsletter valida los datos localmente, sin guardarlos ni enviarlos. Su texto de consentimiento, validación y estados está marcado como borrador pendiente de aprobación. El TODO de `src/components/layout/newsletter.tsx` señala la futura integración de almacenamiento. Los enlaces generales de WhatsApp abren directamente el mensaje autorizado para esta etapa.

## Verificación

- `npm run lint`
- `npm run build`
- `npm run typecheck`

Se conserva el archivo `src/middleware.ts` solicitado. Next.js 16 muestra una advertencia de obsolescencia para esta convención.
