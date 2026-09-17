import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function POST(request: Request) {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user)
        return NextResponse.json({ error: "Inicie sesión para subir imágenes." }, { status: 401 });
    const admin = await client.rpc("is_admin");
    if (admin.error || admin.data !== true)
        return NextResponse.json({ error: "Su cuenta no tiene acceso." }, { status: 403 });
    if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024)
        return NextResponse.json({ error: "El archivo supera el tama?o permitido." }, { status: 413 });
    try {
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024)
            return NextResponse.json({ error: "Seleccione una imagen de hasta 5 MB." }, { status: 400 });
        const bytes = new Uint8Array(await file.arrayBuffer());
        const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
        const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
        const webp = new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
        const extension = jpeg && file.type === "image/jpeg" ? "jpg" : png && file.type === "image/png" ? "png" : webp && file.type === "image/webp" ? "webp" : null;
        if (!extension)
            return NextResponse.json({ error: "Use una imagen JPEG, PNG o WebP válida." }, { status: 400 });
        const path = user.id + "/" + crypto.randomUUID() + "." + extension;
        const { error } = await client.storage.from("blog-images").upload(path, bytes, { contentType: file.type, upsert: false });
        if (error)
            return NextResponse.json({ error: "No se pudo subir la portada. Revise los permisos de blog-images." }, { status: 400 });
        return NextResponse.json({ url: client.storage.from("blog-images").getPublicUrl(path).data.publicUrl });
    }
    catch {
        return NextResponse.json({ error: "No se pudo procesar la imagen." }, { status: 400 });
    }
}
