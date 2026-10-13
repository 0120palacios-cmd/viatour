# Cotizaciones V5: renovación del sistema de cotizaciones (2026-10-12)

Rama `v4-overhaul`, solo local. No se ejecutaron migraciones, no se escribió en Supabase y no se enviaron correos ni mensajes.

**Guía paso a paso para el propietario:** `docs/quotations-v5-rollout-guide.md` (preflight, copia de seguridad, migración, verificación y pruebas con la cuenta de administrador).

## Antes de usarlo en producción
1. Migración (solo el propietario, en Supabase → SQL Editor, en este orden):
   1. `docs/sql/quotations_v5_preflight.sql` (solo lectura). Revise: ninguna de las columnas `tipo`, `detalles`, `vence_en` o `version` existe; `quotations.id` es uuid; `public.is_admin()` existe sin argumentos; RLS activo en `quotations` y `quotation_items`; **cero** políticas de `storage.objects` sin filtro por `bucket_id` (una así expondría las fotos). Anote los conteos de cotizaciones e ítems.
   2. `docs/sql/quotations_v5.sql`. Corre en una transacción; si algo falla no queda nada aplicado. Se puede volver a ejecutar.
   3. `docs/sql/quotations_v5_verify.sql` (solo lectura). Los conteos deben coincidir con el paso 1, todas las cotizaciones previas como `general`, 2 políticas en `quotation_versions`, 2 en storage para `quotation-media`, el disparador `quotation_versions_no_update` y el bucket privado.
   - No requiere relleno de datos: los valores por defecto cubren las filas existentes. La reversión está al final del archivo de migración.
   - Validado localmente con `node scripts/test-quotations-migration.mjs` (PostgreSQL 18 en PGlite con un esquema reconstruido; 22 comprobaciones). No sustituye la ejecución real: el esquema base real de Supabase no está en el repositorio.
2. Apruebe el texto nuevo listado en `docs/copy-pending.md` → "Cotizaciones V5". Las plantillas de condiciones requieren revisión legal (`termsPendingReview` en `src/lib/quotation-details.ts`).
3. Verifique con una sesión real (ver "Verificación manual").

## Qué cambió
- **Tipos**: Vuelo, Hotel, Paquete o combinado y Otros servicios (el anterior). Las cotizaciones existentes quedan como "Otros servicios", con sus ítems y su validez original (fin del día en hora de Honduras); no se les agregan pasajeros ni condiciones que no tenían.
- **Editor** (`src/components/admin/quotation-editor/`): dos columnas en escritorio (edición y panel con lista de pendientes, vista previa del PDF y envío), pestañas "Editar / Revisar y enviar" en el teléfono. Guardado automático cada 2,5 s una vez creada, Ctrl+S, aviso al salir con cambios sin guardar, detección de ediciones simultáneas (otra pestaña o persona) y "Duplicar".
- **Pegado de itinerarios** (`src/lib/flight-parser.ts`): Google Flights en español o inglés (con o sin saltos de línea, HTML, entidades, iconos), correos con el mismo formato y segmentos de Amadeus y Sabre. Corre en el navegador: el texto no sale del equipo hasta guardar. Lo que no puede confirmar (año sin día de la semana, llegada al día siguiente sin datos, valores contradictorios) queda marcado "Confirmar" y bloquea el envío hasta revisarlo. No usa servicios de IA.
- **Validación del itinerario** (`src/lib/flight-itinerary.ts`): códigos IATA, números de vuelo, orden cronológico, conexiones, duración contra las zonas horarias reales de ~60 aeropuertos de referencia (`src/lib/flight-reference.ts`), regreso desde otra ciudad. No inventa tiempos mínimos de conexión.
- **Clase y equipaje**: tarifa (una o por tramo), artículo personal / mano / documentado con incluido, no incluido o con cargo, piezas, peso y medidas. Hay que confirmar el equipaje antes de enviar; nunca se deduce de la cabina.
- **Hoteles**: varias habitaciones con ocupación y edades, plan, impuestos, cargos en el hotel, cancelación, reembolso y hasta 12 fotos (se corrige la orientación, se reducen a 1600 px JPEG en el navegador y se suben al bucket privado con la sesión del administrador). Sugiere hoteles de cotizaciones anteriores.
- **Precio**: conceptos con tipo; "Descuento" resta (también en reservas y facturas convertidas), totales en centavos, anticipo, saldo, precio por pasajero opcional.
- **Validez**: fecha y hora en hora de Honduras con atajos de 2, 6, 12, 24 y 48 horas, límites de pago y de emisión. Las vencidas se marcan en la lista y no se pueden enviar.
- **Envío**: cada envío crea una versión inmutable (`quotation_versions`) y el PDF se genera desde esa copia; la lista de versiones queda en la cotización. Las condiciones viajan con cada versión.
- **PDF** (`src/lib/quotation-pdf.tsx`): Manrope incrustada (OFL, `src/assets/fonts`), carta, una página cuando cabe (espaciado normal, luego compacto) y página de continuación con encabezado cuando no; nunca reduce el texto por debajo del tamaño compacto ni corta contenido. Nunca muestra notas internas ni el texto pegado.
- **Leads**: lo que escribió el visitante ahora se precarga en notas internas, no en las observaciones del PDF (antes salía impreso).

