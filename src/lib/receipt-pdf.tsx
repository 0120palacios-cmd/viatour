/* eslint-disable jsx-a11y/alt-text -- react-pdf Image is not an HTML image and has no alt prop. */
import "server-only";

import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { paymentMethodLabel, type PaymentMethod } from "@/lib/reservation-types";
import { amountInWords } from "@/lib/amount-words";
import { formatAmount, formatTripDate } from "@/lib/trip-format";
import { agencyContact, pdfColors as c, pdfFont, pdfLogo, registerPdfFont } from "@/lib/pdf-kit";

export type Receipt = { id: string; number: string; reservation_id: string; created_at: string; snapshot: { customer: string; reservation: string; amount: number; currency: "USD" | "HNL"; method: PaymentMethod; reference: string | null; date: string; balance: number } };

// Payment receipt: proof that viatour registered a payment. A compact, formal voucher (number box,
// amount in figures and words, ledger rows, balance after the payment), deliberately unlike the
// quotation, confirmation and itinerary. It is built only from the immutable receipt snapshot.
// It is not a fiscal document: see docs/honduras-documentos-fiscales.md.
const s = StyleSheet.create({
  page: { fontFamily: pdfFont, fontSize: 10, color: c.ink, padding: 48, lineHeight: 1.4 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 18, borderBottomWidth: 2, borderBottomColor: c.ink },
  logo: { width: 120, height: 38, objectFit: "contain" },
  agency: { fontSize: 8.5, color: c.inkSoft, marginTop: 6 },
  numberBox: { borderWidth: 1.5, borderColor: c.ink, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14, alignItems: "flex-end" },
  title: { fontSize: 15, fontWeight: 800, letterSpacing: 1.5, lineHeight: 1.3 },
  number: { fontSize: 12, fontWeight: 700, marginTop: 2, lineHeight: 1.3 },
  label: { fontSize: 7.5, fontWeight: 700, color: c.inkSoft, letterSpacing: 0.8 },
  amountBox: { marginTop: 24, padding: 18, borderRadius: 8, backgroundColor: c.surface, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  amount: { fontSize: 26, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.25 },
  sentence: { marginTop: 18, fontSize: 11, lineHeight: 1.6 },
  row: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.line },
  rowLabel: { width: 170, color: c.inkSoft },
  rowValue: { flex: 1, fontWeight: 600 },
  balance: { marginTop: 18, flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: c.line, borderRadius: 6 },
  note: { marginTop: 22, fontSize: 8.5, color: c.inkSoft },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, fontSize: 7.5, color: c.inkSoft, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 6 },
});

export function ReceiptDocument({ receipt }: { receipt: Receipt }) {
  const r = receipt.snapshot;
  const amount = Number(r.amount), balance = Number(r.balance);
  const rows: [string, string][] = [
    ["Recibido de", r.customer],
    ["Concepto", `Pago a cuenta de la reserva ${r.reservation}`],
    ["Fecha del pago", formatTripDate(r.date, "es", "long")],
    ["Forma de pago", paymentMethodLabel(r.method)],
    ["Referencia del pago", r.reference || "No registrada"],
    ["Moneda", r.currency === "USD" ? "Dólares estadounidenses (USD)" : "Lempiras (HNL)"],
  ];
  return <Document title={`Recibo ${receipt.number}`} author="viatour" subject="Recibo de pago" language="es">
    <Page size="LETTER" style={s.page}>
      <View style={s.top}>
        <View><Image src={pdfLogo("black")} style={s.logo} /><Text style={s.agency}>viatour · asesores de viaje</Text><Text style={{ ...s.agency, marginTop: 0 }}>{agencyContact.email} · WhatsApp {agencyContact.whatsapp}</Text></View>
        <View style={s.numberBox}><Text style={s.title}>RECIBO DE PAGO</Text><Text style={s.number}>N.º {receipt.number}</Text><Text style={{ fontSize: 8.5, color: c.inkSoft, marginTop: 2 }}>Emitido el {formatTripDate(receipt.created_at.slice(0, 10), "es", "long")}</Text></View>
      </View>

      <View style={s.amountBox}>
        <View><Text style={s.label}>MONTO RECIBIDO</Text><Text style={s.amount}>{formatAmount(amount, r.currency)}</Text></View>
        <View style={{ alignItems: "flex-end" }}><Text style={s.label}>RESERVA</Text><Text style={{ fontSize: 13, fontWeight: 700 }}>{r.reservation}</Text></View>
      </View>
      <Text style={s.sentence}>Recibimos de <Text style={{ fontWeight: 700 }}>{r.customer}</Text> la cantidad de <Text style={{ fontWeight: 700 }}>{amountInWords(amount, r.currency)}</Text> ({formatAmount(amount, r.currency)}), como pago a cuenta de la reserva {r.reservation}.</Text>

      <View style={{ marginTop: 18, borderTopWidth: 1, borderTopColor: c.line }}>
        {rows.map(([label, value]) => <View key={label} style={s.row}><Text style={s.rowLabel}>{label}</Text><Text style={s.rowValue}>{value}</Text></View>)}
      </View>

      <View style={s.balance}>
        <Text style={{ fontWeight: 700 }}>Saldo de la reserva después de este pago</Text>
        <Text style={{ fontWeight: 800, color: balance <= 0 ? c.success : c.ink }}>{balance <= 0 ? "Pagada en su totalidad" : formatAmount(balance, r.currency)}</Text>
      </View>

      <Text style={s.note}>Este recibo acredita el pago registrado por viatour en la fecha indicada. No constituye factura ni comprobante fiscal. Un depósito solicitado no es un pago recibido hasta que viatour lo registra. Conserve este documento junto con el comprobante de su transferencia o depósito.</Text>

      <Text fixed style={s.footer}>viatour · {agencyContact.web} · Documento generado electrónicamente · Recibo {receipt.number}</Text>
    </Page>
  </Document>;
}

export async function renderReceiptPdf(receipt: Receipt) {
  registerPdfFont();
  return renderToBuffer(<ReceiptDocument receipt={receipt} />);
}
