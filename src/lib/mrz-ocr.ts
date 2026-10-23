"use client";

import { parseMrz, type MrzResult } from "@/lib/mrz";

// Reads the MRZ from a photo of the passport, entirely in this browser: the OCR engine and the model are served
// from /ocr on this site (scripts/copy-ocr-assets.mjs) and the image never leaves the device.
// The bottom of the document is tried first (where the MRZ is), then larger areas; the first reading whose check
// digits all pass wins, otherwise the reading with the most passing checks is returned for the advisor to correct.

export type OcrReading = { text: string; result: MrzResult | null };
const passing = (result: MrzResult | null) => result ? Object.values(result.checks).filter(Boolean).length + (result.valid ? 1 : 0) : -1;

// Grayscale, enlarged to a width the engine reads well, and contrast stretched so the printed characters stand out.
async function prepare(bitmap: ImageBitmap, fromTop: number) {
  const top = Math.round(bitmap.height * fromTop), height = bitmap.height - top;
  const scale = Math.min(3, Math.max(1, 1800 / bitmap.width));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("canvas");
  context.drawImage(bitmap, 0, top, bitmap.width, height, 0, 0, canvas.width, canvas.height);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  let min = 255, max = 0;
  for (let i = 0; i < data.length; i += 4) { const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; data[i] = gray; if (gray < min) min = gray; if (gray > max) max = gray; }
  const range = Math.max(1, max - min);
  for (let i = 0; i < data.length; i += 4) { const value = Math.max(0, Math.min(255, ((data[i] - min) / range) * 255 * 1.15 - 20)); data[i] = data[i + 1] = data[i + 2] = value; }
  context.putImageData(image, 0, 0);
  return canvas;
}

export async function readMrzFromImage(file: File, onProgress: (percent: number) => void = () => {}): Promise<OcrReading> {
  const { createWorker, OEM, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    workerPath: "/ocr/worker.min.js", corePath: "/ocr", langPath: "/ocr", gzip: true, workerBlobURL: false,
    logger: message => { if (message.status === "recognizing text") onProgress(Math.round(message.progress * 100)); },
  });
  try {
    await worker.setParameters({ tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<", tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: "0" });
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    let best: OcrReading = { text: "", result: null };
    for (const fromTop of [0.62, 0.5, 0.3, 0]) {
      const { data } = await worker.recognize(await prepare(bitmap, fromTop));
      const result = parseMrz(data.text);
      if (passing(result) > passing(best.result)) best = { text: data.text, result };
      if (result?.valid) break;
    }
    return best;
  } finally {
    await worker.terminate();
  }
}
