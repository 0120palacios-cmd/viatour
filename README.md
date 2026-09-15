# viatour

Etapa 1: Next.js con TypeScript, Tailwind CSS, Manrope, shadcn/ui (new-york, Neutral) y clientes de Supabase.

## Desarrollo

1. Instale las dependencias con `npm install`.
2. Copie `.env.example` a `.env.local` y configure `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Ejecute `npm run dev`.
4. Abra [la guía temporal](http://localhost:3000/styleguide).

El middleware requiere la URL y la clave pública de Supabase para atender las páginas. Con los valores vacíos, las solicitudes devuelven un error. La clave de servicio se reserva para uso del servidor.

La página principal está vacía. La guía temporal se elimina en la Etapa 2.

## Verificación

- `npm run lint`
- `npm run build`

Se conserva el archivo `src/middleware.ts` solicitado. Next.js 16 muestra una advertencia de obsolescencia para esta convención.
