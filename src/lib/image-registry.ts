import fs from "fs";
import path from "path";

const REGISTRY_FILE = path.join(process.cwd(), "public", "images", "registry.json");
const IMAGES_DIR = path.join(process.cwd(), "public", "images");

interface ImageRegistry {
  [sku: string]: {
    url: string; // URL local: /images/provider/sku.jpg
    downloadedAt: string;
    provider: string;
  };
}

function ensureRegistry() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  if (!fs.existsSync(REGISTRY_FILE)) {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify({}, null, 2), "utf-8");
  }
}

export function getRegistry(): ImageRegistry {
  ensureRegistry();
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export function getImageUrl(sku: string): string | null {
  const registry = getRegistry();
  return registry[sku]?.url || null;
}

export function registerImage(
  sku: string,
  localUrl: string,
  provider: string
): void {
  ensureRegistry();
  const registry = getRegistry();

  registry[sku] = {
    url: localUrl,
    downloadedAt: new Date().toISOString(),
    provider,
  };

  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), "utf-8");
}

export function imageExists(sku: string): boolean {
  const registry = getRegistry();
  if (!registry[sku]) return false;

  // Verificar que el archivo existe
  const url = registry[sku].url;
  const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  return fs.existsSync(filePath);
}

export async function downloadAndCacheImage(
  imageUrl: string,
  sku: string,
  provider: string,
  forceDownload: boolean = false
): Promise<string> {
  // Si ya existe y no forzamos, retornar la existente
  if (!forceDownload && imageExists(sku)) {
    const existing = getImageUrl(sku);
    if (existing) return existing;
  }

  try {
    const got = require("got");

    const ext = imageUrl.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${sku}.${ext}`;
    const providerDir = path.join(IMAGES_DIR, provider);

    // Crear directorio del provider
    if (!fs.existsSync(providerDir)) {
      fs.mkdirSync(providerDir, { recursive: true });
    }

    const filePath = path.join(providerDir, fileName);
    const localUrl = `/images/${provider}/${fileName}`;

    // Descargar con reintentos
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await got(imageUrl, {
          timeout: 10000,
          retry: { limit: 0 },
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": imageUrl.split("/").slice(0, 3).join("/"),
          },
        });

        fs.writeFileSync(filePath, response.rawBody);
        registerImage(sku, localUrl, provider);
        return localUrl;
      } catch (err: any) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    console.error(
      `❌ No se pudo descargar imagen para ${sku}: ${lastError?.message}`
    );
    return imageUrl; // Fallback a URL original si falla descarga
  } catch (err: any) {
    console.error(`Error en downloadAndCacheImage para ${sku}: ${err.message}`);
    return imageUrl; // Fallback a URL original
  }
}
