/* eslint-disable @next/next/no-img-element -- ImageResponse renders PNG on the server; next/image cannot be used in Satori. */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
export async function GET() { const logo = await readFile(join(process.cwd(), "public/logo-black.png")); return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", background: "#FFFFFF", borderBottom: "24px solid #1656D6", alignItems: "center", justifyContent: "center" }}>{/* Actual logo artwork. */}<img src={`data:image/png;base64,${logo.toString("base64")}`} width={600} height={Math.round(600 * logo.readUInt32BE(20) / logo.readUInt32BE(16))} alt="viatour" /></div>, { width: 1200, height: 630 }); }
