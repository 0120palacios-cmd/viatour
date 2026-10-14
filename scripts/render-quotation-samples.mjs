// Renders the sample quotations used by the PDF tests so the layout can be reviewed by eye.
// Usage: node scripts/render-quotation-samples.mjs <output-folder>
// Uses test data only (tests/fixtures/quotation-samples.mjs); it does not read or write Supabase.
import fs from 'node:fs';
import path from 'node:path';
import { pdf } from '../tests/pdf-support.mjs';
import { samples, photoBuffers, sampleNow } from '../tests/fixtures/quotation-samples.mjs';

const output = process.argv[2];
if (!output) {
  console.error('Usage: node scripts/render-quotation-samples.mjs <output-folder>');
  process.exit(1);
}
fs.mkdirSync(output, { recursive: true });
for (const [name, build] of Object.entries(samples)) {
  const record = build();
  const buffer = await pdf.renderQuotationPdf(record, { photos: photoBuffers(record), now: sampleNow });
  fs.writeFileSync(path.join(output, `${name}.pdf`), buffer);
  console.log(`${name}.pdf · ${pdf.pdfPageCount(buffer)} page(s)`);
}
