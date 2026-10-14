# Cotizaciones V6: paquete combinado, catálogos e intérprete de vuelos (2026-10-14)

Rama `v6-quotations` (PR #2). **Migración aplicada en producción el 2026-10-14** (después del respaldo del propietario; verificación: conteos sin cambios, `combinado` aceptado, RLS solo administradores en las tres tablas, anon sin privilegios, auditoría y disparadores de V5 activos). El código aún no está desplegado.

Es una ampliación: los tipos Vuelo, Hotel, Ferry y Otros servicios, el editor, el guardado automático, la aprobación de condiciones, las versiones, el bloqueo de cotizaciones aceptadas, las enmiendas, la conversión a reserva y el diseño del PDF de V5 siguen igual. Los PDF de muestra de V5 se renderizan con el mismo número de páginas y el mismo contenido que antes de V6.

## Qué se agregó

### 1. Paquete combinado
- Nuevo tipo **Paquete combinado** (`tipo = 'combinado'`). En "Crear cotización" reemplaza a "Paquete o combinado" (decisión del propietario, 2026-10-14). Las cotizaciones "Paquete o combinado" existentes siguen abriéndose, editándose, enviándose e imprimiéndose igual; en las listas del panel aparecen como "Paquete (formato anterior)" y su PDF no cambia. Un lead que pide "paquete" y los enlaces antiguos `?tipo=paquete` abren el paquete combinado.
- El asesor agrega servicios en cualquier combinación y cantidad (hasta 16): Vuelo, Hotel, Ferry, Traslado, Tour o excursión, Actividad, Seguro de viaje, Asistencia al viajero y Otro servicio. Puede repetir tipos (dos hoteles, varios vuelos), ordenar, duplicar, contraer y quitar (con confirmación) cada servicio.
- Vuelo, Hotel y Ferry usan **los mismos editores de V5** (pegado de itinerario, tarifa y equipaje, habitaciones, fotos, inclusiones, condiciones de naviera) a través de un adaptador; no se copió ningún editor. Traslados, tours, actividades, seguros y otros servicios tienen un formulario propio: descripción, operador, modalidad compartido/privado, fecha y hora (o vigencia), lugar, duración, lo que incluye (Incluido / No incluido / Con cargo) y cancelación.
- Cada servicio tiene título opcional para el PDF y notas para el cliente. El paquete tiene nombre ("Vacaciones en Cancún"), condiciones, validez, pasajeros y pago propios.
- La revisión antes de enviar aplica a cada servicio las mismas reglas de V5, con el prefijo "Servicio N (Tipo)". Duplicar o crear una enmienda pide confirmar de nuevo los vuelos y el equipaje de cada servicio.
- Archivos: `src/lib/quotation-details.ts` (modelo, saneamiento, revisión), `src/components/admin/quotation-editor/package-section.tsx`.

**Combinaciones libres.** El paquete no exige ningún tipo de servicio: puede empezar con cualquiera (un hotel, un ferry, un traslado, un seguro) y combinar los que quiera en cualquier orden, repitiendo tipos (varios hoteles, vuelos o ferris). El único límite es de tamaño del documento: 16 servicios por cotización. Flujo: Crear cotización → Paquete combinado → «Agregar servicio» → elegir el tipo → completar → «Agregar otro servicio» → vista previa → guardar. Mientras la cotización es borrador se pueden agregar, duplicar, reordenar y quitar servicios; cada versión enviada y aceptada conserva la combinación exacta.

**Nuevos tipos de servicio en el futuro** (alquiler de autos, cruceros, transporte privado…): se agregan con una entrada en el registro `packageServiceTypes` de `src/lib/quotation-details.ts` (nombre, descripción, formulario que usa, variante de texto, tipo de concepto de precio y sugerencias de inclusiones) y un icono en `package-section.tsx`. El editor, la revisión, el precio y el PDF los toman de ahí. Si un tipo nuevo necesita datos propios (por ejemplo, el camarote de un crucero), se agrega una estructura nueva como las de vuelo, hotel y ferry.

### 2. Precio del paquete
- Los conceptos de precio siguen siendo la única fuente del total (misma función `replace_quotation_items`, centavos exactos, "Descuento" resta). No hay montos paralelos que se puedan contar dos veces.
- Cada concepto puede asociarse a un servicio ("Corresponde a") o a todo el paquete. Botones rápidos: "Precio total del paquete", "Precio: {servicio}", impuestos, cargo por servicio y descuento.
- **Cómo ve el cliente el precio** (predeterminado: solo el total, decisión del propietario):
  - *Solo el total del paquete*: el PDF lista los servicios y muestra un total, con descuentos, anticipo y saldo si los hay.
  - *Desglosado por servicio*: el PDF muestra la tabla de conceptos y el precio de cada servicio junto a su título. Si un servicio no tiene concepto propio, la revisión lo advierte.
- Reservas: la conversión sigue usando la copia fija de la versión aceptada; los conceptos del paquete pasan tal cual a la reserva.

### 3. PDF del paquete
Mismo diseño de V5 (encabezado, tarjetas, tipografía, iconos, bloque "Importante", condiciones, pie). Se agrega "Su paquete incluye" (lista numerada), un bloque por servicio en el orden elegido (con los bloques de vuelo, hotel con fotos y ferry de V5) y una tarjeta para traslados, tours y seguros. Paquetes simples caben en una o dos páginas; los largos continúan con el encabezado de continuación, sin reducir el texto. Ver `docs/copy-pending.md` → "Cotizaciones V6".

### 4. Catálogo de hoteles (Administración → Catálogos → Hoteles)
- Nombre, cadena, país, ciudad, destino, dirección, ubicación, contacto, descripción, categoría (solo si está verificada), fotos (mismo bucket privado), instalaciones, habitaciones, planes de comidas, valores sugeridos de Incluido / No incluido / Con cargo, horarios de entrada y salida, políticas, cancelación, impuestos, cargos en el hotel, referencia del proveedor, notas internas y estado activo.
- En la cotización: "Buscar en el catálogo de hoteles" (búsqueda sin acentos, con teclado) copia los datos reutilizables. Fechas, habitaciones, ocupación y precio son del asesor; las habitaciones del hotel se agregan con un clic. Las inclusiones llegan sin confirmar y las instalaciones nunca se imprimen como incluidas. Todo se puede editar sin tocar el catálogo.
- **Copia fija**: la cotización guarda su propia copia (`catalogoId` solo registra el origen). Editar o desactivar el hotel nunca cambia cotizaciones preparadas o enviadas.
- "Guardar en el catálogo" convierte un hotel escrito a mano en un registro del catálogo (sin fechas ni precios).
- Las notas internas y referencias del proveedor no se envían al editor de cotizaciones ni al PDF.

### 5. Catálogo de aerolíneas y plantillas de tarifa (Catálogos → Aerolíneas)
- Aerolínea: nombre, IATA, OACI, país, aerolíneas operadoras, notas, estado. Plantillas por aerolínea: nombre (Main Cabin, Basic…), cabina, tipo de tarifa, para qué rutas se verificó, equipaje (artículo personal, mano, documentado con piezas, peso y medidas), cambios, cancelación, reembolso, asientos, restricciones, otras inclusiones, fuente y fecha de verificación.
- En "Clase y equipaje": "Aerolínea del catálogo" (las usadas recientemente primero) y "Plantilla de tarifa y equipaje" (las recientes marcadas). Aplicar una plantilla copia los datos a esa tarifa y su equipaje, muestra de qué plantilla vienen y cuándo se verificó, y deja el equipaje **sin confirmar**. La entrada manual sigue igual.
- `docs/sql/quotations_v6_seed_airlines.sql` (opcional) carga 20 aerolíneas con nombre y códigos públicos; no crea plantillas: el equipo las registra después de verificarlas.

### 6. Intérprete de itinerarios
Corregido con el ejemplo real de American Airlines (`tests/fixtures/american-google.txt`, prueba permanente):
- **Hora PM pegada al aeropuerto** ("1:14 PMAEROPUERTO…"): antes se leía 01:14. Esta era la causa de "sale antes de que llegue el vuelo anterior" y de la duración de 14 h 38 min MIA → SAP.
- **Números de vuelo pegados al avión** ("Boeing 737MAX 8 PassengerAA 360", "Airbus A321neoAA 3308"): se recuperan los seis (AA 360, 1339, 3308, 690, 2534, 349). Un modelo solo ("Airbus A321") nunca se toma como vuelo.
- **Marcadores +1/+2**: pegados ("AM+1Philadelphia"), en Markdown (`**+1**`), con entidades HTML (`A&#x4D;`) o espacios Unicode; se cuentan desde la fecha del tramo, como los usa Google Flights, y se contrastan con la escala y la duración.
- **Día de la semana pegado** ("Departing flightTue, Nov 10"): el año ya no queda "por confirmar".
- **Aeropuertos**: lista revisada de unos 180 aeropuertos con zona horaria IANA (incluye PHL, BOS y los principales de EE. UU., Canadá, México, Centroamérica, Caribe, Sudamérica y Europa). Un código desconocido se marca y nunca se le inventa zona.
- **Ruido**: se ignoran "svg", "Contrail warming potential", emisiones, "Long layover" y viñetas, incluso con todo pegado en una línea.
- **Revisión**: cada vuelo interpretado muestra Verificado, Confirmar, Falta información o Datos contradictorios. Conexiones de menos de 60 minutos se avisan (sin inventar tiempos mínimos de la aerolínea); las nocturnas se indican y el PDF agrega "conexión nocturna".
- "American" junto a un vuelo AA se muestra como "American Airlines" (igual Delta, United, Copa).

### 7. Otras mejoras del editor
- Selectores accesibles con teclado (patrón combobox ARIA) para hoteles y aerolíneas; sugerencias de aerolíneas del catálogo en cada vuelo.
- Campos obligatorios marcados con * en el hotel.
- Lista de servicios con índice que enlaza a cada bloque y botones que bajan de línea en el teléfono.
- Corrección de V5: en pantallas de laptop, el subtotal de cada concepto de precio se montaba sobre el botón de subir; ahora el concepto ocupa su propia línea hasta pantallas muy anchas.
- "Buscar fotos sin uso" también respeta las fotos del catálogo.

## Migración (requiere al propietario)
Proceso habitual del proyecto (memoria del proyecto): respaldo, ensayo y archivo revisado, nunca `db push` ni `db reset`.
1. Respaldo nuevo con `pg_dump` (auth, public, storage), como el de `C:\Users\wwwjo\viatour-backups\2026-10-13-pre-v5`.
2. `docs/sql/quotations_v6_preflight.sql` (solo lectura): V5 aplicado, tipos actuales dentro de la lista, tablas nuevas inexistentes, `is_admin()`, cero políticas de storage sin `bucket_id`. Anote los conteos.
3. `docs/sql/quotations_v6.sql` con `npx supabase db query --linked --file docs/sql/quotations_v6.sql`. Una transacción; se puede repetir; no modifica filas.
4. `docs/sql/quotations_v6_verify.sql` (solo lectura): conteos iguales, `combinado` en la restricción, RLS activo con una política solo para administradores en cada tabla nueva, sin privilegios para `anon`, disparadores de auditoría, política de fotos que revisa el catálogo, disparadores de V5 activos.
5. Opcional: `docs/sql/quotations_v6_seed_airlines.sql`.

Qué crea: tipo `combinado`; tablas `hotel_catalog`, `airline_catalog` y `airline_fare_presets` con RLS (solo `public.is_admin()`), auditoría (`creado_por`, `actualizado_por`, fechas, fijadas por disparador), llaves foráneas, unicidad (hotel por nombre y ciudad, IATA entre activas, tarifa por aerolínea) y límites de tamaño; política de borrado de fotos que también revisa el catálogo. No crea tablas de componentes: el paquete vive en `quotations.detalles` y cada versión enviada ya guarda la copia exacta. La reversión está al final del archivo.

Compatibilidad: con este código desplegado sin la migración, todo lo de V5 funciona; guardar un paquete combinado muestra "ejecute docs/sql/quotations_v6.sql" y Catálogos muestra el mismo aviso. Con la migración aplicada y el código anterior, nada cambia para V5.

## Plan de lanzamiento propuesto (para su aprobación)
1. Revise y apruebe el texto de `docs/copy-pending.md` → "Cotizaciones V6".
2. Autorice el commit en `v6-quotations` y el PR hacia `main`.
3. Respaldo y migración (pasos de arriba); idealmente ensayada antes sobre una copia restaurada.
4. Despliegue en Vercel.
5. Verificación manual con su sesión (abajo). Hasta completarla, siga usando los tipos de V5 para clientes.
Reversión de código: volver al despliegue anterior; la migración puede quedarse (es compatible con el código anterior).

## Verificación manual pendiente (sesión real, SQL aplicado)
1. Catálogos: cree un hotel con fotos e inclusiones; cree American Airlines con la plantilla Main Cabin.
2. Paquete combinado "Vacaciones en Cancún": vuelo pegado de Google Flights, hotel desde el catálogo, traslado y tour. Confirme, apruebe condiciones, revise la vista previa en ambos modos de precio.
3. Envíelo a un correo propio; abra la versión enviada; edite el hotel del catálogo y confirme que la versión y la cotización no cambian.
4. Márquelo aceptado, intente editar (debe bloquear), cree una enmienda y convierta la original en reserva; compare el total.
5. Abra una cotización de V5 existente y confirme que se ve y se envía igual.

## Verificación hecha (local)
- Pruebas unitarias: `node --test "tests/*.test.mjs"` → **265 de 265** (205 existentes al empezar V6 y 60 nuevas: intérprete, paquete, combinaciones libres, catálogos, acciones del paquete y de catálogos).
- Combinaciones probadas, cada una enviable, con precio por servicio y total, y PDF real en ambos modos: vuelo + ferry, hotel + ferry, vuelo + hotel, dos hoteles, ferry + traslado, hotel + tour + traslado, varios ferris, varios vuelos, tours + traslados, y cinco servicios de cuatro tipos empezando por un seguro. Hotel + ferry conserva su combinación exacta en la versión enviada y en la enmienda aunque el borrador cambie después.
- `npm run typecheck` y `npm run lint` sin errores ni advertencias; `npm run build` correcto.
- Migración en PGlite (PostgreSQL real en WASM) con un esquema reconstruido y V5 aplicado: `scripts/test-quotations-v6-migration.mjs` → **17 de 17** (repetible, datos intactos, RLS para administradores, anon sin acceso, auditoría no falsificable, llaves foráneas, unicidad, fotos protegidas, reversión). No sustituye el ensayo sobre una copia de producción.
- PDF reales: 11 muestras (`node scripts/render-quotation-samples.mjs <carpeta>`), revisadas a la vista; las 8 de V5 sin cambios de diseño ni de páginas.
- Navegador: Microsoft Edge sin interfaz contra un build de producción local con una página de prueba temporal (eliminada) y Supabase desactivado: armado del paquete, catálogo de hoteles con teclado, plantilla de tarifa, revisión del itinerario de AA (6 vuelos, 5 verificados, 1 por confirmar, conexión nocturna), modos de precio, sin errores de JavaScript ni desplazamiento horizontal a 390 px.
- No verificado: las páginas de Catálogos y el editor con una sesión real de Supabase (requieren la migración), carga real de fotos al catálogo, correo real.

## Oportunidades evaluadas (Parte 11)
| Oportunidad | Problema | Mejora | Impacto | Riesgo | Decisión |
|---|---|---|---|---|---|
| Guardar hotel en el catálogo desde la cotización | El catálogo se llenaría solo a mano | Botón "Guardar en el catálogo" | Alto | Bajo | Hecho |
| Habitaciones del catálogo con un clic | Se reescribían categorías y camas | Botones por habitación | Medio | Bajo | Hecho |
| Aerolíneas y plantillas recientes primero | Búsqueda repetida | Orden por uso reciente | Medio | Bajo | Hecho |
| Estado por vuelo al interpretar | Avisos mezclados en una lista | Verificado / Confirmar / Falta / Contradictorio | Alto | Bajo | Hecho |
| Subtotal encima de botones (V5) | Ilegible en laptop | Rediseño de la fila | Medio | Bajo | Hecho |
| Fotos del catálogo en limpieza | Se contaban como sin uso | Incluir catálogo | Alto | Bajo | Hecho |
| Plantillas de paquete (p. ej. "Cancún 5 noches") | Paquetes repetidos se arman desde cero | Guardar un paquete como plantilla | Alto | Medio | Pendiente |
| Logo de aerolínea | No hay logos | Subida y uso en el editor | Bajo | Medio (bucket solo JPEG, diseño del PDF) | Pendiente |
| Base de aeropuertos generada | Lista revisada a mano | Script con datos abiertos (OurAirports + zonas) | Medio | Medio | Pendiente |
| Catálogos de navieras, traslados y tours | Se escriben a mano | Mismo patrón que hoteles | Medio | Medio | Pendiente |
| Tarifas por temporada, proveedores, motor automático | Fuera de alcance hoy | Tablas `suppliers`, `hotel_rate_plans`, `hotel_rates`, `quotation_templates` con RLS; vista pública separada sin precios internos | Alto a futuro | Alto | Pendiente (diseño en el SQL) |
| Validación cruzada entre servicios | No compara vuelo con fechas del hotel | Avisar si el hotel no coincide con la llegada | Medio | Bajo | Pendiente |

## Notas
- Las inclusiones del catálogo, las plantillas de tarifa y la lista de aeropuertos son ayudas; cada cotización pide confirmar lo que se promete.
- Si el equipo usa Turbopack en desarrollo con poca memoria libre, `next dev --webpack` compiló bien en esta revisión.
