# Stage 8: Blog y guias

Las consultas publicas requieren publicado=true. Las mutaciones usan requireAdmin y el cliente de sesion sujeto a RLS; no usan la clave de servicio. Los nuevos registros permanecen en borrador. Publicar requiere fecha. La restriccion unica de slug en Postgres se informa como error de formulario.

Markdown usa react-markdown, remark-gfm y rehype-sanitize, sin HTML crudo. Los encabezados se limitan a H2/H3; las imagenes en Markdown se muestran como texto alternativo, y las portadas se restringen al bucket blog-images.

La carga requiere sesion e is_admin(), formatos JPEG/PNG/WebP, firma de archivo y hasta 5 MB. Storage debe permitir INSERT a administradores autenticados en blog-images. No se usa service role como alternativa a permisos faltantes.

Verificacion: npm run build, npm run lint, npm run typecheck, node --test tests/blog.test.mjs tests/admin.test.mjs tests/leads.test.mjs tests/reviews.test.mjs, y con servidor activo node tests/blog-smoke.mjs.

Pendiente manual con sesion real: en /admin/blog cree un borrador, confirme que no es publico, edite y publique con fecha, suba una foto real y confirme el objeto en blog-images, cambie el slug y compruebe la ruta antigua, y elimine mediante el dialogo. No publicar contenido de prueba en produccion.

Copy pendiente de aprobacion final: introduccion de /blog. No se agregaron articulos ni un teaser a Inicio.
