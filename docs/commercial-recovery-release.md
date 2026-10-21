# Recuperación comercial — checkpoint de liberación

Actualización posterior: [operaciones de viaje, pasajeros, emisión y recibos](travel-operations-release.md). Incluye nuevos resultados y metadatos productivos de solo lectura; este documento conserva el checkpoint de la fase anterior.

Fecha: 20 de octubre de 2026. Rama: `recovery-quotation-booking-invoice`.
Producción no modificada. Sin push, merge, despliegue, migraciones productivas, correos reales ni pagos.

## Resultado y causas corregidas

- Las acciones comerciales estaban poco visibles en el editor, especialmente en móvil. La página de cotización tiene un bloque de ciclo comercial con aceptación y conversión mediante confirmación explícita.
- La aceptación podía congelar borradores sin envío y carecía de auditoría suficiente. Ahora valida el documento enviado, conserva su versión inmutable y registra administrador, fecha y referencia. No representa una firma digital.
- La conversión utilizaba varias escrituras y perdía detalles estructurados. Un RPC transaccional bloquea la cotización, evita duplicados y conserva cliente, agente, servicios, fechas y valores de la versión aceptada.
- Se ofrecen prerreservación y reserva directa. La promoción mantiene separada la confirmación del proveedor; aceptar o pagar no confirma servicios.
- La facturación es manual, transaccional e idempotente. Conserva impuestos y descuentos; distingue depósito solicitado, pagos registrados y saldo. No permite declarar pagada una factura sin pagos suficientes ni sobrescribir una factura finalizada.
- La conversión omitía el apellido requerido por el portal. Ahora lo solicita y conserva. El portal mantiene su acceso OTP por reserva; no se agregan reservas por coincidencia de correo ni se crean cuentas o invitaciones automáticamente.
- PDF de reserva basado en el diseño premium existente, con servicios, estado, pagos y enlace a `https://www.miviatour.com/mi-reserva`. El PDF del cliente usa exclusivamente la reserva de su sesión verificada. Las notas internas no se imprimen.

## Archivos principales

- `src/components/admin/commercial-lifecycle.tsx`, acciones y páginas de `src/app/admin/cotizaciones` y `src/app/admin/reservas`.
- `src/lib/reservation-pdf.ts`, `quotation-pdf.tsx`, `invoice-pdf.tsx`, `invoice-query.ts`, `reservation-data.ts`, `portal-data.ts` y tipos asociados.
- `src/components/reservation-services.tsx`, `src/app/mi-reserva/page.tsx`, rutas PDF de administrador y cliente.
- `docs/sql/commercial_recovery.sql` y `commercial_recovery_preflight.sql`.
- Scripts de validación comercial y pruebas de cotizaciones, V5 y seguridad.

## Evidencia local

| Comprobación | Resultado y alcance |
| --- | --- |
| Typecheck, lint, build de producción | Pasan; build local, sin despliegue. Advertencia existente de convención middleware de Next. |
| Pruebas automatizadas | 137 casos únicos aprobados, 0 fallos: 108 críticos, 28 regresiones y 1 regresión nueva de estado cancelado en PDF. Los 6 casos del archivo de seguridad se repitieron tras ese ajuste. |
| PostgreSQL aislado | 28 comprobaciones aprobadas en PGlite, sobre esquema reconstruido. Incluye reejecución de migración, rollback por fallo, permisos, inmutabilidad, duplicados e integridad financiera. No equivale a verificar Supabase productivo. |
| Navegador | 6 comprobaciones aprobadas: portal desktop/móvil, rechazo de PDF sin sesión, redirección admin y GET del enlace público. Sin errores de página. |
| PDF | 7 muestras anónimas, 11 páginas inspeccionadas visualmente: vuelo, hotel, ferry, combinado y 3 facturas. Letter, sin solapamientos ni recortes observados; enlaces del portal presentes en las 4 reservas. Muestra financiera: total 1,150 USD, depósito solicitado 500, recibido 200, saldo 950. |
| Seguridad | Pruebas de sesión inválida, acceso cruzado A/B, alcance de factura y permisos admin mediante dobles de prueba; permisos RPC probados en PostgreSQL aislado. |

Evidencias en `output/commercial-*.log`, `output/commercial-browser.json` y `output/pdf/commercial-recovery/inspection.json`. PDFs y vistas rasterizadas en `output/pdf/commercial-recovery/`.

## Bloqueos y límites

