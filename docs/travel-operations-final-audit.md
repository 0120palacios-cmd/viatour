# ViaTour — auditoría final de requisitos y liberación

Fecha: 20 de octubre de 2026. Rama comprobada: `recovery-quotation-booking-invoice`.

**Dictamen: NO-GO para producción y para declarar el alcance completo.** Hay implementación local sustancial, pero faltan funciones solicitadas y la integración autenticada no está verificada. No se confunde existencia de código, prueba con dobles, SQL reconstruido o capturas de componentes con aceptación del recorrido real.

Se preservaron todos los cambios anteriores. No hubo push, merge, despliegue, migración productiva, reparación de datos, correos reales, pagos ni reservas externas. La inspección productiva fue exclusivamente de metadatos y agregados en transacción READ ONLY.

## A. Criterios y matriz de trazabilidad

Estados utilizados literalmente:

- **IMPLEMENTED AND VERIFIED**: comprobado dentro del alcance local concreto indicado; no implica producción.
- **IMPLEMENTED BUT NOT FULLY TESTED**: código conectado y evidencia parcial; falta integración real.
- **PARTIALLY IMPLEMENTED**: falta parte funcional o UX del requisito.
- **MISSING**: no está implementado en la experiencia solicitada.
- **BLOCKED**: no se pudo verificar por infraestructura o autorización; no presupone funcionamiento.

Rutas y archivos de evidencia (relativos a la raíz del repositorio):

| Código | Implementación exacta / ruta |
| --- | --- |
| Q | `/admin/cotizaciones/[id]`; `src/app/admin/cotizaciones/[id]/page.tsx`, `src/components/admin/commercial-lifecycle.tsx`, `src/app/admin/cotizaciones/actions.ts` |
| R | `/admin/reservas/[id]`; `src/app/admin/reservas/[id]/page.tsx`, `src/app/admin/reservas/actions.ts`, `src/components/admin/reservation-builder.tsx`, `src/components/admin/reservation-actions.tsx` |
| P | `src/components/admin/conversion-passengers.tsx`, `src/components/admin/travel-editor.tsx`, `src/app/admin/reservas/travel-actions.ts`, `src/lib/travel-operations.ts`, `src/lib/travel-data.ts`, `src/lib/travel-vault.ts` |
| C | `/mi-reserva`; `src/app/mi-reserva/page.tsx`, `src/components/travel-summary.tsx`, `src/components/reservation-services.tsx`, `src/components/flight-timeline.tsx`, `src/lib/travel-services.ts` |
| AUTH | `src/app/mi-reserva/actions.ts`, `src/lib/portal.ts`, `src/lib/portal-data.ts`, `src/lib/portal-documents.ts`; `/api/mi-reserva/documentos` |
| IT | `src/lib/itinerary-pdf.tsx`, `src/lib/travel-download.ts`; `/api/admin/reservas/[id]/itinerario`, `/api/mi-reserva/itinerario` y variante `?format=ics` |
| FIN | `src/lib/invoice-pdf.tsx`, `src/lib/receipt-pdf.tsx`, `src/lib/receipt-data.ts`, `src/components/admin/receipt-action.tsx`; `/admin/facturacion/[id]`, `/api/admin/recibos/[id]`, `/api/mi-reserva/recibos/[id]`, `/api/mi-reserva/facturas/[id]/pdf` |
| MAIL | `src/app/admin/reservas/send-itinerary.ts`, `send-receipt.ts`; `src/components/admin/send-itinerary.tsx`, `send-receipt.tsx`; `src/lib/travel-email.ts`, `src/lib/travel-calendar.ts` |
| DB | `docs/sql/commercial_recovery.sql`, `travel_operations.sql`, `travel_documents.sql`; preflight `commercial_recovery_preflight.sql` |

Pruebas exactas usadas en las matrices:

