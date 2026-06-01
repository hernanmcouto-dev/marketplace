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

  // Buscar bloques de productos: <a name="SKU"> seguido de <h1>NOMBRE</h1> y precio en <strong>
  const productBlockRegex = /<a\s+(?:name|id)="([^"]+)"[^>]*>[\s\S]*?<h1>([^<]+)<\/h1>[\s\S]*?Codigo:\s*([^\<\n]+)[\s\S]*?<strong[^>]*>[\s\S]*?\$\s*([0-9,]+)/g;

  let match;
  while ((match = productBlockRegex.exec(html)) !== null) {
    const sku = match[1].trim();
    const name = match[2].trim();
    const priceStr = match[4].replace(/,/g, "").trim();
    const unit_price = parseInt(priceStr) || 0;

    // Excluir SKUs inválidos (navegación, anclas especiales)
    if (sku && name && unit_price > 0 && !invalidSkus.includes(sku.toLowerCase())) {
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
        sendProgress(controller, categoryIds.length, categoryIds.length, "Procesando productos...");

        if (products.length === 0) {
          sendError(
            controller,
            "No se extrajeron productos del sitio"
          );
          controller.close();
          return;
        }

        // Transformar productos con margen del 10% y categorización
        const transformedProducts = products.map((p) => {
          const categorization = categorizeProduct(p.name);
          return {
            sku: `PAS-${p.sku}`,
            name: p.name,
            unit_price: Math.round(p.unit_price * 1.1), // 10% margen único
            units_per_package: p.units_per_package,
            image_url: p.image_url,
            category: categorization.primary,
          };
        });

        sendLog(controller, "🖼️ Descargando imágenes a S3...");

        const filePath = path.join(
          process.cwd(),
          "public",
          "products-sanjulian.json"
        );

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
        const currentSkus = new Set(transformedProducts.map(p => p.sku));

        const newSkus = new Set(Array.from(currentSkus).filter(sku => !previousSkus.has(sku)));
        const removedSkus = Array.from(previousSkus).filter(sku => !currentSkus.has(sku));

        // Descargar y subir imágenes de TODOS los productos
        const productsWithProxy = await Promise.all(
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
            } catch (err) {
              sendLog(controller, `⚠️ Error descargando imagen ${product.sku}`);
              return {
                ...product,
                image_url: ""
              };
            }
          })
        );

        sendLog(controller, "💾 Guardando productos y generando informe...");

        // Contar imágenes
        let newImages = 0;
        let cachedImages = 0;
        productsWithProxy.forEach(p => {
          if (p.image_url.includes("amazonaws.com")) {
            newImages++;
          } else if (!p.image_url.includes("http")) {
            cachedImages++;
          }
        });

        fs.writeFileSync(
          filePath,
          JSON.stringify(productsWithProxy, null, 2),
          "utf-8"
        );

        // Enviar informe
        const report: ScraperReport = {
          newProducts: newSkus.length,
          newImages,
          cachedImages,
          removedProducts: removedSkus,
          totalProducts: productsWithProxy.length,
          timestamp: new Date().toISOString(),
        };

        sendLog(controller, `✅ Guardado en: public/products-sanjulian.json`);
        sendLog(controller, `📊 Informe generado`);
        sendReport(controller, report);
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
