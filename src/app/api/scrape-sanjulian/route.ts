import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import got from "got";
import { CookieJar } from "tough-cookie";
import { downloadAndCacheImage, getImageUrl } from "@/lib/image-registry";

export const maxDuration = 600;

const CATEGORIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 99999];

function sendLog(controller: ReadableStreamDefaultController, message: string) {
  const log = JSON.stringify({ type: "log", message });
  controller.enqueue(`data: ${log}\n\n`);
}

function sendProgress(
  controller: ReadableStreamDefaultController,
  current: number,
  total: number,
  message: string
) {
  const progress = JSON.stringify({
    type: "progress",
    current,
    total,
    percentage: Math.round((current / total) * 100),
    message,
  });
  controller.enqueue(`data: ${progress}\n\n`);
}

function sendError(controller: ReadableStreamDefaultController, error: string) {
  const err = JSON.stringify({ type: "error", error });
  controller.enqueue(`data: ${err}\n\n`);
}

function sendComplete(controller: ReadableStreamDefaultController, count: number) {
  const complete = JSON.stringify({
    type: "complete",
    count,
    message: `✓ ${count} productos importados exitosamente`,
  });
  controller.enqueue(`data: ${complete}\n\n`);
}

function extractProducts(html: string): any[] {
  const products: any[] = [];

  // Buscar bloques de productos: <a name="SKU"> seguido de <h1>NOMBRE</h1> y precio en <strong>
  const productBlockRegex = /<a\s+(?:name|id)="([^"]+)"[^>]*>[\s\S]*?<h1>([^<]+)<\/h1>[\s\S]*?Codigo:\s*([^\<\n]+)[\s\S]*?<strong[^>]*>[\s\S]*?\$\s*([0-9,]+)/g;

  let match;
  while ((match = productBlockRegex.exec(html)) !== null) {
    const sku = match[1].trim();
    const name = match[2].trim();
    const priceStr = match[4].replace(/,/g, "").trim();
    const unit_price = parseInt(priceStr) || 0;

    if (sku && name && unit_price > 0) {
      products.push({
        sku,
        name,
        unit_price,
        units_per_package: 1,
        image_url: `https://sanjulian99.com/fotos/${sku}.jpg`,
      });
    }
  }

  return products;
}

export async function POST(req: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        sendLog(controller, "🚀 Iniciando scraper de San Julián...");

        const products: any[] = [];
        const categoryIds = CATEGORIES;

        const cookieJar = new CookieJar();
        const client = got.extend({
          cookieJar,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        sendLog(controller, "🔐 Haciendo login...");
        try {
          await client.post("https://sanjulian99.com/index.php", {
            form: {
              clave: "pasteur",
              enviar: "Ingresar",
            },
          });
          sendLog(controller, "✓ Login exitoso");
        } catch (err: any) {
          sendLog(controller, `⚠️ Error en login: ${err.message}`);
        }

        for (let i = 0; i < categoryIds.length; i++) {
          const categoryId = categoryIds[i];

          sendProgress(
            controller,
            i,
            categoryIds.length,
            `Extrayendo categoría ${categoryId}...`
          );

          try {
            const response = await client.get(
              `https://sanjulian99.com/catalogo2021.php?rub=${categoryId}`
            );

            const html = response.body;
            const categoryProducts = extractProducts(html);
            products.push(...categoryProducts);
            sendLog(
              controller,
              `✓ Categoría ${categoryId}: ${categoryProducts.length} productos`
            );
          } catch (err: any) {
            sendLog(
              controller,
              `⚠️ Error en categoría ${categoryId}: ${err.message}`
            );
          }

          await new Promise((r) => setTimeout(r, 300));
        }

        sendLog(controller, `📊 Total extraído: ${products.length} productos`);

        if (products.length === 0) {
          sendError(
            controller,
            "No se extrajeron productos del sitio"
          );
          controller.close();
          return;
        }

        // Transformar productos
        const transformedProducts = products.map((p) => ({
          sku: `PAS-${p.sku}`,
          name: p.name,
          unit_price: Math.round(p.unit_price * 1.1),
          units_per_package: p.units_per_package,
          image_url: p.image_url,
        }));

        sendLog(controller, "🖼️ Proxy inteligente de imágenes (caché bajo demanda)...");

        // Usar proxy con caché inteligente
        const productsWithProxy = transformedProducts.map((product) => {
          // Buscar si ya tiene imagen cacheada
          const cachedUrl = getImageUrl(product.sku);
          if (cachedUrl) {
            sendLog(controller, `♻️ Reutilizando caché: ${product.sku}`);
            return {
              ...product,
              image_url: cachedUrl,
            };
          }

          // Usar proxy para descarga bajo demanda
          return {
            ...product,
            image_url: `/api/image-proxy?url=${encodeURIComponent(product.image_url)}&provider=sanjulian&sku=${product.sku}`,
          };
        });

        sendLog(controller, "💾 Guardando productos...");

        const filePath = path.join(
          process.cwd(),
          "public",
          "products-sanjulian.json"
        );
        fs.writeFileSync(
          filePath,
          JSON.stringify(productsWithProxy, null, 2),
          "utf-8"
        );

        sendLog(controller, `✅ Guardado en: public/products-sanjulian.json`);
        sendComplete(controller, productsWithProxy.length);
        controller.close();
      } catch (err: any) {
        sendError(controller, err.message || "Error desconocido");
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
