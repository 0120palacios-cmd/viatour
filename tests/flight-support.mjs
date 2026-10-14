import { load } from './security-support.mjs';
export const reference = load('src/lib/flight-reference.ts');
export const itinerary = load('src/lib/flight-itinerary.ts', { '@/lib/flight-reference': reference });
export const parser = load('src/lib/flight-parser.ts', { '@/lib/flight-reference': reference, '@/lib/flight-itinerary': itinerary });
