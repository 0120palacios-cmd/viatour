# Administración V7: navegación, inicio operativo, listas, CRM y catálogo de servicios (2026-10-14/15)

Rama `v6-quotations`, cambios **sin commit**. Una migración nueva, **no aplicada**: `docs/sql/service_catalog_v7.sql` (ver «Migración»). Nada se envió a GitHub, a producción ni a la base de datos.

## Segunda ronda (2026-10-15)
- **Aceptar sin haber enviado**: implementada la opción (c) recomendada. Si una cotización nunca se envió desde el panel (por ejemplo, el PDF se compartió por WhatsApp), al marcarla aceptada se guarda en ese momento una versión fija con lo aceptado (`snapshot.origen = "aceptacion"`), y la reserva se crea desde esa versión, no desde el borrador vivo. Si ya se había enviado, se registra la última versión enviada como antes. En «Versiones» se distingue «enviada» de «guardada al aceptar». Una cotización sin conceptos de precio no se puede aceptar. Sin el SQL de V5 (tabla de versiones) el comportamiento anterior se conserva.
- **Detalle de reserva**: columna de resumen fija (saldo, total, pagado, aviso de pagos en otra moneda, fechas, cliente con enlaces a su ficha y a la cotización de origen) junto a las secciones de trabajo con índice (Datos y servicios, Documentos, Pagos, Facturas). Tabla de pagos y facturas con el mismo estilo del resto; cada factura enlaza a su detalle.
- **Detalle de factura**: misma estructura, tabla de conceptos con total al pie y acciones en su panel.
- **Catálogos**: hoteles y aerolíneas con las listas comunes, filtro activos/inactivos y vacíos con acción. La navegación lista Hoteles, Aerolíneas y Servicios y navieras por separado.
- **Catálogo de servicios y navieras** (nuevo, `/admin/catalogos/servicios`): traslados, tours, actividades, seguros, asistencia, otros servicios y navieras. Sin precios ni disponibilidad. En la cotización, cada traslado, tour, etc. de un paquete tiene «Buscar en el catálogo (tipo)» (solo registros de ese tipo) y «Guardar en el catálogo»; cada ferry (cotización de ferry o dentro de un paquete) tiene «Buscar naviera en el catálogo», que copia equipaje, cambios, cancelación, embarque, documentos e inclusiones, completa la naviera de los trayectos vacíos y deja todo **sin confirmar**. Las fechas, horas, trayectos y precios siguen siendo del asesor. Las notas internas del catálogo nunca llegan al editor ni al PDF. Copia fija como en hoteles: editar o desactivar un registro no cambia cotizaciones.
- **Usar una cotización como base**: botón por fila en la lista de cotizaciones (copia en borrador con los mismos servicios, precios y condiciones; fechas de validez y confirmaciones se reinician, como «Duplicar»).
- **Hotel frente a vuelos** en paquetes combinados: avisos (no bloquean el envío) si la entrada al hotel es antes de la llegada del vuelo, si hay una noche sin alojamiento entre la llegada y la entrada, o si la salida del hotel es después del vuelo de regreso.
- Barras de guardado fijas de los formularios de catálogo alineadas con los márgenes del panel.

## Migración (requiere al propietario)
Mismo proceso del proyecto: respaldo, archivo revisado, nunca `db push` ni `db reset`.
1. Respaldo con `pg_dump`.
2. `npx supabase db query --linked --file docs/sql/service_catalog_v7.sql` (una transacción, se puede repetir, no modifica filas; requiere V6).
3. Consulta de verificación al final del archivo (RLS activo, una política, anon sin acceso).
Sin la migración todo lo demás funciona: el buscador de servicios no aparece en el editor y la página del catálogo indica qué ejecutar.
Ensayo local: `scripts/test-service-catalog-v7-migration.mjs` en PGlite (PostgreSQL real en WASM) sobre V5 + V6 → **9 de 9** (aplicación, repetición, datos intactos, auditoría desde la sesión, unicidad por tipo + nombre + operador, valores inválidos, usuarios sin acceso, anon sin acceso, reversión). No sustituye un ensayo sobre una copia de producción.

