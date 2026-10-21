import "server-only";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
function key() {
  const value = process.env.TRAVEL_DATA_KEY;
  if (!value || !/^[0-9a-fA-F]{64}$/.test(value)) throw Error("Configure la clave de cifrado del expediente antes de guardar datos personales.");
  return Buffer.from(value,"hex");
}
export function sealTravel(value: unknown, reservationId: string) {
  const iv=randomBytes(12), cipher=createCipheriv("aes-256-gcm",key(),iv);
  cipher.setAAD(Buffer.from(reservationId));
  const data=Buffer.concat([cipher.update(JSON.stringify(value),"utf8"),cipher.final()]);
  return ["v1",iv.toString("base64"),cipher.getAuthTag().toString("base64"),data.toString("base64")].join(".");
}
export function openTravel(value: string, reservationId: string): unknown {
  const [version,iv,tag,data]=value.split(".");
  if(version!=="v1") throw Error("Versión de cifrado no compatible.");
  const cipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(iv,"base64"));
  cipher.setAAD(Buffer.from(reservationId));cipher.setAuthTag(Buffer.from(tag,"base64"));
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(data,"base64")),cipher.final()]).toString("utf8"));
}