| Código | Prueba / alcance |
| --- | --- |
| TQ | `tests/quotation-actions.test.mjs`, `quotation-routes.test.mjs`, `release-v5.test.mjs`: evidencia anterior, no repetida íntegramente en esta auditoría |
| TS | `scripts/test-travel-operations.mjs`, `scripts/test-commercial-recovery.mjs`, `scripts/test-travel-sql-cases.mjs`: repetidos, 48 verificaciones PostgreSQL reconstruido |
| TP | `tests/travel-operations.test.mjs`: validación, cifrado, proyección, calendario, correo, rutas con dobles |
| TM | `tests/travel-delivery.test.mjs`: payload/Resend simulado, fallos, duplicación, rutas de recibos |
| TA | `tests/commercial-security.test.mjs`, `portal-hardening.test.mjs`, `portal-documents.test.mjs`: límites de sesión/documentos con dobles |
| TF | `tests/travel-final-audit.test.mjs`: nuevas regresiones de fechas de pagos |
| B1 | `scripts/check-commercial-browser.mjs`: página real de acceso, foco, desktop/móvil, rechazo sin sesión, redirección administrativa y GET público |
| B2 | `scripts/render-travel-portal-fixture.mjs`, `scripts/check-travel-browser.mjs`: 3 rechazos HTTP reales y 4 capturas SSR de componentes con datos anónimos; NO página autenticada completa |
| PDF | `scripts/render-final-audit-quotation.mjs`, `scripts/inspect-commercial-pdfs.mjs`, `scripts/inspect-travel-pdfs.mjs`; aplicaciones renderizadas, no capturas de diseño |

### B. Administración: cada acción solicitada

