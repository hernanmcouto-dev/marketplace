import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const CATEGORIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 99999];

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

  // Buscar bloques de productos (similar a Impotekno)
  const productBlockRegex = /<div[^>]*class="[^"]*caja_producto[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g;
  const blocks = html.match(productBlockRegex) || [];

  // Si no encuentra con caja_producto, intentar con otra estructura
  if (blocks.length === 0) {
    // Buscar por estructura alternativa de San Julián
    const altRegex = /<div[^>]*>[\s\S]*?<h[1-3]>(.*?)<\/h[1-3]>[\s\S]*?Codigo:\s*([^\<\n]+)[\s\S]*?\$\s*([0-9,]+)[\s\S]*?<\/div>/g;
    let match;

    while ((match = altRegex.exec(html)) !== null) {
      const name = match[1]?.trim();
      const sku = match[2]?.trim();
      const priceStr = match[3]?.replace(/,/g, "");
      const unit_price = parseInt(priceStr) || 0;

      if (sku && name && unit_price > 0) {
        products.push({
          sku: `PAS-${sku}`,
          name,
          unit_price: Math.round(unit_price * 1.1), // 10% margen
          units_per_package: 1,
          image_url: `https://sanjulian99.com/fotos/${sku}.jpg`,
        });
      }
    }

    return products;
  }

  // Procesar bloques encontrados
  for (const block of blocks) {
    // Extraer nombre
    const nameMatch = block.match(/<h[1-3]>(.*?)<\/h[1-3]>/);
    const name = nameMatch ? nameMatch[1].trim() : null;

    // Extraer SKU
    const skuMatch = block.match(/Codigo:\s*([^\<\n]+)/);
    const sku = skuMatch ? skuMatch[1].trim() : null;

    // Extraer cantidad por bulto
    const quantityMatch = block.match(/Ctdad\.\s*por\s*bulto:\s*([0-9]+)/i);
    const units_per_package = quantityMatch ? parseInt(quantityMatch[1]) : 1;

    // Extraer precio
    const priceMatch = block.match(/\$\s*([0-9,]+)/);
    let unit_price = 0;
    if (priceMatch) {
      const priceStr = priceMatch[1].replace(/,/g, "");
      unit_price = parseInt(priceStr) || 0;
    }

    if (sku && name && unit_price > 0) {
      products.push({
        sku: `PAS-${sku}`,
        name,
        unit_price: Math.round(unit_price * 1.1), // 10% margen
        units_per_package,
        image_url: `https://sanjulian99.com/fotos/${sku}.jpg`,
      });
    }
  }

  return products;
}

export async function POST(req: NextRequest) {
  // Retornar stream con Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      try {
        sendLog(controller, "🚀 Iniciando scraper de San Julián...");
        sendLog(controller, "🔐 Realizando login...");

        await new Promise((r) => setTimeout(r, 500));

        // Hacer login primero
        const loginFormData = new FormData();
        loginFormData.append("clave", "pasteur");
        loginFormData.append("enviar", "Ingresar");

        let cookies = "";
        try {
          const loginResponse = await fetch("https://sanjulian99.com/index.php", {
            method: "POST",
            body: loginFormData,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            redirect: "follow",
          });

          const setCookieHeaders = loginResponse.headers.getSetCookie?.();
          if (setCookieHeaders && setCookieHeaders.length > 0) {
            cookies = setCookieHeaders
              .map((c) => c.split(";")[0])
              .join("; ");
          }

          sendLog(controller, "✓ Login exitoso");
        } catch (err: any) {
          sendLog(controller, `⚠️ Login falló, intentando sin autenticación: ${err.message}`);
        }

        const allProducts: any[] = [];

        for (let i = 0; i < CATEGORIES.length; i++) {
          const categoryId = CATEGORIES[i];

          sendProgress(controller, i, CATEGORIES.length, `Extrayendo categoría ${categoryId}...`);

          try {
            const headers: any = {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            };

            if (cookies) {
              headers["Cookie"] = cookies;
            }

            const response = await fetch(
              `https://sanjulian99.com/catalogo2021.php?rub=${categoryId}`,
              { headers }
            );

            if (!response.ok) {
              sendLog(controller, `⚠️ Categoría ${categoryId}: ${response.status}`);
              continue;
            }

            const html = await response.text();

            // Verificar si la respuesta contiene "ingreso clave" (error de login)
            if (html.includes("ingreso clave") || html.includes("No ingreso")) {
              sendLog(controller, `⚠️ Categoría ${categoryId}: Requiere autenticación`);
              continue;
            }

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
          sendError(controller, "No se extrajeron productos. El sitio puede estar en mantenimiento o requerir credenciales diferentes.");
          controller.close();
          return;
        }

        const productsWithProvider = allProducts.map((p) => ({
          ...p,
          provider: "San Julián",
        }));

        sendLog(controller, `📊 Total extraído: ${productsWithProvider.length} productos`);
        sendLog(controller, "💾 Guardando productos...");

        const filePath = path.join(process.cwd(), "public", "products-sanjulian.json");
        fs.writeFileSync(filePath, JSON.stringify(productsWithProvider, null, 2), "utf-8");

        sendLog(controller, `✅ Guardado en: public/products-sanjulian.json`);
        sendComplete(controller, productsWithProvider.length);
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
