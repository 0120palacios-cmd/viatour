# Stage 10 — Portal del cliente

La rama `stage10-portal` añade acceso en dos pasos para `/mi-reserva`. El código y apellido solo crean un reto; el cookie de sesión firmado se emite después de verificar el OTP. El OTP se guarda únicamente como hash, vence a los 10 minutos, se consume una vez y queda bloqueado tras cinco intentos fallidos. La respuesta inicial no confirma si el código y apellido existen.

Antes de habilitar la funcionalidad en un proyecto Supabase, ejecute manualmente, en este orden, los SQL de `docs/sql/portal_otp.sql`, `docs/sql/portal_docs_bucket.sql`, `docs/sql/support_tickets.sql` y `docs/sql/review_photos_privacy.sql`. La aplicación no ejecuta migraciones. Revise además las políticas existentes de `storage.objects` para que ninguna política amplia conceda acceso al bucket `portal-docs` o al bucket privado `review-photos`.

Variables necesarias: `PORTAL_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` y las variables públicas de Supabase. Verifique `miviatour.com` en Resend y mantenga `SUPABASE_SERVICE_ROLE_KEY`, `PORTAL_SECRET` y `RESEND_API_KEY` solo en el servidor.

El portal valida documentos durante la lectura del cuerpo, acepta PDF/JPG/PNG/WebP hasta 8 MB y guarda cada archivo bajo el UUID de la reserva. Las listas y URLs firmadas se generan en el servidor después de validar el cookie; no se usan URLs públicas. Las opiniones aprobadas siguen el mismo patrón con URLs firmadas de cinco minutos.

Verificación local realizada en esta etapa: `npm run lint`, `npm run typecheck`, `npm run build` y las pruebas existentes de Stage 10, opiniones y administración. La verificación contra una reserva real y el envío efectivo por Resend requieren ejecutar los cuatro SQL anteriores y usar un proyecto Supabase de prueba; esos SQL no se ejecutaron.