| Requisito | Estado | Evidencia | Trabajo pendiente / límite |
| --- | --- | --- | --- |
| Abrir cotización y encontrar Marcar como aceptada | IMPLEMENTED BUT NOT FULLY TESTED | Q; TQ/TS; B1 solo comprueba rechazo sin sesión | Validar botón, modal y navegación con admin autenticado en 390/1440 px |
| Aceptar solo versión enviada, confirmar cliente/total/versión y registrar actor/fecha | IMPLEMENTED BUT NOT FULLY TESTED | Q + DB `accept_quotation`; TS | No ejecutar contra el cliente real; reconciliar registro histórico sin versión |
| Inmutabilidad y enmienda sin alterar original | IMPLEMENTED BUT NOT FULLY TESTED | Q, `quotation_versions`, guards DB; TQ/TS | Recorrido de enmienda y PDF enviado autenticado pendiente |
| Crear prerreservación | IMPLEMENTED BUT NOT FULLY TESTED | Q/R/P; TS conversión y rollback | Validar formulario y persistencia con sesión real |
| Convertir directamente en reserva | IMPLEMENTED BUT NOT FULLY TESTED | Q/R; TS | Igual; no equivale a reserva del proveedor |
| Promover prerreservación | IMPLEMENTED BUT NOT FULLY TESTED | `PromoteReservationForm` en Q, acción R; TS | Probar UI, permisos y refresco real |
| Conversión atómica e idempotente, cliente/agente/versión exactos | IMPLEMENTED BUT NOT FULLY TESTED | DB `convert_accepted_quotation`, `convert_quotation_with_passengers`; TS | SQL probado en esquema reconstruido, no servidor Supabase real |
| Buscar/filtrar/abrir reservas | IMPLEMENTED BUT NOT FULLY TESTED | `src/app/admin/reservas/page.tsx`, R | No se probó lista con datos y sesión administrativa |
| Añadir/editar/quitar múltiples pasajeros | IMPLEMENTED BUT NOT FULLY TESTED | P; TP/TS | No se interactuó con formulario hidratado conectado a staging |
| Nombres legales, nacimiento, nacionalidad, adultos/niños/infantes | IMPLEMENTED BUT NOT FULLY TESTED | P; TP conserva texto exacto/fechas | Validar cada servicio contra sus requisitos reales; no hay validación de edad por política de aerolínea |
| Pasaporte/identificación/emisor/vencimiento condicionales | IMPLEMENTED BUT NOT FULLY TESTED | P; TP documento faltante/vencido | Selección manual del requisito; no motor de reglas migratorias ni fotografías de pasaporte |
| Contacto/emergencia/asistencia/sexo cuando corresponde | IMPLEMENTED BUT NOT FULLY TESTED | P campos privados | Revisión de minimización, consentimiento y retención operativa pendiente |
| Guardar borrador/revisado, copiar contacto no sensible | IMPLEMENTED BUT NOT FULLY TESTED | P, revisión concurrente DB; TP/TS | Validar recuperación tras errores y edición simultánea en UI |
| Checklist/completitud de pasajeros | PARTIALLY IMPLEMENTED | P muestra nombre completo/pendiente y validación al guardar | No checklist completo por servicio ni conciliación automática con número de pasajeros cotizado |
| PNR y números por pasajero/aerolínea | IMPLEMENTED BUT NOT FULLY TESTED | P; TP/TS | Evidencia declarada por admin, sin validación externa del proveedor; tramos son texto libre |
| Marcar en proceso de emisión | PARTIALLY IMPLEMENTED | P selector `en_emision`, confirmación al guardar; TP/TS | Funcionalidad por selector; falta el botón contextual específico solicitado con ese texto |
| Configurar plazo estimado | PARTIALLY IMPLEMENTED | P checkbox `estimateApproved`; C/B2 | Solo activa/desactiva 24–48 h; no permite configurar otros intervalos |
| Registrar confirmación real del proveedor | IMPLEMENTED BUT NOT FULLY TESTED | R estado/referencia + P fecha; TS guards | No verificación automática del PNR; requiere evidencia humana auténtica |
| Emitida solo con evidencia | IMPLEMENTED BUT NOT FULLY TESTED | P + DB guards, TP/TS | Validación de contenido mínimo, no autenticidad externa del boleto |
| Separar agencia/proveedor/pago/emisión | IMPLEMENTED BUT NOT FULLY TESTED | R/P/C/IT, DB | Validar combinaciones históricas; no estado de proveedor por cada servicio individual |
| Generar y descargar itinerario | IMPLEMENTED BUT NOT FULLY TESTED | IT/PDF, B2 sin sesión | PDF real verificado; descarga autenticada pendiente |
| Previsualizar itinerario dentro del admin | PARTIALLY IMPLEMENTED | IT descarga `attachment` | No visor/preview embebido ni variante inline conectada al control |
| Enviar itinerario | IMPLEMENTED BUT NOT FULLY TESTED | MAIL/TM; gate por entorno | Proveedor real y recepción no probados; ver F |
| Factura manual, sin creación automática | IMPLEMENTED BUT NOT FULLY TESTED | R/FIN/DB; TS | Validar pantalla de factura y cliente en staging |
| Registrar pagos administrativos | PARTIALLY IMPLEMENTED | R `recordPayment`, `PaymentForm`; TF | Corregidas fechas inválidas/futuras; falta idempotencia persistente de registro de pago contra reintento de solicitud. No procesa tarjetas |
| Generar recibo de pago registrado | IMPLEMENTED BUT NOT FULLY TESTED | FIN/P/DB; TS/PDF | Idempotencia del recibo sí probada; generación real autenticada pendiente |
| Historial de reserva/documentos/envíos | PARTIALLY IMPLEMENTED | R revisiones `reservation_travel_history`, `travel_deliveries` | No timeline unificado aceptación→pre→reserva→proveedor→emisión→entrega; no visor de versiones enviadas |
| Navegación completa desktop/móvil del dashboard | BLOCKED | B1 redirección, revisión de R/Q | Sin staging/admin de prueba; no se presenta la lectura de código como UI operada |
| Resto del dashboard administrativo | BLOCKED | Alcance revisado: cotizaciones, reservas y enlaces financieros | No hay auditoría visual autenticada de cada sección ajena al ciclo; no afirmar “dashboard entero verificado” |

### C. Portal del cliente

