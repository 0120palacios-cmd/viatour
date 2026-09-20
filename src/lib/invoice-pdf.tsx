import "server-only";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatMoney, type Invoice, type InvoiceItem } from "@/lib/reservation-types";

const styles = StyleSheet.create({
  page: { padding: 42, fontFamily: "Helvetica", fontSize: 9, color: "#12161C" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 22, borderBottom: "2 solid #1656D6" },
  logo: { width: 150, height: 48, objectFit: "contain" },
  headerRight: { alignItems: "flex-end", color: "#5A6672" },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#1656D6", marginBottom: 6 },
  section: { marginTop: 22 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#103FAE", marginBottom: 8, textTransform: "uppercase" },
  grid: { flexDirection: "row", gap: 28 },
  half: { flex: 1 },
  label: { color: "#5A6672", fontSize: 8, marginBottom: 2 },
  value: { fontSize: 10, marginBottom: 7 },
  table: { border: "1 solid #E4E8EB" },
  tableRow: { flexDirection: "row", borderBottom: "1 solid #E4E8EB", minHeight: 26, alignItems: "center" },
  tableHead: { backgroundColor: "#E9F0FE", fontFamily: "Helvetica-Bold", color: "#103FAE" },
  description: { flex: 4, paddingHorizontal: 8 },
  type: { flex: 1.3, paddingHorizontal: 8 },
  quantity: { flex: 1, paddingHorizontal: 8, textAlign: "right" },
  unit: { flex: 1.7, paddingHorizontal: 8, textAlign: "right" },
  subtotal: { flex: 1.7, paddingHorizontal: 8, textAlign: "right" },
  totalBox: { marginTop: 16, marginLeft: "auto", width: 220, padding: 14, backgroundColor: "#1656D6", color: "#FFFFFF" },
  totalLabel: { fontSize: 9, marginBottom: 4 },
  total: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  notes: { backgroundColor: "#F5F7F8", padding: 12, lineHeight: 1.4 },
  footer: { marginTop: 30, paddingTop: 12, borderTop: "1 solid #E4E8EB", color: "#5A6672", lineHeight: 1.5 },
  fine: { marginTop: 8, fontSize: 8, color: "#5A6672" },
});

function displayDate(value: string) {
  return new Intl.DateTimeFormat("es-HN", { dateStyle: "long" }).format(new Date(`${value}T12:00:00`));
}

function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const logo = `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "logo-black.png")).toString("base64")}`;
  return <Document title={`Factura ${invoice.numero}`} author="viatour" subject="Factura de viaje">
    <Page size="LETTER" style={styles.page}>
      <View style={styles.header}>
        {/* react-pdf images do not expose an HTML alt prop; the PDF is branded with this named logo asset. */}
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={logo} style={styles.logo} />
        <View style={styles.headerRight}><Text style={styles.title}>Factura</Text><Text>Número: {invoice.numero}</Text><Text>Emisión: {displayDate(invoice.fecha_emision)}</Text><Text>Vencimiento: {displayDate(invoice.fecha_vencimiento)}</Text></View>
      </View>
      <View style={[styles.section, styles.grid]}>
        <View style={styles.half}><Text style={styles.sectionTitle}>Datos del cliente</Text><Text style={styles.label}>Nombre</Text><Text style={styles.value}>{invoice.cliente_nombre}</Text><Text style={styles.label}>Correo electrónico</Text><Text style={styles.value}>{invoice.cliente_email}</Text>{invoice.cliente_telefono ? <><Text style={styles.label}>Teléfono</Text><Text style={styles.value}>{invoice.cliente_telefono}</Text></> : null}</View>
        <View style={styles.half}><Text style={styles.sectionTitle}>Detalles</Text><Text style={styles.label}>Moneda</Text><Text style={styles.value}>{invoice.moneda}</Text><Text style={styles.label}>Estado</Text><Text style={styles.value}>{invoice.estado}</Text></View>
      </View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Ítems</Text><View style={styles.table}><View style={[styles.tableRow, styles.tableHead]}><Text style={styles.description}>Descripción</Text><Text style={styles.type}>Tipo</Text><Text style={styles.quantity}>Cantidad</Text><Text style={styles.unit}>Precio unitario</Text><Text style={styles.subtotal}>Subtotal</Text></View>{invoice.items.map((item: InvoiceItem, index) => <View style={styles.tableRow} key={item.id ?? `${item.descripcion}-${index}`}><Text style={styles.description}>{item.descripcion}</Text><Text style={styles.type}>{item.tipo}</Text><Text style={styles.quantity}>{item.cantidad}</Text><Text style={styles.unit}>{formatMoney(item.precio_unitario, invoice.moneda)}</Text><Text style={styles.subtotal}>{formatMoney(item.cantidad * item.precio_unitario, invoice.moneda)}</Text></View>)}</View><View style={styles.totalBox}><Text style={styles.totalLabel}>Total ({invoice.moneda})</Text><Text style={styles.total}>{formatMoney(invoice.total, invoice.moneda)}</Text></View></View>
      {invoice.notas ? <View style={styles.section}><Text style={styles.sectionTitle}>Notas</Text><Text style={styles.notes}>{invoice.notas}</Text></View> : null}
      <View style={styles.footer}><Text>Esta factura corresponde a los servicios detallados y no registra pagos con tarjeta en este sitio.</Text><Text>Para consultar su factura, comuníquese con su asesor de viatour.</Text><Text>WhatsApp: +504 8866-8704 | soporte@miviatour.com</Text><Text style={styles.fine}>viatour | asesores de viaje</Text></View>
    </Page>
  </Document>;
}

export async function renderInvoicePdf(invoice: Invoice) {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />);
}
