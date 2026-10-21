# Documentos fiscales en Honduras: recibo, factura y arquitectura de viatour

Investigación del 21 de octubre de 2026 (rama `recovery-quotation-booking-invoice`), verificada dos veces el mismo día. **No es asesoría legal ni contable.** Cada conclusión separa **HECHO** (lo que dice la norma, con fuente y artículo), **INTERPRETACIÓN** (lectura propia) y **CONFIRMACIÓN DEL CONTADOR REQUERIDA**. La arquitectura fiscal de la aplicación **no se cambió**: solo se ajustó la presentación al cliente, de forma reversible.

## 1. Fuentes

| # | Fuente | Fecha | Enlace |
| --- | --- | --- | --- |
| S1 | SAR, *Texto consolidado del Reglamento del Régimen de Facturación, Otros Documentos Fiscales y Registro de Imprentas*: Acuerdo 481-2017 con sus reformas 609-2017, 725-2018 y 817-2018, elaborado por la Dirección Nacional Jurídica del SAR | Publicado el 9 de julio de 2020 (es el texto consolidado más reciente que publica el SAR; no se encontraron reformas posteriores) | [sar.gob.hn: texto consolidado](https://www.sar.gob.hn/download/texto-consolidado-del-reglamento-del-regimen-de-facturacion-otros-documentos-fiscales-y-registro-de-imprentas-segun-acuerdos-609-2017-725-2018-y-817-2018-elaborado-por-la-direccion-nacional-juridc/) |
| S2 | Acuerdo 481-2017, texto original (La Gaceta 34,413) | 10 de agosto de 2017 | [Copia publicada por RSM Honduras](https://www.rsm.global/honduras/sites/default/files/media/acuerdo-481-2017-facturacion.pdf) |
| S3 | SAR, listado de normas del régimen de facturación (reformas 609-2017 y 817-2018) | Página consultada el 21-10-2026 | [sar.gob.hn: leyes de facturación](https://www.sar.gob.hn/download-category/leyes-de-facturacion/) |
| S4 | SAR, preguntas frecuentes de facturación | Consultada el 21-10-2026 | [sar.gob.hn: FAQ](https://www.sar.gob.hn/faqs/preguntasfrecuentesfacturacion/) |
| S5 | VATupdate, *Honduras e-invoicing booklet* (secundaria) | Agosto de 2026 | [vatupdate.com](https://www.vatupdate.com/2026/08/11/honduras-e-invoicing-e-reporting-country-booklet/) |

Los textos citados de S1 se extrajeron del PDF oficial descargado de sar.gob.hn. No se encontró una fuente primaria hondureña sobre agencias de viaje, intermediarios o ventas por cuenta de terceros; esas preguntas quedan para el contador.

## 2. Conclusiones

### 2.1 ¿Puede un recibo de pago de viatour sustituir una factura?

- **HECHO (S1, art. 6):** "Son Comprobantes Fiscales los siguientes:"
  1. Factura
  2. Factura Prevalorada
  3. Ticket
  4. Recibo por Honorarios Profesionales
  5. Boleta de Compra
  6. Constancia de Donación
  7. "los demás Comprobantes Fiscales que la Administración Tributaria autorice"
- **HECHO (S1, art. 5):** son documentos fiscales los comprobantes fiscales (art. 6), los documentos complementarios (art. 7: notas de crédito y débito, guías de remisión, comprobantes de retención) y otros comprobantes (art. 8: servicios públicos, bancos, Estado).
- **INTERPRETACIÓN:** un "recibo de pago" emitido por viatour sin autorización del SAR no está en ninguna de esas listas. Acredita el cobro, pero **no sustituye** la factura. El recibo por honorarios profesionales es un comprobante distinto, propio de personas naturales que prestan servicios profesionales (S1, art. 4.37), y no aplica al recibo de la aplicación.
- **En la aplicación:** el recibo dice "No constituye factura ni comprobante fiscal".

### 2.2 ¿Cuándo se requiere la factura?

- **HECHO (S1, art. 9):** "Están obligados a expedir Comprobantes Fiscales, los Obligados Tributarios que transfieran bienes y/o presten servicios de cualquier naturaleza". Rige aunque la operación no esté gravada.
- **HECHO (S1, art. 14.2):** "En la prestación de servicios, en la fecha de pago al contado o en la que se otorgue al crédito (devengo), lo que suceda primero".
- **HECHO (S1, art. 14.4):** en ventas por internet, teléfono o medio similar pagadas antes de la entrega con tarjeta o depósito bancario, la factura se emite en la fecha del pago.
- **INTERPRETACIÓN:** para un servicio que viatour presta y cobra (por ejemplo, su cargo por servicio), la factura nace con el pago o con el crédito, no con el viaje. Las dos reservas reales tienen pagos registrados el 20-10-2026, y cada una tiene un registro "factura" en la aplicación, sin CAI (ver 3).
- **CONFIRMACIÓN DEL CONTADOR REQUERIDA:** si cada abono genera una factura o si se factura una vez al devengo; cómo se documentan anticipos y saldos.

### 2.3 CAI y contenido obligatorio de la factura

- **HECHO (S1, art. 10, reformado por el Acuerdo 725-2018):** la factura debe contener:
  - **Datos del emisor:** RTN, nombre o razón social, nombre comercial, direcciones, teléfono y correo.
  - **Denominación** "Factura".
  - **Autorización:** CAI, fecha límite de emisión y rango autorizado.
  - **Destino de los ejemplares:** original al cliente, copia al emisor.
  - **Correlativo** de 16 dígitos (NNN-NNN-NN-NNNNNNNN).
  - **Datos de la imprenta**, si la factura es preimpresa.
  - **Descuentos y rebajas** (numeral 10, agregado en 2018).
- **HECHO (S1, art. 5):** las copias se resguardan "según los plazos de prescripción que establece el Código Tributario".
- **INTERPRETACIÓN:** el PDF "Factura" de la aplicación (`src/lib/invoice-pdf.tsx`) no tiene RTN, CAI, rango, fecha límite ni correlativo de 16 dígitos. **No es una factura fiscal válida** y no debe entregarse como tal.

### 2.4 RTN del cliente

- **HECHO (S1, art. 11.1):** cuando el cliente necesita sustentar crédito fiscal, costos o gastos, la factura debe consignar su nombre o razón social y su **RTN**.
- **HECHO (S1, art. 11.1):** debe además desglosar lo exento, exonerado y gravado, los impuestos por tarifa y el total en números y letras.
- **HECHO (S1, art. 11.2):** el numeral 2 regula la venta a consumidores finales; sus requisitos no se transcribieron en esta revisión.
- **CONFIRMACIÓN DEL CONTADOR REQUERIDA:** qué datos pedir a clientes empresa (viajes corporativos) y a consumidores finales.

### 2.5 Agencia intermediaria vs. venta bruta del viaje

- **HECHO:** en S1–S4 no hay una regla específica para agencias de viaje, comisionistas o ventas por cuenta de terceros.
- **HECHO:** el sitio declara "Ventas IATA a través de una agencia anfitriona acreditada".
- **INTERPRETACIÓN (no verificada):**
  - Si viatour actúa como intermediaria, la aerolínea o la agencia anfitriona factura el boleto, y viatour factura solo su cargo por servicio o comisión.
  - Si viatour vende el paquete completo en nombre propio, factura el total.
  - El monto que va en la factura de viatour y el ISV dependen de esa respuesta.
- **CONFIRMACIÓN DEL CONTADOR REQUERIDA:**
  1. Quién factura el boleto aéreo.
  2. Qué factura viatour (¿total o comisión?).
  3. Tratamiento del ISV del transporte internacional y de los hoteles en el exterior.
  4. Si los recibos deben mostrar ese desglose.

### 2.6 Factura electrónica

- **HECHO (S5, secundaria):** la facturación electrónica no es general. El SAR la asigna por notificación, y el sistema CAI por imprenta o autoimpresor sigue vigente.
- **CONFIRMACIÓN DEL CONTADOR REQUERIDA:** si viatour o la agencia anfitriona fue notificada.

## 3. Lo que hace hoy la aplicación (sin cambios en datos ni en el esquema)

- `invoices` y `invoice-pdf.tsx`: un documento titulado "Factura", sin requisitos fiscales. **Se conserva intacto**; el portal del cliente ya no lo enlaza.
- `payment_receipts`: recibo inmutable por cada pago registrado (número `REC-…`, instantánea fija). Es correcto como prueba de pago, no como comprobante fiscal.
- **Hallazgo en las reservas reales (lectura, 21-10-2026):** VT-7CC608B0 tiene un total aceptado de US$578, un pago de US$548 y una "factura" de la aplicación por US$548 marcada pagada.
  - El portal y la confirmación toman el total de la factura pagada, como hacía el portal anterior, y muestran "Pagado".
  - La diferencia de US$30 debe explicarla el propietario o el contador antes de emitir el recibo (ver `docs/traveler-experience-overhaul.md`).

## 4. Arquitectura recomendada (sin cambios hasta la confirmación)

1. **Fiscal:** la factura con CAI se emite por el medio autorizado (imprenta, autoimpresor o electrónica), fuera de la aplicación, hasta que el contador decida otra cosa.
2. **Contable interno:** pagos y recibos inmutables en la aplicación. El saldo se calcula con la regla documentada (total de la factura pagada si existe; si no, el total aceptado).
3. **Cliente:**
   - Mi viaje muestra "Pagado" o "Saldo pendiente" y los recibos.
   - La confirmación y el recibo aclaran que no son comprobantes fiscales.
   - Revertir es enlazar otra vez la ruta de facturas desde `trip-portal.tsx`.

## 5. Preguntas para el contador

1. ¿viatour (o su agencia anfitriona) está inscrita en el régimen de facturación? ¿Tiene CAI vigente? ¿En qué modalidad?
2. ¿viatour actúa como intermediaria o como vendedora en boletos, hoteles y paquetes? ¿Qué monto factura?
3. Tasa y exenciones del ISV aplicables a cada concepto.
4. ¿Factura por cada abono o al devengo?
5. Plazo de conservación (Código Tributario, Decreto 170-2016, prescripción).
6. ¿El registro "factura" de la aplicación debe convertirse en "estado de cuenta" o guardar el número de la factura CAI externa?
7. VT-7CC608B0: ¿el total correcto es US$578 o US$548?
