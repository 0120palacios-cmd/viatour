"use client";

import { createContext, useContext } from "react";
import type { AirlineEntry, HotelCatalogEntry } from "@/lib/catalog";

// Hotel and airline catalogs for the quotation editor (admin-only data loaded by the page). Sections read
// them from context so the same editors work inside a combined package without extra props.
export type EditorCatalogValue = { ready: boolean; hotels: HotelCatalogEntry[]; airlines: AirlineEntry[]; recentAirlines: string[]; recentPresets: string[] };

export const emptyCatalogs: EditorCatalogValue = { ready: false, hotels: [], airlines: [], recentAirlines: [], recentPresets: [] };
const CatalogContext = createContext<EditorCatalogValue>(emptyCatalogs);

export const CatalogProvider = CatalogContext.Provider;
export function useCatalogs() {
  return useContext(CatalogContext);
}

// The catalog airline a fare or segment refers to, by exact name (accents and case ignored) or IATA code.
export function findAirline(airlines: AirlineEntry[], name: string) {
  const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  const target = fold(name);
  if (!target) return null;
  return airlines.find(airline => fold(airline.nombre) === target || (airline.iata && airline.iata.toLowerCase() === target)) ?? null;
}