| Requisito | Estado | Evidencia | Trabajo pendiente / límite |
| --- | --- | --- | --- |
| Reserva correcta y acceso OTP/sesión | IMPLEMENTED BUT NOT FULLY TESTED | C/AUTH; TA/TP/B1 | Portal por reserva verificada, no cuenta con listado de todas las reservas. OTP real de prueba pendiente |
| Hero de destino atractivo | PARTIALLY IMPLEMENTED | C título/fechas/cuenta regresiva | No hero fotográfico premium. El encabezado del fixture B2 no es el encabezado real de C |
| Fotografías autorizadas de destino | MISSING | C no incorpora imágenes de destino | Incorporar catálogo autorizado; no inventar ni usar fotos arbitrarias |
| Itinerario completo vuelos/hotel/ferry/traslados | IMPLEMENTED BUT NOT FULLY TESTED | C/`travel-services.ts`; TP/B2/PDF | Componentes y expansión verificados; página completa autenticada pendiente |
| Pasajeros y categorías | IMPLEMENTED BUT NOT FULLY TESTED | C `TravelSummary` solo revisados; TP/B2 | Falta detectar discrepancia entre viajeros del expediente y conteos del paquete |
| Confirmación de proveedor | IMPLEMENTED BUT NOT FULLY TESTED | C campo `supplier_status` | Validar datos históricos y cada proveedor; no verificación independiente |
| Estado de emisión | IMPLEMENTED BUT NOT FULLY TESTED | C; B2 pendiente/emitida | Estado probado en fixture, no consulta real autenticada |
| Mensaje 24–48 horas solo aprobado | IMPLEMENTED BUT NOT FULLY TESTED | C/P, B2 | Checkbox fijo; no promesa ni SLA del proveedor |
| PNR y boletos genuinos | IMPLEMENTED BUT NOT FULLY TESTED | C/P; TP/TS | Solo muestra registros administrativos; muestras QA no demuestran autenticidad de boletos reales |
| Descargas seguras PDF/ICS/recibos/facturas | IMPLEMENTED BUT NOT FULLY TESTED | IT/FIN/AUTH; TA/TP/TM/B1/B2 | Rechazo sin sesión real verificado; A/B con dobles, falta Supabase A/B real |
| Contactar ViaTour/WhatsApp/soporte | IMPLEMENTED BUT NOT FULLY TESTED | C, `site-config.ts`, `TicketPanel`; B1 enlace visible | No enviar solicitudes reales ni probar soporte con producción |
| Reseñas y feedback dentro del portal | MISSING | C no incluye módulo; existen `/opiniones`, `/opiniones/nueva` fuera del portal | Integrar opt-in y elegibilidad postviaje; páginas externas no satisfacen módulo solicitado |
| Promociones dentro del portal | MISSING | C | Requiere contenido/configuración aprobados; no ofrecer recompensas inventadas |
| TikTok: compartir video/etiquetar ViaTour | MISSING | `site-config.ts` tiene URL social, C no módulo | Enlace del footer no es campaña configurable ni invitación opt-in |
| Redes sociales | PARTIALLY IMPLEMENTED | Footer global y configuración social | No sección de participación postviaje |
| Mobile responsive | PARTIALLY IMPLEMENTED | B1 acceso real 390/1440, B2 componentes 390/1440 | Sin desbordamiento observado allí; falta página autenticada completa, formularios admin y errores |
| Accesibilidad | PARTIALLY IMPLEMENTED | B1 foco visible; etiquetas/headings inspeccionados | No auditoría WCAG completa, lector de pantalla, contraste automatizado ni navegación de modales autenticados |
| A no accede a B | IMPLEMENTED BUT NOT FULLY TESTED | TA/TP/TM scopes y cookie | Pruebas con dobles; integración real A/B sigue BLOCKED |
| Portal visualmente completo/premium | PARTIALLY IMPLEMENTED | Capturas B1/B2 inspeccionadas | No se declara completitud visual: faltan imágenes/módulos y página real autenticada |

### D. Pasajeros, seguridad y estados

| Requisito | Estado | Evidencia / pendiente |
| --- | --- | --- |
| Cifrado autenticado de datos privados | IMPLEMENTED AND VERIFIED | `travel-vault.ts`, TP: AES-256-GCM, IV aleatorio, contexto de reserva y rechazo de clave ausente/contexto incorrecto. Alcance: función local |
| Clave productiva/rotación/recuperación | BLOCKED | No se leyó ni creó secreto productivo. Falta despliegue seguro, backup de clave y ensayo de restauración; no rotación automatizada |
| No pasaporte/DOB en proyección pública | IMPLEMENTED AND VERIFIED | `publicTravel`, TP y texto PDF: comprobado con datos anónimos |
| RLS/admin y writes por RPC | IMPLEMENTED BUT NOT FULLY TESTED | DB/TS; falta migración y autenticación Supabase de objetos nuevos |
| Retención y eliminación | PARTIALLY IMPLEMENTED | `purge-travel.tsx`, `purgePrivateTravel`, TS; borra privado activo, no backups. Falta plazo aprobado/rotación/política de restauración |
| Estados prerreserva/pendiente/confirmada/cancelada/completada | IMPLEMENTED BUT NOT FULLY TESTED | R/DB, TS; estados de agencia existentes |
| Estado documentación enviada/entregada | PARTIALLY IMPLEMENTED | Registro aceptado/fallido/incierto; no confirmación de entrega ni estado unificado |
| Adjuntos de confirmación | IMPLEMENTED BUT NOT FULLY TESTED | `src/components/admin/reservation-documents.tsx`, AUTH | Depende de bucket privado ausente; no asociaciones por boleto/tramo |
| Exactitud legal de nombres/documentos | IMPLEMENTED BUT NOT FULLY TESTED | P conserva strings, TP | No corrige nombres; revisión humana indispensable y prueba UI pendiente |

