# Operaciones de viaje — cierre local

20 de octubre de 2026. Rama `recovery-quotation-booking-invoice`.
Producción sin cambios de aplicación ni datos. Sin push, merge, despliegue, correos reales, pagos ni reservas externas.

## Alcance anterior y nuevo

La recuperación anterior incorporó aceptación administrativa de versiones enviadas, snapshots inmutables, conversión atómica a prerreservación/reserva, promoción, factura manual y documentos protegidos. Se conserva su reporte en `commercial-recovery-release.md` y el diseño de cotizaciones.

Esta fase agrega:

- Captura de pasajeros durante la conversión y expediente editable en la reserva: nombres legales, categorías, nacimiento, nacionalidad, documentos condicionales, contactos y asistencia. Borrador/revisión, validación de fechas, múltiples pasajeros y eliminación explícita de datos privados activos.
- Cifrado AES-256-GCM con contexto de reserva/cotización. La proyección pública excluye documentos, nacimiento, contactos privados y notas. Autorización administrativa y control de revisión concurrente.
- Gestión separada de proveedor y emisión, referencias PNR, boletos por pasajero/aerolínea/tramos y auditoría. Emitir exige evidencia registrada y confirmación; no se crean boletos reales. El estado se selecciona y confirma al guardar el expediente. La estimación de 24–48 horas solo aparece con aprobación explícita del administrador.
- Itinerario Letter independiente del PDF comercial, sin total del cliente, con pasajeros, vuelos, conexiones, zonas horarias, equipaje, hoteles, ferry y servicios adicionales. Se corrigió la omisión de traslados/tours/equipaje de componentes combinados. Tipografía de aerolínea como alternativa a logos sin autorización.
- Portal con expediente revisado, estados, pasajeros, timeline de vuelos y descargas protegidas. Las rutas del cliente usan exclusivamente la reserva de su sesión; no se vinculan clientes por correo compartido.
- Recibo distinto de factura, basado exclusivamente en pago registrado, con número único y snapshot inmutable. Depósito solicitado no cuenta como pago. Pago con recibo no se puede alterar silenciosamente.
- Preparación/envío administrativo de itinerario y recibo mediante Resend, desactivado por defecto. Confirmación explícita, destinatario validado, adjunto PDF, registro persistente e idempotencia. Itinerarios aéreos adjuntan ICS con eventos estables, revisión y cancelación. No se enviaron correos reales.

## Evidencia y límites

| Verificación | Resultado |
| --- | --- |
| Suite comercial, cotizaciones, portal y operaciones | 165 casos aprobados, 0 fallos; incluye 28 nuevos. |
| PostgreSQL aislado | 48 comprobaciones aprobadas: 28 comerciales y 20 nuevas. PGlite ejecuta SQL real contra un esquema reconstruido; no equivale a Supabase autenticado. |
| Navegador | 7 comprobaciones: 3 rechazos HTTP reales sin sesión y 4 vistas SSR con datos anónimos desktop/móvil. Las vistas no son integración autenticada. |
| PDF nuevo | 9 documentos, 26 páginas Letter renderizadas e inspeccionadas; incluye conexiones, 18 pasajeros, emisión pendiente, hotel, ferry, combinado y recibo. Sin identificadores privados ni precios del cliente en itinerario. Tarifas de equipaje conservadas cuando corresponden. |
| Documentos previos | 7 muestras comerciales/11 páginas revisadas en la fase anterior; no contabilizadas como nuevas. |
| Typecheck, lint, build | Aprobados, salida 0. Registros finales `output/travel-typecheck.log`, `travel-lint.log`, `travel-build.log`. |

Evidencia: `output/travel-all-tests.log`, `travel-final-tests.log`, `travel-sql.log`, `travel-browser.json`, `output/pdf/travel-operations/inspection.json` y vistas rasterizadas. Las pruebas de proveedor de correo usan dobles; aceptación del proveedor no significa entrega al destinatario. No hay webhook de entrega ni reconciliación/reintento automático de resultados inciertos. ICS validado estructuralmente; importación real en Gmail/Outlook/Apple pendiente.

