import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import got from "got";
import { CookieJar } from "tough-cookie";
import { uploadImageToS3 } from "@/lib/s3-upload";
import { categorizeProduct } from "@/lib/product-categorizer";

interface ScraperReport {
  newProducts: number;
  newImages: number;
  cachedImages: number;
  removedProducts: string[];
  totalProducts: number;
  timestamp: string;
}

export const maxDuration = 300;

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

function sendReport(controller: ReadableStreamDefaultController, report: ScraperReport) {
  const reportMsg = JSON.stringify({
    type: "report",
    report,
  });
  controller.enqueue(`data: ${reportMsg}\n\n`);
}

function extractProducts(html: string): any[] {
  const products: any[] = [];
  const invalidSkus = ["inicio", "indice", "index", "header", "footer", "nav", "menu"];

  const productBlockRegex = /<a\s+(?:name|id)="([^"]+)"[^>]*>[\s\S]*?<h1>([^<]+)<\/h1>[\s\S]*?Codigo:\s*([^\<\n]+)[\s\S]*?<strong[^>]*>[\s\S]*?\$\s*([0-9,]+)/g;

  let match;
  while ((match = productBlockRegex.exec(html)) !== null) {
    const sku = match[1].trim();
    const name = match[2].trim();
    const priceStr = match[4].replace(/,/g, "").trim();
    const unit_price = parseInt(priceStr) || 0;

    if (sku && name && unit_price > 0 && !invalidSkus.includes(sku.toLowerCase())) {
      const cleanSku = sku.replace(/^PAS-/, "");
      products.push({
        sku: cleanSku,
        name,
        unit_price,
        units_per_package: 1,
        image_url: `https://sanjulian99.com/fotos/${cleanSku}.jpg`,
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
        sendLog(controller, "🔐 Realizando login...");

        const cookieJar = new CookieJar();
        const client = got.extend({
          cookieJar,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        try {
          await client.post("https://sanjulian99.com/index.php", {
            form: {
              clave: "pasteur",
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
              `https://sanjulian99.com/catalogo2021.php?rub=${categoryId}`
            );

            const html = response.body;
            const products = extractProducts(html);

            if (products.length > 0) {
              sendLog(controller, `✓ Categoría ${categoryId}: ${products.length} productos`);
              allProducts.push(...products);
            } else {
              sendLog(controller, `⚠️ Categoría ${categoryId}: Sin productos`);
            }

            await new Promise((r) => setTimeout(r, 300));
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

        const filePath = path.join(process.cwd(), "public", "products-sanjulian.json");

        // Leer productos anteriores para comparación
        let previousProducts: any[] = [];
        try {
          if (fs.existsSync(filePath)) {
            previousProducts = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          }
        } catch (err) {
          sendLog(controller, "⚠️ No se pudo leer el archivo anterior");
        }

        const previousProductsMap = new Map(previousProducts.map(p => [p.sku, p]));

        const transformedProducts = allProducts.map((p) => {
          const sku = `PAS-${p.sku}`;
          const previousProduct = previousProductsMap.get(sku);

          const category = previousProduct?.category || categorizeProduct(p.name).primary;

          return {
            sku,
            name: p.name,
            unit_price: Math.round(p.unit_price * 1.1),
            units_per_package: p.units_per_package,
            image_url: p.image_url,
            category,
          };
        });

        sendLog(controller, "🖼️ Descargando imágenes a S3...");

        const previousSkus = new Set(previousProducts.map(p => p.sku));
        const currentSkus = new Set(transformedProducts.map(p => p.sku));

        const newSkus = new Set(Array.from(currentSkus).filter(sku => !previousSkus.has(sku)));
        const removedSkus = new Set(Array.from(previousSkus).filter(sku => !currentSkus.has(sku)));

        const productsWithImages = await Promise.all(
          transformedProducts.map(async (product) => {
            try {
              const imageResponse = await got(product.image_url);
              const imageBuffer = Buffer.from(imageResponse.rawBody);
              const s3Url = await uploadImageToS3(imageBuffer, product.sku, "sanjulian");
              sendLog(controller, `✅ Imagen subida: ${product.sku}`);
              return {
                ...product,
                image_url: s3Url,
              };
            } catch (err: any) {
              sendLog(controller, `⚠️ Error ${product.sku}: ${err.message || err}`);
              return {
                ...product,
                image_url: ""
              };
            }
          })
        );

        sendLog(controller, "💾 Guardando productos y generando informe...");

        let newImages = 0;
        let cachedImages = 0;
        productsWithImages.forEach(p => {
          if (p.image_url.includes("amazonaws.com")) {
            newImages++;
          } else if (!p.image_url.includes("http")) {
            cachedImages++;
          }
        });

        fs.writeFileSync(filePath, JSON.stringify(productsWithImages, null, 2), "utf-8");

        const newProductsDetails = productsWithImages.filter(p => newSkus.has(p.sku));
        const removedProductsDetails = previousProducts.filter(p => removedSkus.has(p.sku));

        const report: ScraperReport = {
          newProducts: newSkus.size,
          newImages,
          cachedImages,
          removedProducts: Array.from(removedSkus),
          totalProducts: productsWithImages.length,
          timestamp: new Date().toISOString(),
        };

        const reportFilePath = path.join(process.cwd(), "public", ".scraping-report-sanjulian.json");
        fs.writeFileSync(reportFilePath, JSON.stringify({
          report,
          newProductsDetails,
          removedProductsDetails,
          updatedCount: productsWithImages.length - newSkus.size - removedSkus.size,
        }, null, 2), "utf-8");

        sendLog(controller, `✅ Guardado en: public/products-sanjulian.json`);
        sendLog(controller, `✓ ${newSkus.size} nuevos, ${removedSkus.size} eliminados`);
        sendComplete(controller, productsWithImages.length);
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
