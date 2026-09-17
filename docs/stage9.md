# Etapa 9

Nosotros conserva literalmente el texto aprobado. Contacto usa `/api/leads` con `servicio=contacto`; nombre y mensaje se guardan en `nombre`/`notas`, y email/teléfono permanecen en `payload.formData`, sin requerir nuevas columnas. Tras guardar, ofrece continuar por WhatsApp. Si falla la captura, conserva el formulario y no permite continuar como si hubiera guardado.

FAQ pública: `/preguntas-frecuentes`; administración: `/admin/faq`. Lectura mediante anon key y RLS, publicado=true y orden/id. Escrituras mediante el cliente de sesión y `requireAdmin`/`is_admin()`, sin service role. La tabla existente `public.faqs` debe tener políticas de lectura pública de publicados y escritura exclusiva de administradores. No se crean ni se modifican semillas.

Los cuatro legales usan `src/lib/legal-content.ts` y `src/components/legal-page.tsx`: marcadores explícitos, noindex y fuera del sitemap. Reemplazar las secciones por documentos revisados antes del lanzamiento. Contacto, estados funcionales, aviso de FAQ y consentimiento son borradores marcados; no se añaden contactos o políticas inventados.

Consentimiento: `ConsentProvider`, `useCookieConsent()` y `ConsentGate` en `src/components/cookie-consent.tsx`. `canTrack` es falso antes de hidratar, sin elección o tras rechazar. Al aceptar, pasa a verdadero; localStorage `viatour-consent-v1` persiste y sincroniza entre pestañas. La página de cookies permite cambiar la elección. En etapa 10 montar scripts solo dentro de `ConsentGate` o comprobar `canTrack` antes de cargarlos; no importar seguimiento con efectos al nivel del módulo. La revocación debe detener también cualquier SDK ya inicializado. No hay seguimiento en esta etapa.

Limitación heredada: `/api/leads` aún tiene el TODO de notificación email; no se inventó una dirección ni se configuró un proveedor en esta etapa.

Verificación automatizada: build, lint, typecheck; `node --test tests/stage9.test.mjs tests/admin.test.mjs tests/leads.test.mjs tests/blog.test.mjs tests/reviews.test.mjs`; servidor activo y `node tests/stage9-smoke.mjs`. Las mutaciones se prueban con cliente simulado; el smoke lee Supabase real sin crear leads ni contenido ficticio.

Verificación manual: enviar una solicitud real desde Contacto y revisar su payload en Leads; crear/editar/publicar/despublicar/eliminar una FAQ con una cuenta administradora y comprobar la página pública; revisar el diálogo de eliminación, teclado y pantalla móvil; aceptar/rechazar cookies, recargar y cambiar la elección en Cookies. Aprobar los borradores y reemplazar legales antes de lanzar.

La herramienta de navegador no tenía un navegador conectado durante esta sesión; la revisión visual y de teclado queda pendiente. Persistencia y estado de consentimiento se verificaron con pruebas de almacenamiento simulado.