1. El propietario confirmó: **no hay entorno aislado**. No se ejecutó el recorrido autenticado completo con cuentas reales de administrador y dos clientes, OTP real de pruebas, RLS/Storage de Supabase ni envío controlado. Es un bloqueo de validación, no una aprobación implícita para usar producción.
2. La consulta previa de metadatos productivos fue solo de lectura: encontró columnas V5/facturación/OTP y ausencia de las nuevas columnas de recuperación. No verificó restricciones, triggers, funciones ni políticas reales. Revisar el preflight completo antes de migrar.
3. Cotizaciones históricas enviadas sin `sent_version_id` requieren revisión y referencia explícita del administrador. Las ya aceptadas con versión histórica pueden adoptarse sin cambiar términos ni retrofechar aceptación. No hacer backfill inferido desde borradores.
4. Reservas antiguas sin snapshot aceptado verificable no pueden generar este PDF; la ruta falla de forma segura. Requieren conciliación manual antes de usar el nuevo documento.
5. La instalación auxiliar de herramientas de prueba cambió versiones locales compatibles en `node_modules` sin modificar manifiesto ni lockfile (por ejemplo Supabase JS local 2.118.0 frente a lock 2.116.0). Debe repetirse la validación con `npm ci` en un checkout limpio antes de liberar. No se presenta este build como reproducción exacta del lockfile.
6. Existen cambios ajenos previos en el árbol de trabajo; se conservaron. `git diff --check` global detecta espacios preexistentes en `messages/en.json` y `messages/es.json`. No incluir cambios ajenos sin revisión.

## Procedimiento de liberación posterior — requiere autorización

1. Revisar el diff de recuperación y separar cambios ajenos en un checkout de liberación. No publicar el directorio `output` indiscriminadamente. Conservar evidencias y respaldo de los cambios locales.
2. Crear un proyecto Supabase de pruebas con datos anónimos y configuración de correo de pruebas. Ejecutar `npm ci` desde el lockfile y preparar administrador y clientes A/B sin enviar correos a clientes reales.
3. Ejecutar `docs/sql/commercial_recovery_preflight.sql` en ese entorno. Revisar esquema, duplicados, versiones aceptadas ausentes, funciones, índices y políticas. Confirmar dependencias históricas: `quotations_v5.sql`, `invoices_v5.sql`, `quotations_v6.sql`, OTP y políticas de documentos. Aplicar solo dependencias ausentes después de revisar sus preflights; no repetir ciegamente todo el historial SQL.
4. Aplicar `commercial_recovery.sql` en pruebas. Confirmar las columnas, índice `invoices_commercial_active_unique`, guards y RPC `accept_quotation`, `convert_accepted_quotation`, `create_reservation_invoice`, `save_reservation_record`; confirmar ejecución restringida y `is_admin()` correcto.
5. Ejecutar `node scripts/test-commercial-recovery.mjs`, las suites comerciales, `npm run typecheck`, `npm run lint`, `npm run build`, generación e inspección PDF. Las herramientas auxiliares PGlite/pdfjs/canvas son requisitos de QA, no nuevas dependencias productivas declaradas.
6. En navegador autenticado completar ambas conversiones, promoción, factura manual y descarga. Verificar cada servicio, cliente/agente, totales y pagos; probar dobles clics, datos obsoletos y errores. Con clientes A/B verificar OTP, visibilidad y rechazo cruzado de detalles/documentos, sesión expirada y enlaces de PDF. Validar desktop y móvil.
7. Obtener autorización explícita de producción. Guardar backup recuperable y definiciones de funciones/triggers previas. Ejecutar y revisar el preflight real en solo lectura; detenerse ante discrepancias o duplicados no conciliados. Coordinar ventana y limitar escrituras administrativas durante migración.
8. Aplicar únicamente la migración aprobada dentro de su transacción; verificar objetos/permisos antes de desplegar la aplicación aprobada. Recargar caché de esquema PostgREST si fuese necesario. Validar con un registro de QA explícitamente autorizado, nunca con el cliente esperando sin permiso.
9. Monitorizar errores RPC/PDF/portal y conciliación de totales. Cualquier correo, factura real, pago o reserva de proveedor requiere su autorización correspondiente.

## Reversión

Si la migración falla antes del commit, PostgreSQL revierte su transacción. Después del commit, preferir corrección aditiva. No eliminar columnas, snapshots, historial ni facturas creadas. Ante fallo de aplicación, suspender nuevas operaciones comerciales y volver al artefacto anterior solo después de comprobar compatibilidad con los guards nuevos; el código anterior puede intentar escrituras que ahora se rechazan. Restaurar funciones/triggers exige revisar el respaldo y autorización del propietario. No existe una reversión destructiva automática segura después de nuevas operaciones.

## Decisión

**GO para revisión y validación en staging. NO-GO para producción y para declarar aceptación integral completada** hasta resolver el entorno aislado, validar el recorrido autenticado, reproducir pruebas con el lockfile y aprobar el preflight y la liberación. Todo el trabajo y las evidencias permanecen locales.