### E. Cuatro documentos distintos y calidad visual

| Requisito | Estado | Evidencia / pendiente |
| --- | --- | --- |
| Cotización comercial premium preservada | IMPLEMENTED AND VERIFIED | `src/lib/quotation-pdf.tsx`; nueva muestra `output/pdf/final-audit/quotation.pdf` de 1 página Letter inspeccionada. No se modificó renderer en esta auditoría |
| Itinerario con diseño propio, sin total comercial | IMPLEMENTED AND VERIFIED | IT; diseño de encabezado negro/timeline/tarjetas distinto del presupuesto. PDF revisado; conserva costos de equipaje informados, no total del cliente |
| Factura: servicios/cargos/impuestos/descuentos/saldo | IMPLEMENTED AND VERIFIED | FIN/PDF sobre muestras: total 1,150 USD, anticipo solicitado 500, recibido 200, saldo 950; propósito y valores visualmente distintos del recibo |
| Recibo: pago recibido y saldo al emitir | IMPLEMENTED AND VERIFIED | FIN/PDF: recibido 200 USD y saldo 950, método/referencia/fecha. No sustituye factura |
| Letter, tipografía, marca y saltos | IMPLEMENTED AND VERIFIED | Inspectores PDF verifican 612×792 puntos; muestra visual de cada propósito, continuaciones existentes. Alcance muestras, no toda entrada posible |
| Nombres/fechas/zonas/vuelos/PNR/boletos | IMPLEMENTED BUT NOT FULLY TESTED | IT/PDF/TP; datos sintéticos preservados, no cotejo con proveedor real |
| Logos de aerolíneas autorizados | PARTIALLY IMPLEMENTED | Fallback tipográfico implementado; no catálogo licenciado ni logos añadidos |
| Hotel/ferry/paquete/conexiones/muchos pasajeros | IMPLEMENTED BUT NOT FULLY TESTED | PDF/TP: 9 muestras operativas, 26 páginas; falta casos reales autenticados |
| URL segura de portal | IMPLEMENTED AND VERIFIED | `https://www.miviatour.com/mi-reserva`, B1 GET 200 y anotaciones PDF; requiere referencia/apellido/OTP, no acceso por ID en URL |
| Retorno automático a una reserva después del login | PARTIALLY IMPLEMENTED | Acceso existente por referencia/OTP, sin destino profundo individual en enlace PDF |
| Sin notas privadas/passaporte/DOB/costos internos | IMPLEMENTED AND VERIFIED | TP/PDF sobre muestras; no garantías sobre contenido que un admin pegue manualmente en campos públicos |

Revisión visual independiente en esta auditoría: cotización, primera página de itinerario aéreo, factura con saldo y recibo. Los inspectores volvieron a rasterizar y comprobar las 37 páginas de los 16 documentos anteriores; **no se afirma nueva inspección visual humana de las 37 páginas**. La revisión anterior de las 26 páginas operativas sigue como evidencia histórica, no nueva. Los cuatro propósitos son reconocibles, importes legibles y sin solapamientos observados en las páginas vistas. Las continuaciones pueden dejar espacio libre; no se fuerza contenido a una sola página.

### F. Correo y calendario

