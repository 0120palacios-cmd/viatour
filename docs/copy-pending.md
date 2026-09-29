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
