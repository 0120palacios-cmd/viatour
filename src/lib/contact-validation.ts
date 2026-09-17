// Copy funcional: borrador pendiente de aprobación.
export function validateContact(input: Record<string, unknown>) { const values = Object.fromEntries(["nombre", "email", "telefono", "mensaje", "website"].map(k => [k, typeof input[k] === "string" ? input[k].trim() : ""])); const errors: Record<string, string> = {}; if (!values.nombre || values.nombre.length > 120)
    errors.nombre = "Ingrese su nombre (máximo 120 caracteres)."; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || values.email.length > 254)
    errors.email = "Ingrese un correo electrónico válido."; if (!values.mensaje || values.mensaje.length > 3000)
    errors.mensaje = "Escriba su mensaje (máximo 3000 caracteres)."; if (values.telefono && (!/^[+0-9() .-]+$/.test(values.telefono) || values.telefono.length > 40))
    errors.telefono = "Revise su teléfono."; return { values, errors }; }