| Requisito | Estado | Evidencia / pendiente |
| --- | --- | --- |
| Acción administrativa y confirmación | IMPLEMENTED BUT NOT FULLY TESTED | MAIL; TM; UI autenticada pendiente |
| Integración Resend/dominio/remitente | IMPLEMENTED BUT NOT FULLY TESTED | MAIL usa API y `siteConfig.supportEmail`; cuenta, DNS/dominio y recepción no verificados |
| Destinatario correcto | IMPLEMENTED BUT NOT FULLY TESTED | Comparación exacta con correo de reserva + validación; TM. No representa consentimiento ni valida titularidad del buzón |
| HTML, nombres y servicios | IMPLEMENTED BUT NOT FULLY TESTED | `travel-email.ts`, escape HTML TP; no prueba de clientes Gmail/Outlook |
| PDF adjunto | IMPLEMENTED BUT NOT FULLY TESTED | TM comprueba payload; renderer real por separado, no recepción del adjunto real |
| ICS, eventos, zonas, IDs, revisión/cancelación | IMPLEMENTED BUT NOT FULLY TESTED | `travel-calendar.ts`, TP UTC/DST/UID/SEQUENCE/CANCELLED/folding |
| Idempotencia de envíos | IMPLEMENTED BUT NOT FULLY TESTED | DB unique revision/receipt + claim previo; TM/TS; no ensayo concurrente con proveedor real |
| Historial de intentos y respuesta del proveedor | IMPLEMENTED BUT NOT FULLY TESTED | MAIL/DB/R; TM guarda aceptado/fallido/incierto |
| Entrega efectiva al cliente | MISSING | No webhook de entrega/rebote; “aceptado” no significa entregado |
| Reintentos/reconciliación operativa | PARTIALLY IMPLEMENTED | Evita duplicados y no reintenta incertidumbre; falta flujo administrativo seguro para reconciliar/reintentar fallos |
| Correo de recibo | IMPLEMENTED BUT NOT FULLY TESTED | `send-receipt.ts`; no prueba específica de recepción/proveedor real; TM cubre rutas de recibo, no su envío completo |
| No datos de pasaporte | IMPLEMENTED AND VERIFIED | TP proyección y email escaping; PDF público sin identificadores privados |
| Gmail reconocimiento automático | BLOCKED | No markup activado ni elegibilidad de remitente verificada. No se promete reconocimiento; falta prueba de importación manual real en calendarios |

No se enviaron mensajes. Los resultados de TM prueban preparación, decisión y manejo de respuestas simuladas, no entrega. La acción de factura existente sigue separada del nuevo gate de itinerario/recibo; revisar política de habilitación conjunta antes de cualquier ensayo de correo.

### G. Facturas, pagos y recibos

La factura copia servicios y valores, se crea manualmente y sus estados están protegidos por guards. El recibo referencia un pago positivo de la moneda correcta, tiene numeración única e impide modificar silenciosamente el pago ya documentado. El saldo del recibo es una foto al emitir, no un saldo vivo. Impuestos/descuentos proceden de partidas aceptadas: no se añadió un motor fiscal ni se fabricaron datos legales.

**Corrección de esta auditoría:** `src/app/admin/reservas/actions.ts::recordPayment` rechazaba montos inválidos pero aceptaba fechas futuras o imposibles a nivel aplicación. Ahora valida día real y fecha máxima de Honduras antes de cualquier lectura/escritura. `tests/travel-final-audit.test.mjs` cubre 30 de febrero y pago futuro. El guard de recibos ya rechazaba fechas futuras; la corrección evita que el saldo se reduzca por un pago futuro capturado mediante esta acción.

Pendiente: la captura de pagos no tiene una clave persistente de idempotencia por solicitud. El botón pendiente reduce doble clic, pero no sustituye una garantía de servidor. No se impuso unicidad de referencia bancaria porque puede ser vacía/reutilizada; requiere diseño explícito y pruebas antes de declarar cobertura completa de reintentos financieros. Directas escrituras administrativas por otras vías no quedan cubiertas por la nueva validación de acción.

## H–I. Seguridad y compatibilidad productiva

Consulta repetida en esta auditoría con CLI enlazada y `--project-ref akbqbbwolsnzybojzbiy`, archivo revisado `docs/sql/travel_readonly_metadata.sql`, transacción `BEGIN READ ONLY`. Evidencia: `output/travel-final-production-metadata.json`; no valores de pasaportes ni filas de clientes.