No se activó FlightReservation de Gmail: requiere elegibilidad del remitente y datos verificables; no garantiza reconocimiento automático. Referencias: [registro de remitentes de Google](https://developers.google.com/workspace/gmail/markup/registering-with-google), [FlightReservation](https://developers.google.com/workspace/gmail/markup/reference/flight-reservation). ICS permite importación manual.

## Producción: inspección exclusivamente de lectura

Identidad comprobada: `akbqbbwolsnzybojzbiy`, host Supabase correspondiente y referencia CLI enlazada. `travel_readonly_metadata.sql` usa `BEGIN READ ONLY`: columnas, restricciones, índices, RLS, políticas, triggers, permisos y agregados; no pasajeros ni datos privados de clientes.

- Base V5, versiones de cotización, facturación y OTP presentes; triggers de inmutabilidad presentes.
- Faltan columnas/RPC/guards de recuperación comercial y todas las tablas nuevas de operaciones/recibos/envíos.
- RLS habilitado en tablas comerciales inspeccionadas; políticas administrativas existentes. Esto no demuestra autorización de extremo a extremo de los objetos nuevos.
- `portal-docs` y sus políticas administrativas no existen; revisar `portal_docs_bucket.sql` y `portal_docs_admin.sql`.
- Agregado: **1 cotización aceptada sin versión**, 0 reservas duplicadas por cotización, 0 facturas activas duplicadas. Conciliar documentalmente; nunca inferir aceptación desde un borrador ni retrofecharla.
- No se confirmó un historial administrado de migraciones. Inventario observado: buckets review-photos, blog-images y quotation-media.

Resultados locales: `output/travel-production-metadata.json` y `travel-schema-readonly.log`. No publicar estos archivos indiscriminadamente.

## Bloqueos y funciones pendientes

El propietario confirmó que no existe staging. Continúan bloqueados el recorrido con administrador y clientes A/B reales de pruebas, OTP, RLS/Storage completo, proveedor de correo y adjuntos recibidos. No se usó producción como entorno de pruebas.

No se implementaron promociones/TikTok, fotografías de destino nuevas ni incentivos; faltan contenido y configuración aprobados. Se conservaron los contactos existentes. La línea histórica administrativa muestra revisiones operativas; no es una reconstrucción integral de cada evento histórico comercial. Los adjuntos externos continúan sujetos al almacenamiento existente y su migración pendiente.

La instalación local conserva la discrepancia previa entre algunas dependencias instaladas y lockfile. No se reinstalaron dependencias ni se modificó el manifiesto en esta fase. Reproducir `npm ci` en checkout limpio antes de liberar. Cambios ajenos anteriores siguen preservados.

## Migraciones y liberación controlada

1. Revisar/separar el diff y preparar checkout de liberación; excluir secretos y artefactos QA. Crear staging y cuentas administrativas/clientes A/B con datos anónimos.
2. Ejecutar `npm ci`, revisar dependencias V5/V6/OTP y correr `commercial_recovery_preflight.sql`. Resolver la cotización histórica sin versión con evidencia y autorización. No aplicar todos los SQL históricos ciegamente.
3. En staging, aplicar en orden `commercial_recovery.sql`, `travel_operations.sql`, `travel_documents.sql`. Revisar y aplicar únicamente las dependencias de Storage ausentes (`portal_docs_bucket.sql`, `portal_docs_admin.sql`). Son migraciones aditivas; revisar cambios de funciones/guards contra el esquema real.
4. Configurar `TRAVEL_DATA_KEY`: 32 bytes aleatorios representados por 64 caracteres hexadecimales, únicamente servidor/gestor de secretos. Respaldar la clave de forma segura; no regenerarla al desplegar. Clave ausente o incorrecta bloquea acceso privado. Mantener `TRAVEL_EMAIL_ENABLED` desactivado. Verificar remitente aprobado y RESEND_API_KEY solo en entorno autorizado.
5. Ejecutar typecheck, lint, build, suite de 165 casos, `node scripts/test-travel-operations.mjs`, scripts de PDF y navegador. Validar ambas conversiones, promoción, edición concurrente, confirmación/emisión, factura/pago/recibo con datos sintéticos y fallos transaccionales.
6. Completar autenticación real de staging, acceso A/B, expiración de sesión/URLs, descarga PDF/ICS, móvil y adjuntos. Habilitar envíos solo a destinatarios de prueba autorizados; probar éxito, fallo y resultado incierto. Revisar snapshots/versiones y no duplicación antes de habilitar correo real.
7. Obtener autorización separada del propietario. Tomar backup recuperable, guardar definiciones previas de funciones/triggers y verificar restauración. Repetir preflight de solo lectura, aprobar migraciones exactas y coordinar ventana de escrituras administrativas.
8. Solo después de autorización: aplicar migraciones revisadas, verificar permisos/objetos y caché PostgREST; desplegar artefacto aprobado. Realizar smoke test con registros explícitamente autorizados. Monitorizar RPC, PDF, OTP y resultados de envío.

Retención: acordar plazo operativo antes de uso real. El control de eliminación borra datos privados del expediente activo, no nombres necesarios para historial, recibos ni backups. Aplicar política separada de retención a backups/logs del proveedor. No se programó eliminación masiva sin decisión del propietario. Rotación de clave requiere re-cifrado controlado y verificado; no hay rotación automática.

Rollback: fallo antes del commit revierte cada migración transaccional. Después de nuevas operaciones, suspender escrituras/envíos y preferir corrección aditiva. No eliminar tablas, snapshots, recibos o historial. Revertir aplicación solo tras comprobar compatibilidad con guards nuevos; restaurar funciones anteriores requiere respaldo y autorización. No existe rollback destructivo automático seguro.

## Decisión

**GO para revisión local y staging. NO-GO para producción y para declarar aceptación integral completada**, hasta resolver staging autenticado, dependencias/migraciones, clave de cifrado, conciliación histórica y validación reproducible. Todas las acciones productivas quedan pendientes de autorización separada.
