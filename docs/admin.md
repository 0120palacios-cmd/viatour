# Stage 7: administración

Ingrese en `/admin/login` con el correo y contraseña de un usuario creado manualmente en Supabase Auth y registrado en `public.admins`. No hay registro público ni restablecimiento público de contraseña. El propietario puede restablecerla desde Supabase.

La interfaz usa los tokens, Manrope, componentes shadcn existentes y AlertDialog de Radix para confirmar eliminaciones. El texto funcional nuevo es un borrador pendiente de aprobación editorial; no se añadió contenido comercial ni testimonios.

## Verificación con una cuenta real

1. Sin sesión, visite `/admin` y cada sección: deben redirigir a `/admin/login`.
2. Inicie sesión con una cuenta administradora: debe ver Resumen, su correo y Cerrar sesión. Una cuenta autenticada fuera de `admins` debe quedar sin acceso. Un error en `is_admin()` también deniega acceso.
3. En Opiniones, filtre pendientes, apruebe una opinión real y abra `/opiniones`: compruebe la publicación y el promedio derivado de `reviews_resumen`. Rechazarla debe retirarla y recalcular el promedio. Cambie Verificada y guarde.
4. En Paquetes, cree un borrador, edite todos sus campos y publíquelo. Compruebe `/paquetes` y `/paquetes/[slug]`. Un precio vacío guarda NULL. Cambiar el slug invalida tanto la URL anterior como la nueva. Un slug duplicado muestra un error.
5. En Destinos, edite contenido, SEO y la lista de preguntas/respuestas, publique y compruebe las páginas públicas. Eliminar paquetes/destinos requiere confirmación; cancelar conserva el registro. Las relaciones que impidan eliminar muestran un error sin destruir otros registros.
6. En Leads, compruebe los campos completos, presupuesto con moneda y payload. Guarde contactado o cerrado y recargue. No se permite eliminar leads.
7. Cierre sesión y compruebe que volver a las secciones exige iniciar sesión.

Los listados usan páginas de 50 registros y las opiniones se filtran en el servidor. El selector de destinos carga hasta 500 destinos. Las imágenes se configuran con URL HTTPS; no se agregó almacenamiento ni subida de paquetes.

## Seguridad y pruebas

El middleware refresca la sesión y comprueba `getUser()` + `is_admin()`. Las páginas, las consultas y todas las mutaciones vuelven a comprobar la autorización en el servidor. Las operaciones utilizan únicamente el cliente Supabase de la sesión y RLS, nunca el cliente con clave de servicio. Las acciones aceptan tablas, estados y campos explícitos; errores de base de datos no se devuelven al navegador. Next.js aplica su comprobación de origen a las Server Actions.

Los datos privados se entregan solo al administrador autorizado para operar la interfaz. Las consultas públicas de opiniones siguen utilizando las vistas con columnas públicas; no incluyen correos. No hay una API pública nueva de lectura administrativa.

`node --test tests/admin.test.mjs tests/reviews.test.mjs tests/leads.test.mjs` comprueba bloqueos de autorización, login de administrador/no administrador, estados, escrituras limitadas, precio NULL, preguntas frecuentes y revalidación de las páginas públicas. Las pruebas de escritura son simuladas: no insertan contenido de prueba en producción. La comprobación completa con sesión y contenido real debe realizarse con los pasos anteriores.
