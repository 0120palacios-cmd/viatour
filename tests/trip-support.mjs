// Loads the traveller-experience modules (trip view, formatting, email) outside Next, with the real
// pure dependencies, like pdf-support.mjs does for the quotation PDF.
import { load } from './security-support.mjs';
import fs from 'node:fs';
import { details, itinerary, reference } from './pdf-support.mjs';
const { createTranslator } = await import('next-intl');
const messages = JSON.parse(fs.readFileSync('messages/es.json', 'utf8'));
export const tripCopyModule = { tripCopy: () => createTranslator({ locale: 'es', messages, namespace: 'trip' }) };

export const travelServicesModule = load('src/lib/travel-services.ts', { '@/lib/quotation-details': details });
export const opsModule = load('src/lib/travel-operations.ts', {}, { Set });
export const portalSummary = load('src/lib/portal-summary.ts', {}, { Intl });
export const format = load('src/lib/trip-format.ts', {}, { Intl });
export const emailLayout = load('src/lib/email-layout.ts');

export function tripViewModule(travelServices = travelServicesModule, ops = opsModule) {
  return load('src/lib/trip-view.ts', { '@/lib/quotation-details': details, '@/lib/travel-services': travelServices, '@/lib/flight-itinerary': itinerary, '@/lib/flight-reference': reference, '@/lib/travel-operations': ops, '@/lib/portal-summary': portalSummary }, { Set, Map, Intl });
}

export function tripEmailDeps(travelServices = travelServicesModule, ops = opsModule) {
  return { '@/lib/portal-summary': portalSummary, '@/lib/trip-view': tripViewModule(travelServices, ops), '@/lib/trip-format': format, '@/lib/email-layout': emailLayout, '@/lib/trip-copy': tripCopyModule };
}