## Punto de partida (auditoría)
El editor de cotizaciones (V5/V6) ya cubría casi todo lo pedido para cotizar: catálogo de hoteles con copia fija, «Guardar en el catálogo» desde la cotización, combinaciones libres de servicios (agregar, duplicar, reordenar, contraer, quitar), plantillas de tarifa de aerolíneas, guardado automático, versiones, bloqueo de aceptadas, enmiendas, conversión a reserva y vinculación de clientes por correo. **No se reconstruyó**; V7 trabaja alrededor de él.

| Área | Problema encontrado | Prioridad | Estado |
|---|---|---|---|
| Lista de cotizaciones | El selector de estado de cada fila venía con «Aceptada» preseleccionado, también en borradores: un clic en «Guardar estado» marcaba como aceptada una cotización nunca enviada y la bloqueaba | P0 | Corregido: sin preselección, campo obligatorio; el cambio de estado queda en la página de la cotización |
| Clientes | El formulario permitía crear dos clientes con el mismo correo (el editor sí lo evitaba) | P0 | Corregido: verificación sin distinguir mayúsculas, con enlace a la ficha existente |
| Reservas | El detalle no enlazaba a la cotización de origen ni al cliente | P0 | Corregido |
| Navegación | 13 enlaces sueltos, sin grupos; «Promociones» solo era accesible desde el inicio; al cambiar de sección desaparecía todo el panel (el `loading.tsx` estaba por encima del layout) | P1 | Barra lateral agrupada, menú en el teléfono, carga dentro del panel |
| Inicio | Mayormente reportes; no decía qué hacer hoy | P1 | Cola de trabajo con datos reales (abajo) |
| Crear cotización | Cinco botones, el principal decía «Nueva de vuelo» | P1 | Un botón «Nueva cotización» con menú de tipos (el paquete combinado primero) |
| Ficha del cliente | Solo un formulario de edición, sin historial | P1 | Ficha con cotizaciones, reservas, WhatsApp, correo, teléfono y «Cotizar para este cliente» |
| Listas | Cada página repetía búsqueda, filtros, insignias y vacíos con estilos distintos (`border-brand` y `border-line`, alturas distintas) | P2 | Componentes comunes en `src/components/admin/ui.tsx` |
| Estados | Solicitudes y opiniones mostraban valores internos (`en_revision`, `pendiente`) | P2 | Etiquetas y tonos en `src/lib/admin-status.ts` |
| Promociones | `<main>` dentro de otro `<main>`; estado `usada` mostrado en crudo | P2 | Corregido |
| Teléfono | Una regla global (`globals.css`, enlaces dentro de `<main>` → `inline-flex`) partía en columnas el título de cada fila | P2 | Corregido en `RecordRow` |

## Qué cambió

### Estructura y navegación
- `admin-shell.tsx` / `admin-nav.tsx`: barra lateral fija desde 1024 px con grupos **Ventas** (Leads, Clientes, Cotizaciones), **Operación** (Reservas, Facturación, Solicitudes), **Catálogos** y **Sitio web** (Paquetes, Destinos, Opiniones, Blog, Preguntas frecuentes, Promociones). Cuenta, «Ver sitio público» y «Cerrar sesión» al pie. En pantallas pequeñas, barra superior con «Menú» que abre la misma lista (con foco atrapado y Escape). Enlace «Saltar al contenido».
- `loading.tsx` por sección (esqueleto dentro del panel) en lugar del general: la navegación ya no desaparece al cambiar de sección.

### Inicio (`/admin`)
Cola de trabajo, cada número enlaza a la lista filtrada: leads nuevos, cotizaciones esperando respuesta, borradores, reservas activas con saldo, solicitudes abiertas, opiniones por revisar. Paneles: próximas salidas (30 días), cotizaciones que vencen en 48 h, saldos pendientes y actividad reciente. Los indicadores anteriores (embudo, leads, ventas del mes) siguen abajo, con los mismos cálculos. Una tabla opcional que no exista muestra «—» en vez de romper la página. Ninguna cifra es inventada: todo sale de las tablas.

### Listas
Cotizaciones, reservas, facturas, clientes, leads, solicitudes, promociones y contenido usan los mismos componentes: encabezado (`PageHeader`), búsqueda, filtros desplazables en el teléfono, insignias de estado, lista de filas (toda la fila es el enlace; las acciones quedan por encima) y vacíos con la siguiente acción.
- Cotizaciones: conteo por estado en los filtros, filtro «Asignadas a mí», PDF por fila, limpieza de fotos plegada como mantenimiento.
- Reservas: filtro «Con saldo pendiente» (lee hasta 500 reservas activas y calcula con los pagos en la moneda de la reserva, la misma regla de antes).
- Clientes: paginación y número de cotizaciones y reservas por cliente.
- Solicitudes: vista predeterminada «Por atender» y enlace a la reserva.