## Verificación hecha
- `npm run typecheck`, `npm run lint`, `node --test "tests/*.test.mjs"` sin errores.
- 23 pruebas del intérprete (`tests/flight-parser.test.mjs`), 9 del modelo (`tests/quotation-details.test.mjs`), 11 de PDF con render real (`tests/quotation-pdf.test.mjs`), 13 de acciones con una base simulada (`tests/quotation-actions.test.mjs`) y 5 de rutas (`tests/quotation-routes.test.mjs`). En total 174 pruebas, incluidas las existentes.
- `npm run build` sin errores; las fuentes y logos quedan incluidos en las rutas que generan PDF.
- Editor probado en Chromium (escritorio 1366 px y teléfono 390 px) con una página de prueba temporal sin Supabase: pegar, interpretar, aplicar, tarifa, equipaje, confirmaciones, precio y validez hasta "Lista para enviar", sin errores de consola ni desbordamiento horizontal. La página se eliminó.
- PDFs de muestra renderizados y revisados página por página (`node scripts/render-quotation-samples.mjs <carpeta>`).

## Correcciones de la auditoría previa al lanzamiento (2026-10-12)
- Migración: transacción explícita, disparador que impide modificar versiones enviadas (incluso con la service role), `emitida_por` debe ser el usuario de la sesión, sin privilegios para `anon`, índice para `refCreacion`, reversión completa, scripts de preflight y verificación.
- El número de versión se calcula desde `quotation_versions`: un fallo al actualizar el contador ya no bloquea envíos posteriores.
- Si la sesión vence mientras se edita, guardar ya no redirige al inicio de sesión (lo que borraba lo escrito): muestra un aviso y conserva el editor.
- La primera vez que se guarda una cotización nueva, el editor solo abre la página de la cotización cuando no hay cambios pendientes.
- Aviso al editar una cotización aceptada o convertida en reserva.
- Pruebas nuevas: total con descuento a través de cotización, reserva y factura; numeración de versiones; sesión vencida.

## Endurecimiento final (2026-10-12)
- **Cotización aceptada bloqueada**: al marcarla aceptada se registra la versión enviada que aceptó el cliente (`version_aceptada`); el contenido y los precios quedan bloqueados por disparadores en la base de datos (aplican a cualquier rol). Para cambiar algo se usa «Crear enmienda», que crea una cotización nueva con `enmiendaDe`. Una cotización convertida en reserva no puede salir de "aceptada".
- **Asesor asignado**: guardar ya no cambia `agente_id`; solo «Asignarme esta cotización». La reserva conserva el asesor de la cotización.
- **Precios atómicos**: `public.replace_quotation_items` reemplaza los precios y recalcula el total en una sola transacción, con la cotización bloqueada. La conversión usa la copia fija de la versión aceptada y un índice único impide dos reservas para la misma cotización. Los montos se calculan en centavos exactos (antes podía haber 1 centavo de diferencia en medios centavos).
- **Clientes**: un correo compartido ya no vincula la cotización a otro cliente; solo se vincula si coinciden correo y nombre, o si el asesor lo elige. Si hay coincidencia por correo, el editor lo sugiere.
- **Fotos sin uso**: en la lista de cotizaciones, «Buscar fotos sin uso» y «Eliminar». Solo se borran fotos de más de 7 días que no aparecen en ninguna cotización ni versión enviada; la política de Storage vuelve a comprobarlo en la base de datos.
- **Condiciones aprobadas**: cada cotización requiere marcar «Revisé estas condiciones y las apruebo». Se guarda una huella del texto exacto y el servidor registra quién y cuándo; cualquier cambio anula la aprobación y bloquea el envío. El PDF enviado usa exactamente las condiciones guardadas.

## Verificación manual pendiente (requiere sesión real y el SQL aplicado)
1. Cree una cotización de vuelo, pegue un itinerario de Google Flights, confirme los datos marcados, complete equipaje, precio y validez; revise la vista previa.
2. Suba fotos a un hotel desde un teléfono (orientación vertical) y confirme que el PDF las muestra.
3. Envíese la cotización a un correo propio y abra la versión desde "Versiones enviadas".
4. Duplique, marque como aceptada y convierta en reserva; verifique que un descuento resta en la reserva.

## Revisión de producción (solo lectura, 2026-10-13)
Proyecto verificado: `akbqbbwolsnzybojzbiy` (el encabezado CSP del sitio en vivo y `.env.local` coinciden). Consultas de solo lectura con la API; no se escribió nada.
- Datos: 1 cotización (borrador, total 890 sin conceptos de precio), 0 ítems, 1 cliente, 0 reservas, 0 facturas, 4 leads. Sin reservas duplicadas. El acceso anónimo a las tablas de cotizaciones responde 401.
- `quotation_items.cantidad` y `reservation_items.cantidad` son **enteros** en producción. El editor y la función `replace_quotation_items` ahora exigen cantidades enteras (la función usa `::integer`, que rechaza un decimal en lugar de redondearlo).
- La única cotización tiene total 890 y ningún concepto: es compatible con que la inserción en `quotation_items` falle hoy. Verifique las políticas de esa tabla en el preflight (bloque 5) antes de migrar.
- **Facturación ya falla en producción (anterior a V5)**: la tabla `invoices` no tiene las columnas `items`, `cliente_email` ni `cliente_telefono` que usa el código. Requiere su propio arreglo.
- No existe el bucket `portal-docs`: `docs/sql/portal_docs_bucket.sql` no se ha ejecutado.
- **Respaldo**: el flujo "Supabase backup" de GitHub no se ejecuta desde al menos el 2026-10-08 porque la cuenta de GitHub está bloqueada por facturación. Resuélvalo y confirme un respaldo antes de migrar.
- No se pudieron leer políticas RLS, disparadores ni restricciones (la API no los expone); el preflight debe ejecutarlo el propietario en el SQL Editor.
- Compatibilidad: con este código desplegado y sin la migración, las cotizaciones de "Otros servicios" siguen funcionando y las de vuelo, hotel y paquete muestran un aviso para ejecutar el SQL. Después de la migración, el código anterior (V3) también sigue funcionando según la revisión del código.
