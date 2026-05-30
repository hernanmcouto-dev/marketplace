import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const CATEGORIES = [1, 2, 9, 10, 18, 22, 23, 29, 33, 44, 48, 51, 56, 61, 73, 78, 82, 83, 84, 85, 87, 88];

function sendLog(controller: ReadableStreamDefaultController, message: string) {
  const log = JSON.stringify({ type: "log", message, timestamp: new Date().toISOString() });
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
      products.push({
        sku: `SAR-${sku}`,
        name,
        unit_price: Math.round(unit_price * 1.15), // 15% margen
        units_per_package,
        image_url: `https://www.impotekno.com/fotos/${sku}.jpg`,
      });
    }
  }

  return products;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const action = searchParams.get("action");

  // Endpoint para obtener progreso/status
  if (action === "status") {
    const filePath = path.join(process.cwd(), "public", "products.json");
    const exists = fs.existsSync(filePath);
    const count = exists
      ? JSON.parse(fs.readFileSync(filePath, "utf-8")).length
      : 0;

    return new Response(
      JSON.stringify({ imported: count, lastImport: new Date().toISOString() }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response("OK");
}

export async function POST(req: NextRequest) {
  // Retornar stream con Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      try {
        sendLog(controller, "🚀 Iniciando scraper de Impotekno...");
        await new Promise((r) => setTimeout(r, 500));

        const allProducts: any[] = [];

        for (let i = 0; i < CATEGORIES.length; i++) {
          const categoryId = CATEGORIES[i];

          sendProgress(controller, i, CATEGORIES.length, `Extrayendo categoría ${categoryId}...`);

          try {
            const response = await fetch(
              `https://www.impotekno.com/catalogo_imptk.php?rub=${categoryId}`,
              {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
              }
            );

            if (!response.ok) {
              sendLog(controller, `⚠️ Categoría ${categoryId}: No disponible (${response.status})`);
              continue;
            }

            const html = await response.text();
            const products = await extractProductsFromHtml(html);

            sendLog(controller, `✓ Categoría ${categoryId}: ${products.length} productos`);
            allProducts.push(...products);

            // Delay para no sobrecargar
            await new Promise((r) => setTimeout(r, 500));
          } catch (err: any) {
            sendLog(controller, `❌ Error en categoría ${categoryId}: ${err.message}`);
          }
        }

        if (allProducts.length === 0) {
          sendError(controller, "No se extrajeron productos");
          controller.close();
          return;
        }

        sendLog(controller, `📊 Total extraído: ${allProducts.length} productos`);
        sendLog(controller, "💾 Guardando productos...");

        // Guardar en archivo
        const filePath = path.join(process.cwd(), "public", "products.json");
        fs.writeFileSync(filePath, JSON.stringify(allProducts, null, 2), "utf-8");

        sendLog(controller, `✅ Guardado en: public/products.json`);
        sendComplete(controller, allProducts.length);
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
