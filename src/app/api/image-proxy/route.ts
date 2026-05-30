import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import got from "got";
import { registerImage } from "@/lib/image-registry";

const CACHE_DIR = path.join(process.cwd(), "public", "images", "cache");

// Crear directorio si no existe
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get("url");
    const provider = searchParams.get("provider") || "cache";
    const sku = searchParams.get("sku");

    if (!imageUrl) {
      return NextResponse.json({ error: "URL requerida" }, { status: 400 });
    }

    // Crear nombre seguro del archivo
    const fileName = Buffer.from(imageUrl).toString("base64").slice(0, 30) + ".jpg";
    const providerDir = path.join(CACHE_DIR, provider);

    if (!fs.existsSync(providerDir)) {
      fs.mkdirSync(providerDir, { recursive: true });
    }

    const filePath = path.join(providerDir, fileName);
    const localUrl = `/images/cache/${provider}/${fileName}`;

    // Si ya existe en caché, retornar
    if (fs.existsSync(filePath)) {
      const imageBuffer = fs.readFileSync(filePath);
      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "max-age=2592000", // 30 días
        },
      });
    }

    // Descargar y cachear
    try {
      const response = await got(imageUrl, {
        timeout: { request: 10000 },
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": imageUrl.split("/").slice(0, 3).join("/"),
        },
      });

      fs.writeFileSync(filePath, response.rawBody);

      // Registrar imagen si tenemos SKU
      if (sku) {
        registerImage(sku, localUrl, provider);
        console.log(`✅ Imagen cacheada y registrada: ${sku}`);
      }

      return new NextResponse(response.rawBody, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "max-age=2592000",
        },
      });
    } catch (err) {
      console.error(`❌ Error descargando imagen ${imageUrl}: ${err}`);
      // Si no se puede descargar, retornar imagen placeholder
      return new NextResponse(Buffer.from(""), {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
