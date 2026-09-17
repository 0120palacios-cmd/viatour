import { ImageResponse } from "next/og";
export const size = { width: 180, height: 180 }; export const contentType = "image/png";
export default function Icon() { return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", background: "#1656D6", alignItems: "center", justifyContent: "center" }}><div style={{ width: 64, height: 64, borderRadius: 64, background: "white" }}/></div>, size); }