| Verificación | Estado | Resultado real |
| --- | --- | --- |
| Identidad del proyecto | IMPLEMENTED AND VERIFIED | Referencia explícita y enlace CLI coincidentes con proyecto autorizado |
| Historial actual de migraciones | BLOCKED | `to_regclass('supabase_migrations.schema_migrations')` devolvió null; no se puede afirmar un historial completo aplicado |
| Dependencias V5/versiones/invoices/OTP | IMPLEMENTED BUT NOT FULLY TESTED | Metadatos base presentes; compatibilidad completa requiere preflight y staging |
| Nuevos objetos comerciales y de viaje | MISSING | No presentes en producción; ninguna migración ejecutada |
| RLS base | IMPLEMENTED BUT NOT FULLY TESTED | Metadatos de RLS/políticas presentes; objetos nuevos ausentes y pruebas autenticadas pendientes |
| Private Storage de portal | MISSING | Solo review-photos y blog-images públicos, quotation-media privado. No `portal-docs` |
| Aceptación histórica sin versión | BLOCKED | Conteo repetido: 1. Requiere evidencia y conciliación aprobada; no reparación automática |
| Reservas/facturas duplicadas | IMPLEMENTED AND VERIFIED | Conteos de consulta: 0 por cotización y 0 facturas activas duplicadas en criterio SQL consultado; no prueba de inexistencia de otros tipos de duplicado |
| Privacidad nueva en producción | BLOCKED | Tablas nuevas no existen; no se verificó clave productiva ni políticas desplegadas |
| Backup/recuperación | BLOCKED | No se verificaron backups disponibles ni restauración. Es requisito previo a liberación |

Metadatos no equivalen a restaurar producción en staging. PGlite es PostgreSQL ejecutado localmente con esquema reconstruido; no reproduce Auth, Storage, PostgREST, secretos, roles completos ni infraestructura de Supabase.

## J. Resultados efectivos de esta auditoría

| Gate | Resultado nuevo | Evidencia |
| --- | --- | --- |
| Typecheck | PASS, exit 0 | `output/travel-final-audit-typecheck.log` |
| Lint | PASS, exit 0 | `output/travel-final-audit-lint.log` |
| Production build local | PASS, exit 0 | `output/travel-final-audit-build.log` |
| Pruebas focalizadas | 45 PASS, 0 FAIL | `output/travel-final-audit-tests.log`: TP, TM, TA y 2 TF |
| SQL aislado | 48 PASS, 0 FAIL | `output/travel-final-audit-sql.log`: 28 comerciales + 20 operativas |
| Navegador | 13 checks PASS | `output/travel-browser.json` (7) + `output/commercial-browser.json` (6); 9 HTTP/acceso/redirección y 4 fixtures. No son 13 flujos completos |
| PDF | 16 PDF existentes/37 páginas re-renderizadas y verificadas + 1 nueva cotización/1 página | `output/travel-final-audit-pdf.log`, `output/pdf/final-audit`; visual nuevo de 4 páginas representativas |
| Integración autenticada completa | BLOCKED, no ejecutada | Propietario confirmó ausencia de entorno aislado; no credenciales de prueba |
| Entrega real de email / calendario importado | NOT TESTED | No autorización de envíos, sin buzón de prueba |

Los **165 tests** son evidencia de la ejecución anterior. No se vuelve a presentar esa cifra como una ejecución completa nueva. Se añadieron 2 pruebas (167 casos conocidos en el conjunto anterior más nuevas), de los cuales esta auditoría ejecutó 45 focalizados; no sumar repeticiones como casos nuevos. No hubo fallo pendiente en las ejecuciones finales indicadas. El primer script auxiliar de cotización falló en limpieza de PDF.js después de generar el PDF; se corrigió para destruir el loading task y la repetición terminó exitosa.

Las capturas B2 inicialmente usaban fallback tipográfico por ausencia de la variable de fuente del layout. Se corrigió el fixture para cargar Manrope local y se repitieron los 7 checks; no fue un cambio de diseño productivo. B1 muestra el banner de cookies sobre parte del formulario móvil hasta elegir preferencia; no se probó el flujo OTP tras esa elección. Accesibilidad integral sigue pendiente.

## K. Pendientes y bloqueos priorizados

