import fs from "fs";
import path from "path";
import got from "got";

const IMAGES_DIR = path.join(process.cwd(), "public", "images");

// Crear directorio si no existe
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

export async function downloadAndSaveImage(
  imageUrl: string,
  fileName: string,
  subdirectory: string = "products"
): Promise<string | null> {
  try {
    if (!imageUrl) {
      return null;
    }

    // Crear subdirectorio si no existe
    const subDir = path.join(IMAGES_DIR, subdirectory);
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }

    const filePath = path.join(subDir, fileName);

    // Si ya existe, retornar la ruta local
    if (fs.existsSync(filePath)) {
      return `/images/${subdirectory}/${fileName}`;
    }

    // Descargar imagen con reintentos
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await got(imageUrl, {
          timeout: { request: 10000 },
          retry: { limit: 0 },
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://sanjulian99.com/",
          },
        });

        // Guardar imagen
        fs.writeFileSync(filePath, response.rawBody);
        console.log(`✓ Imagen descargada: ${fileName}`);
        return `/images/${subdirectory}/${fileName}`;
      } catch (err: any) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    console.error(`Error descargando imagen ${imageUrl} después de 3 intentos: ${lastError?.message}`);
    return null;
  } catch (err: any) {
    console.error(`Error procesando imagen ${imageUrl}: ${err.message}`);
    return null;
  }
}

export async function downloadProductImages(
  products: any[],
  provider: string
): Promise<any[]> {
  const subdirectory = provider.toLowerCase().replace(/\s+/g, "-");

  return Promise.all(
    products.map(async (product) => {
      try {
        // Extraer extensión de la URL o usar .jpg por defecto
        const ext = product.image_url?.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${product.sku}.${ext}`;

        const localUrl = await downloadAndSaveImage(
          product.image_url,
          fileName,
          subdirectory
        );

        return {
          ...product,
          image_url: localUrl || product.image_url,
        };
      } catch (err) {
        console.error(`Error procesando imagen para ${product.sku}`);
        return product;
      }
    })
  );
}
