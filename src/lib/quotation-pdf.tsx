import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatQuotationAmount, type Quotation, type QuotationItem } from "@/lib/quotation-types";

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

function PdfDocument({ quotation, items }: { quotation: Quotation; items: QuotationItem[] }) {
  const logo = `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "logo-black.png")).toString("base64")}`;
  const date = new Intl.DateTimeFormat("es-HN", { dateStyle: "long" }).format(new Date(quotation.created_at));
  const expiration = new Intl.DateTimeFormat("es-HN", { dateStyle: "long" }).format(new Date(`${quotation.validez}T12:00:00`));
  return <Document title={`Cotización ${quotation.codigo}`} author="viatour" subject="Cotización de viaje">
    <Page size="LETTER" style={styles.page}>
      <View style={styles.header}>
        {/* react-pdf images do not expose an HTML alt prop; the PDF is branded with this named logo asset. */}
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={logo} style={styles.logo} />
        <View style={styles.headerRight}><Text style={styles.title}>Cotización</Text><Text>Código: {quotation.codigo}</Text><Text>Fecha: {date}</Text><Text>Validez: {expiration}</Text></View>
      </View>
      <View style={[styles.section, styles.grid]}>
        <View style={styles.half}><Text style={styles.sectionTitle}>Datos del cliente</Text><Text style={styles.label}>Nombre</Text><Text style={styles.value}>{quotation.cliente_nombre}</Text><Text style={styles.label}>Correo electrónico</Text><Text style={styles.value}>{quotation.cliente_email}</Text>{quotation.cliente_telefono ? <><Text style={styles.label}>Teléfono</Text><Text style={styles.value}>{quotation.cliente_telefono}</Text></> : null}</View>
        <View style={styles.half}><Text style={styles.sectionTitle}>Detalles del viaje</Text><Text style={styles.label}>Destino</Text><Text style={styles.value}>{quotation.destino}</Text><Text style={styles.label}>Moneda</Text><Text style={styles.value}>{quotation.moneda}</Text></View>
      </View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Ítems de la cotización</Text><View style={styles.table}><View style={[styles.tableRow, styles.tableHead]}><Text style={styles.description}>Descripción</Text><Text style={styles.type}>Tipo</Text><Text style={styles.quantity}>Cantidad</Text><Text style={styles.unit}>Precio unitario</Text><Text style={styles.subtotal}>Subtotal</Text></View>{items.map((item, index) => <View style={styles.tableRow} key={item.id ?? `${item.descripcion}-${index}`}><Text style={styles.description}>{item.descripcion}</Text><Text style={styles.type}>{item.tipo}</Text><Text style={styles.quantity}>{item.cantidad}</Text><Text style={styles.unit}>{formatQuotationAmount(item.precio_unitario, quotation.moneda)}</Text><Text style={styles.subtotal}>{formatQuotationAmount(item.cantidad * item.precio_unitario, quotation.moneda)}</Text></View>)}</View><View style={styles.totalBox}><Text style={styles.totalLabel}>Total referencial ({quotation.moneda})</Text><Text style={styles.total}>{formatQuotationAmount(quotation.total, quotation.moneda)}</Text></View></View>
      {quotation.notas ? <View style={styles.section}><Text style={styles.sectionTitle}>Notas</Text><Text style={styles.notes}>{quotation.notas}</Text></View> : null}
      <View style={styles.footer}><Text>Los precios indicados son referenciales y están sujetos a confirmación.</Text><Text>Para consultar su cotización, comuníquese con su asesor de viatour.</Text><Text>WhatsApp: +504 8866-8704 | soporte@miviatour.com</Text><Text style={styles.fine}>viatour | asesores de viaje</Text></View>
    </Page>
  </Document>;
}

export async function renderQuotationPdf(quotation: Quotation, items: QuotationItem[]) {
  return renderToBuffer(<PdfDocument quotation={quotation} items={items} />);
}
