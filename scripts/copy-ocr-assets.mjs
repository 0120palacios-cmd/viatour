// Copies the on-device OCR files (passport MRZ reading) from node_modules into public/ocr, so the browser loads
// them from this site and never from a CDN. Runs before `next build` and `next dev`; public/ocr is not committed.
// Files: the tesseract.js worker, the three LSTM engine builds (the browser picks one by its SIMD support) and the
// English model in its compact integer version (4.0.0_best_int, gzip).
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const target = path.join(root, "public", "ocr");
const files = [
  ["node_modules/tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "eng.traineddata.gz"],
];

fs.mkdirSync(target, { recursive: true });
for (const [from, to] of files) {
  const source = path.join(root, from);
  if (!fs.existsSync(source)) throw new Error(`OCR asset missing: ${from}. Run npm install.`);
  fs.copyFileSync(source, path.join(target, to));
}
console.log(`OCR assets copied to public/ocr (${files.length} files).`);
