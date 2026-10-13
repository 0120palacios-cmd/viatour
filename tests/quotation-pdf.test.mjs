import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pdf } from './pdf-support.mjs';
import { samples, photoBuffers, sampleNow } from './fixtures/quotation-samples.mjs';

// Real renders with react-pdf. Page counts are part of the layout contract: a normal flight or hotel
// quotation fits on one Letter page; long itineraries continue on a second page instead of shrinking.
const expectedPages = {
  'vuelo-directo-ida-y-vuelta': 1,
  'hotel-con-fotos': 1,
  'cotizacion-anterior': 1,
  'vuelo-dos-conexiones': 2,
  'vuelo-aerolineas-mixtas': 2,
  'hotel-habitaciones-complejas': 2,
  'paquete-vuelo-hotel': 2,
};

for (const [name, build] of Object.entries(samples)) {
  test(`PDF ${name} renders on ${expectedPages[name]} page(s)`, async () => {
    const record = build();
    const buffer = await pdf.renderQuotationPdf(record, { photos: photoBuffers(record), now: sampleNow });
    assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
    assert.equal(pdf.pdfPageCount(buffer), expectedPages[name]);
  });
}

test('the PDF never reads internal notes or the pasted itinerary text', () => {
  const source = fs.readFileSync('src/lib/quotation-pdf.tsx', 'utf8');
  assert.ok(!source.includes('notasInternas'));
  assert.ok(!source.includes('textoOriginal'));
});

test('expired and preview quotations still render', async () => {
  const record = samples['vuelo-directo-ida-y-vuelta']();
  const later = new Date('2026-11-01T00:00:00Z');
  const expired = await pdf.renderQuotationPdf(record, { now: later });
  const preview = await pdf.renderQuotationPdf(record, { now: sampleNow, preview: true });
  assert.ok(pdf.pdfPageCount(expired) >= 1);
  assert.ok(pdf.pdfPageCount(preview) >= 1);
});

test('baggage lines describe only what the advisor selected', () => {
  assert.equal(pdf.baggageLine('personal', { estado: 'incluido', piezas: 1, peso: '', medidas: '' }), '1 artículo personal por pasajero');
  assert.equal(pdf.baggageLine('mano', { estado: 'incluido', piezas: 1, peso: '10 kg', medidas: '' }), '1 equipaje de mano en cabina por pasajero (10 kg)');
  assert.equal(pdf.baggageLine('documentado', { estado: 'incluido', piezas: 2, peso: '23 kg', medidas: '' }), '2 maletas documentadas por pasajero (23 kg)');
  assert.equal(pdf.baggageLine('documentado', { estado: 'no_incluido', piezas: null, peso: '', medidas: '' }), 'Equipaje documentado no incluido');
  assert.equal(pdf.baggageLine('mano', { estado: 'con_cargo', piezas: null, peso: '', medidas: '' }), 'Equipaje de mano en cabina disponible con cargo adicional');
  assert.equal(pdf.baggageLine('mano', { estado: '', piezas: null, peso: '', medidas: '' }), '');
});

test('descriptive PDF file names without accents or spaces', () => {
  const record = samples['hotel-con-fotos']();
  assert.equal(pdf.quotationPdfFilename(record), 'cotizacion-COT-20261012-4F2A-cancun-mexico-ana-lucia-perez-martinez.pdf');
  assert.match(pdf.quotationPdfFilename(record, 3), /-v3-/);
});
