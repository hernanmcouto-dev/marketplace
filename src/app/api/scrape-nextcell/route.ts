import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import got from "got";
import { getImageUrl } from "@/lib/image-registry";

export const maxDuration = 600;

const API_BASE = "https://nextcell.com.ar/wp-json/wc/store/products";
const ITEMS_PER_PAGE = 20;
const MARGIN = 1.1; // 10% margen

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

async function fetchAllProducts(): Promise<any[]> {
  const allProducts: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `${API_BASE}?page=${page}&per_page=${ITEMS_PER_PAGE}`;
      const response = await got(url, {
        timeout: { request: 15000 },
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      const products = JSON.parse(response.body);

      if (!Array.isArray(products) || products.length === 0) {
        hasMore = false;
        break;
      }

      allProducts.push(...products);
      page++;

      // Delay entre requests
      await new Promise((r) => setTimeout(r, 300));
    } catch (err: any) {
      if (page === 1) {
        throw new Error(`Error fetching NextCell products: ${err.message}`);
      }
      hasMore = false;
    }
  }

  return allProducts;
}

export async function POST(req: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        sendLog(controller, "🚀 Iniciando scraper de NextCell...");
        sendLog(controller, "📡 Conectando a la API de NextCell...");

        const apiProducts = await fetchAllProducts();

        if (apiProducts.length === 0) {
          sendError(controller, "No se extrajeron productos de NextCell");
          controller.close();
          return;
        }

        sendLog(controller, `✓ Se obtuvieron ${apiProducts.length} productos de la API`);

        // Transformar productos
        const transformedProducts = apiProducts.map((p: any) => {
          // Extraer precio (puede venir como string con formato)
          let unit_price = 0;
          if (p.prices?.price) {
            const priceStr = String(p.prices.price).replace(/[^\d]/g, "");
            unit_price = parseInt(priceStr) || 0;
          }

          // Generar SKU si no existe (usar ID como fallback)
          const sku = p.sku || `NC-${p.id}`;

          // Obtener primera imagen
          const imageUrl = p.images?.[0]?.src || "";

          return {
            sku: `PTT-${sku}`,
            name: p.name || "Sin nombre",
            unit_price: Math.round(unit_price * MARGIN),
            units_per_package: 1,
            image_url: imageUrl,
          };
        });

        sendLog(controller, "🖼️ Procesando imágenes con caché...");

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

          // Si tiene imagen, usar proxy para descarga bajo demanda
          if (product.image_url) {
            const timestamp = Date.now();
            return {
              ...product,
              image_url: `/api/image-proxy?url=${encodeURIComponent(product.image_url)}&provider=nextcell&sku=${product.sku}&v=${timestamp}`,
            };
          }

          return product;
        });

        sendLog(controller, "💾 Guardando productos...");

        const filePath = path.join(process.cwd(), "public", "products-nextcell.json");
        fs.writeFileSync(filePath, JSON.stringify(productsWithProxy, null, 2), "utf-8");

        sendLog(controller, `✅ Guardado en: public/products-nextcell.json`);
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
