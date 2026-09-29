// Public display rule for this phase: pricing remains in the data model but is
// not customer-facing until the display layer is explicitly enabled.
export const PACKAGE_DISPLAY_RULES = {
  mostrar_fechas: false,
  mostrar_precios: false,
} as const;