### CRM
- Ficha del cliente (`/admin/clientes/[id]`): historial, contacto y edición. Crear un cliente lleva a su ficha.
- `/admin/cotizaciones/nuevo?cliente=<id>` precarga y vincula el cliente desde el primer guardado.

### Editor de cotizaciones
Solo el diseño: con la barra lateral nueva, las dos columnas (editor y vista previa) empiezan en 1280 px; por debajo se usan las pestañas Editar / Revisar y enviar que ya existían. La barra fija se alinea con los márgenes nuevos. Sin cambios de lógica.

## Pruebas
- `npm run typecheck`, `npm run lint`: sin errores ni advertencias.
- `node --test "tests/*.test.mjs"`: **281 de 281** (265 existentes + 16 nuevas: día en Honduras, saldos, cotizaciones por vencer, aceptar sin envío previo y después de un envío, catálogo de servicios (biblioteca y acciones), hotel frente a vuelos).
- `npm run build`: correcto.
- Navegador (Microsoft Edge sin interfaz, build de producción local, página de prueba temporal **ya eliminada**, con datos de ejemplo y sin acceso a la base de datos) a 1440, 1100 y 390 px: sin desplazamiento horizontal, sin errores de JavaScript; barra lateral visible desde 1024 px; menú del teléfono abre, atrapa el foco y cierra con Escape; «Nueva cotización» se abre con el teclado, lista los cinco tipos con su enlace y devuelve el foco; el selector de estado empieza vacío y no se puede enviar vacío; el botón de PDF de cada fila recibe el clic por encima del enlace de la fila.

- Navegador, segunda ronda (misma técnica, página temporal **ya eliminada**, editor real de paquete combinado con un catálogo de ejemplo, sin base de datos y con las llamadas al servidor bloqueadas) a 1440 y 390 px: agregar un traslado, buscar «west bay», elegir con el teclado y ver la descripción, el operador y las inclusiones copiadas con su aviso; un tour no aparece al buscar para un traslado; agregar un ferry, elegir la naviera y ver el equipaje copiado y la naviera del trayecto completada; formulario del catálogo: campos de naviera visibles para ferry y reemplazados por los de tour al cambiar el tipo. Sin errores de JavaScript ni desplazamiento horizontal.

**No verificado** (requiere su sesión de administrador o la migración): las páginas con datos reales, guardar, enviar, aceptar (incluida la versión guardada al aceptar), enmendar y convertir, la ficha del cliente con historial real, el catálogo de servicios contra Supabase y los PDF. Las pruebas unitarias de esos flujos pasan.

## Pendiente (fuera de esta ronda)
- Notas de seguimiento con fecha por cliente (hoy hay un campo de notas por cliente; un historial con fechas y recordatorios requiere tabla nueva y una decisión sobre cómo lo usará el equipo).
- Plantillas de paquete con nombre (hoy: «Usar como base» en cualquier cotización anterior).
- Cambiar estado en lote y exportar listas.

## Verificación manual sugerida (con su sesión)
1. Recorra todas las secciones desde la barra lateral y desde el teléfono.
2. Inicio: compare cada número con la lista a la que enlaza.
3. Cree un cliente con un correo ya registrado (debe avisar y enlazar la ficha), luego uno nuevo y use «Cotizar para este cliente».
4. Abra una reserva: resumen, enlaces a la cotización y al cliente, registrar un pago de prueba **solo si puede borrarlo después** (o revise sin guardar).
5. Prepare una cotización de prueba, descargue el PDF sin enviarla y márquela aceptada: en «Versiones» debe aparecer «guardada al aceptar»; convierta y compare el total.
6. Después de aplicar `service_catalog_v7.sql`: cree una naviera y un traslado en Catálogos → Servicios y navieras, úselos en un paquete combinado, edite el registro del catálogo y confirme que la cotización no cambia.
7. Abra una cotización existente en una laptop (1280–1440 px) y revise que el editor y la vista previa se vean cómodos.
