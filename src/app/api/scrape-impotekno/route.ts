import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import got from "got";
import { CookieJar } from "tough-cookie";
import { downloadAndCacheImage, getImageUrl } from "@/lib/image-registry";
import { categorizeProduct } from "@/lib/product-categorizer";

interface ScraperReport {
  newProducts: number;
  newImages: number;
  cachedImages: number;
  removedProducts: string[];
  totalProducts: number;
  timestamp: string;
}

export const maxDuration = 600;

const CATEGORIES = [1, 2, 9, 10, 18, 22, 23, 29, 33, 44, 48, 51, 56, 61, 73, 78, 82, 83, 84, 85, 87, 88];

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

function sendReport(controller: ReadableStreamDefaultController, report: ScraperReport) {
  const reportMsg = JSON.stringify({
    type: "report",
    report,
  });
  controller.enqueue(`data: ${reportMsg}\n\n`);
}

async function extractProductsFromHtml(html: string): Promise<any[]> {
  const products: any[] = [];

  // Buscar bloques de productos (caja_producto)
  const productBlockRegex = /<div class="col-xs-12 caja_producto">[\s\S]*?<\/div>\s*<\/div>/g;
  const blocks = html.match(productBlockRegex) || [];

  for (const block of blocks) {
    // Extraer nombre (dentro de <h1>)
    const nameMatch = block.match(/<h1>(.*?)<\/h1>/);
    const name = nameMatch ? nameMatch[1].trim() : null;

    // Extraer SKU (después de "Codigo:")
    const skuMatch = block.match(/Codigo:\s*([^\<\n]+)/);
    const sku = skuMatch ? skuMatch[1].trim() : null;

    // Extraer cantidad por bulto
    const quantityMatch = block.match(/Ctdad\.\s*por\s*bulto:\s*([0-9]+)/);
    const units_per_package = quantityMatch ? parseInt(quantityMatch[1]) : 1;

    // Extraer precio (dentro de caja_precio)
    const priceMatch = block.match(/<strong class="caja_precio">\s*\$\s*([0-9,]+)/);
    let unit_price = 0;
    if (priceMatch) {
      const priceStr = priceMatch[1].replace(/,/g, "");
      unit_price = parseInt(priceStr) || 0;
    }

    if (sku && name && unit_price > 0) {
      // Remover prefijo SAR- si ya está, para evitar duplicación
      const cleanSku = sku.replace(/^SAR-/, "");

      products.push({
        sku: cleanSku,
        name,
        unit_price: unit_price, // Sin margen aquí - se aplica después
        units_per_package,
        image_url: `https://www.impotekno.com/fotos/${cleanSku}.jpg`,
      });
    }
  }

  return products;
}

