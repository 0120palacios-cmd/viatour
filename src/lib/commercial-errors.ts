// Only validation messages intentionally raised by our RPCs may reach the UI.
export function commercialError(error: { code?: string; message?: string } | null) {
  if (!error) return "No se pudo completar la operación.";
  if (["PGRST202", "PGRST204", "42703", "42883"].includes(error.code ?? "")) return "Falta la actualización comercial de la base de datos. Solicite al administrador técnico revisar docs/sql/commercial_recovery.sql.";
  if (error.code === "23514" && error.message && !error.message.includes("constraint")) return error.message;
  return "No se pudo completar la operación. Recargue y revise los datos antes de intentar nuevamente.";
}
