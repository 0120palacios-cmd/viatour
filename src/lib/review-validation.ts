// Textos funcionales nuevos: borrador pendiente de aprobación final.
export const REVIEW_PHOTO_LIMIT = 3 * 1024 * 1024;
export function validateReview(input: Record<string, unknown>, requireEmail = true) {
  const errors: Record<string, string> = {};
  const field = (key: string, max: number, required = false) => {
    const value = typeof input[key] === "string" ? input[key].trim() : "";
    if ((required && !value) || value.length > max) errors[key] = `Complete este campo (máximo ${max} caracteres).`;
    return value;
  };
  const nombre = field("nombre", 120, true);
  const email = field("email", 254, requireEmail);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Ingrese un correo válido.";
  const texto = field("texto", 3000, true);
  const destino = field("destino", 160);
  const numero_reserva = field("numero_reserva", 80);
  const calificacion = Number(input.calificacion);
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) errors.calificacion = "Seleccione de 1 a 5 estrellas.";
  return { errors, data: { nombre, email: email || null, texto, destino: destino || null, numero_reserva: numero_reserva || null, calificacion } };
}