export async function POST(req: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        sendLog(controller, "🚀 Iniciando scraper de Impotekno...");
        sendLog(controller, "🔐 Realizando login...");

        // Crear cliente con CookieJar para mantener sesión
        const cookieJar = new CookieJar();
        const client = got.extend({
          cookieJar,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        // Login
        try {
          await client.post("https://www.impotekno.com/index.php", {
            form: {
              clave: "sarmiento",
              enviar: "Ingresar",
            },
          });
          sendLog(controller, "✓ Login exitoso");
        } catch (err: any) {
          sendLog(controller, `⚠️ Login falló: ${err.message}`);
        }

        const allProducts: any[] = [];

        for (let i = 0; i < CATEGORIES.length; i++) {
          const categoryId = CATEGORIES[i];
          sendProgress(controller, i, CATEGORIES.length, `Extrayendo categoría ${categoryId}...`);

          try {
            const response = await client.get(
              `https://www.impotekno.com/catalogo_imptk.php?rub=${categoryId}`
            );

            const html = response.body;
            const products = await extractProductsFromHtml(html);

            if (products.length > 0) {
              sendLog(controller, `✓ Categoría ${categoryId}: ${products.length} productos`);
              allProducts.push(...products);
            } else {
              sendLog(controller, `⚠️ Categoría ${categoryId}: Sin productos`);
            }

            await new Promise((r) => setTimeout(r, 500));
          } catch (err: any) {
            sendLog(controller, `❌ Error en categoría ${categoryId}: ${err.message}`);
          }
        }

        if (allProducts.length === 0) {
          sendError(controller, "No se extrajeron productos. Verifica la clave de acceso.");
          controller.close();
          return;
        }

        sendLog(controller, `📊 Total extraído: ${allProducts.length} productos`);
        sendProgress(controller, CATEGORIES.length, CATEGORIES.length, "Procesando productos...");

        // Crear mapa de productos anteriores por SKU para referencia rápida
        const previousProductsMap = new Map(previousProducts.map(p => [p.sku, p]));

        // Transformar productos con prefijo, margen del 15%
        // Categorizar solo NUEVOS, mantener categoría de EXISTENTES
        const transformedProducts = allProducts.map((p) => {
          const sku = `SAR-${p.sku}`;
          const previousProduct = previousProductsMap.get(sku);

          // Si ya existe, mantener su categoría anterior
          // Si es nuevo, categorizar automáticamente
          const category = previousProduct?.category || categorizeProduct(p.name).primary;

          return {
            sku,
            name: p.name,
            unit_price: Math.round(p.unit_price * 1.15), // 15% margen único
            units_per_package: p.units_per_package,
            image_url: p.image_url,
            category,
          };
        });

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
          const timestamp = Date.now();
          return {
            ...product,
            image_url: `/api/image-proxy?url=${encodeURIComponent(product.image_url)}&provider=impotekno&sku=${product.sku}&v=${timestamp}`,
          };
        });

        sendLog(controller, "💾 Guardando productos y generando informe...");

        const filePath = path.join(process.cwd(), "public", "products.json");

        // Leer productos anteriores para comparación
        let previousProducts: any[] = [];
        try {
          if (fs.existsSync(filePath)) {
            previousProducts = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          }
        } catch (err) {
          sendLog(controller, "⚠️ No se pudo leer el archivo anterior");
        }

        // Comparar productos
        const previousSkus = new Set(previousProducts.map(p => p.sku));
        const currentSkus = new Set(productsWithProxy.map(p => p.sku));

        const newSkus = Array.from(currentSkus).filter(sku => !previousSkus.has(sku));
        const removedSkus = Array.from(previousSkus).filter(sku => !currentSkus.has(sku));

        // Contar imágenes nuevas vs. cacheadas
        let newImages = 0;
        let cachedImages = 0;
        productsWithProxy.forEach(p => {
          if (p.image_url.includes("/api/image-proxy")) {
            newImages++;
          } else if (p.image_url.startsWith("/images/")) {
            cachedImages++;
          }
        });

        // Guardar productos
        fs.writeFileSync(filePath, JSON.stringify(productsWithProxy, null, 2), "utf-8");

        // Generar informe pero NO enviarlo automáticamente
        const newProductsDetails = productsWithProxy.filter(p => newSkus.has(p.sku));
        const removedProductsDetails = previousProducts.filter(p => removedSkus.has(p.sku));

        const report: ScraperReport = {
          newProducts: newSkus.length,
          newImages,
          cachedImages,
          removedProducts: removedSkus,
          totalProducts: productsWithProxy.length,
          timestamp: new Date().toISOString(),
        };

        // Guardar reporte en archivo para acceso posterior
        const reportFilePath = path.join(process.cwd(), "public", ".scraping-report-impotekno.json");
        fs.writeFileSync(reportFilePath, JSON.stringify({
          report,
          newProductsDetails,
          removedProductsDetails,
          updatedCount: productsWithProxy.length - newSkus.length - removedSkus.length,
        }, null, 2), "utf-8");

        sendLog(controller, `✅ Guardado en: public/products.json`);
        sendLog(controller, `✓ ${newSkus.length} nuevos, ${removedSkus.length} eliminados`);
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