1. **P0 liberación:** staging con Auth/Storage, admin y clientes A/B; aplicar migraciones allí, configurar clave y validar todo el recorrido. Conciliar la aceptación histórica sin versión; no operar con borrador como sustituto.
2. **P0 integridad:** idempotencia persistente de registro de pagos; cotejar pasajeros reales frente al conteo de servicios y reglas del proveedor; pruebas completas de concurrencia y fallos con Supabase.
3. **P1 operaciones:** botón contextual de emisión, preview inline, navegación administrativa autenticada, historial unificado, reintento/reconciliación de correo, verificación de entrega y pruebas de recepción/importación ICS.
4. **P1 seguridad operacional:** backup y restore, custodia/rotación de clave, retención aprobada, prueba de expiración Storage real. Actualmente TTL de código es 60 segundos; no se midió en el bucket inexistente.
5. **P2 experiencia:** hero e imágenes autorizadas, reseñas opt-in integradas, promociones, TikTok configurable, accesibilidad completa y revisión visual de todas las páginas privadas. No se consideran terminadas por existir enlaces sociales o páginas públicas externas.

## L. Secuencia segura de despliegue posterior

1. Revisar diff y separar trabajo ajeno conservado. Preparar checkout de liberación sin artefactos/secrets; ejecutar `npm ci` y repetir gates. La discrepancia previa node_modules/lockfile sigue sin una reproducción limpia verificada.
2. Crear Supabase staging y buzones/cuentas de prueba; restaurar solo esquema y datos anonimizados. Verificar dependencias V5/V6/OTP, `is_admin()` y configuración de sesiones.
3. Ejecutar `commercial_recovery_preflight.sql` y comparar metadatos. Resolver discrepancias y aceptación histórica mediante proceso aprobado; guardar evidencias, nunca inferir consentimiento.
4. Aplicar en staging, en orden: `docs/sql/commercial_recovery.sql`, `docs/sql/travel_operations.sql`, `docs/sql/travel_documents.sql`; revisar/aplicar dependencias ausentes `docs/sql/portal_docs_bucket.sql` y `docs/sql/portal_docs_admin.sql`. No ejecutar ciegamente historial SQL completo.
5. Configurar `TRAVEL_DATA_KEY` de 32 bytes aleatorios/64 hex en gestor de secretos de servidor. Respaldar clave y datos conjuntamente de forma controlada. Mantener `TRAVEL_EMAIL_ENABLED` desactivado y verificar el resto de rutas de correo existentes.
6. Completar pendientes P0 y recorrido admin → aceptación → pasajeros → ambas conversiones → promoción → proveedor → emisión → PDFs → factura → pago sintético → recibo → portal A/B. Probar manipulación de IDs, sesión expirada, doble clic, reintento y rollback, desktop/móvil/teclado.
7. Con autorización de destinatarios de prueba, verificar dominio/remitente Resend, enviar solo a buzones aislados, recibir PDF/ICS, probar fallo/reconciliación y revisar que “aceptado” no sea “entregado”. Importar ICS en calendarios reales de prueba.
8. Resolver criterios pendientes o acordar explícitamente alcance de lanzamiento reducido; emitir nuevo dictamen. Obtener autorización separada del propietario para producción.
9. Confirmar backup y ensayo de restauración, guardar definiciones de funciones/triggers y artefacto anterior. Repetir preflight productivo READ ONLY; detenerse ante datos no conciliados. Coordinar ventana de escrituras.
10. Solo bajo autorización: aplicar SQL aprobado, verificar permisos/Storage/caché PostgREST y desplegar artefacto aprobado. Smoke test con datos expresamente autorizados, no con el cliente esperando sin permiso. Monitorizar OTP/RPC/documentos/saldos/envíos.

Reversión: cada migración transaccional fallida se revierte antes del commit. Tras crear datos nuevos, suspender escrituras/envíos y preferir fix aditivo; no borrar historial, pagos, recibos ni snapshots. Volver a aplicación anterior solo después de comprobar compatibilidad con guards nuevos. Restaurar funciones o backup requiere aprobación y protección de operaciones posteriores; no hay rollback destructivo automático seguro.

## M. Recomendación

**NO-GO producción; NO-GO “todos los requisitos completos”. GO únicamente para revisión del cambio y validación de staging.** Los documentos y la lógica local tienen evidencia útil, pero faltan integración real, funciones explícitas y validación visual privada. Esta auditoría identifica esos límites en lugar de dar por completo el producto por número de tests.
