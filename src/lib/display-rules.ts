// Public display rule for this phase: pricing remains in the data model but is
// not customer-facing until the display layer is explicitly enabled.
export const PACKAGE_DISPLAY_RULES = {
  mostrar_fechas: false,
  mostrar_precios: false,
} as const;

// Most packages store "Consulte con su asesor" as their duration. Repeated on every card it reads as
// missing data, so only a real duration (one with a number, "7 días / 6 noches") is shown.
export function displayDuration(value: string | null | undefined) {
  const text = value?.trim();
  return text && /\d/.test(text) ? text : null;
}
