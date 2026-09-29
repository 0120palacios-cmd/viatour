import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { validUuid } from "@/lib/quotation-validation";

export const portalCookieName = "viatour-portal";
export const portalPendingCookieName = "viatour-portal-pending";
export const portalCookieMaxAge = 30 * 60;
export const portalPendingMaxAge = 10 * 60;
export const portalOtpLifetimeSeconds = 10 * 60;
export const portalOtpMaxAttempts = 5;

function portalSecret() {
  const secret = process.env.PORTAL_SECRET;
  if (!secret) throw new Error("PORTAL_SECRET no está configurado.");
  return secret;
}

function signatureForReservation(id: string, expiresAt: number, nonce: string) {
  return createHmac("sha256", portalSecret()).update(`portal:${id}:${expiresAt}:${nonce}`).digest("base64url");
}

function signatureForPending(id: string, expiresAt: number) {
  return createHmac("sha256", portalSecret()).update(`portal-pending:${id}:${expiresAt}`).digest("base64url");
}

// The session carries its own expiry and a random nonce, so a copied value stops working
// after portalCookieMaxAge and each login yields a different value.
export function signPortalReservationId(id: string, expiresAt = Math.floor(Date.now() / 1000) + portalCookieMaxAge) {
  if (!validUuid(id) || !Number.isSafeInteger(expiresAt)) throw new Error("Identificador de reserva inválido.");
  const nonce = randomBytes(12).toString("base64url");
  return `${id}.${expiresAt}.${nonce}.${signatureForReservation(id, expiresAt, nonce)}`;
}

export function verifyPortalCookie(value: string | undefined | null) {
  if (!value || value.length > 320) return null;
  const parts = value.split(".");
  const expiresAt = Number(parts[1]);
  if (parts.length !== 4 || !validUuid(parts[0]) || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || expiresAt > Math.floor(Date.now() / 1000) + portalCookieMaxAge || !/^[A-Za-z0-9_-]{8,32}$/.test(parts[2]) || !parts[3]) return null;
  try {
    const received = Buffer.from(parts[3], "base64url");
    const expected = Buffer.from(signatureForReservation(parts[0], expiresAt, parts[2]), "base64url");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    return parts[0];
  } catch {
    return null;
  }
}

export function signPortalPendingReservationId(id: string, expiresAt = Math.floor(Date.now() / 1000) + portalPendingMaxAge) {
  if (!validUuid(id) || !Number.isSafeInteger(expiresAt)) throw new Error("Identificador de reserva inválido.");
  return `${id}.${expiresAt}.${signatureForPending(id, expiresAt)}`;
}

export function verifyPortalPendingCookie(value: string | undefined | null) {
  if (!value || value.length > 320) return null;
  const parts = value.split(".");
  const expiresAt = Number(parts[1]);
  if (parts.length !== 3 || !validUuid(parts[0]) || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
  try {
    const received = Buffer.from(parts[2], "base64url");
    const expected = Buffer.from(signatureForPending(parts[0], expiresAt), "base64url");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    return parts[0];
  } catch {
    return null;
  }
}

export function hashPortalOtp(reservationId: string, otp: string) {
  return createHmac("sha256", portalSecret()).update(`portal-otp:${reservationId}:${otp}`).digest("hex");
}

export function matchesPortalOtp(reservationId: string, otp: string, storedHash: string) {
  try {
    const expected = Buffer.from(hashPortalOtp(reservationId, otp), "hex");
    const received = Buffer.from(storedHash, "hex");
    return expected.length === received.length && timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}
