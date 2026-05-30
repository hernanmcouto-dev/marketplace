import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { downloadAndStoreImage, getExistingImage, getExistingProduct } from "@/lib/image-storage";

export const maxDuration = 600;

const SUPPLIER_ID = '324f12a0-7c4d-4ced-90a2-6c9681fccabc'; // Proveedor A (Impotekno)

export async function POST(req: NextRequest) {
  try {
    console.log("[scraper] Iniciando scraping de Impotekno...");

    const products: any[] = [];
    const categoryIds = [1, 2, 9, 10, 18, 22, 23, 29, 33, 44, 48, 51, 56, 61, 73, 78, 82, 83, 84, 85, 87, 88];

    for (const categoryId of categoryIds) {
      try {
        console.log(`[scraper] Extrayendo categoría ${categoryId}...`);
        const response = await fetch(
          `https://www.impotekno.com/catalogo_imptk.php?rub=${categoryId}`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          }
        );

        if (!response.ok) {
          console.log(`[scraper] ⚠️ Categoría ${categoryId} no disponible`);
          continue;
        }

        const html = await response.text();
        const categoryProducts = extractProducts(html);
        products.push(...categoryProducts);
        console.log(`[scraper] ✓ Categoría ${categoryId}: ${categoryProducts.length} productos`);

        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.log(`[scraper] ⚠️ Error en categoría ${categoryId}`);
      }
    }

    console.log(`[scraper] ✓ Extraídos ${products.length} productos en total`);

    // Transformar: agregar prefijo SAR-, aumentar precio 15%
    const transformedProducts = await Promise.all(products.map(async (p) => {
      const sku = `SAR-${p.sku}`;

      // Verificar si el producto ya existe
      const existing = await getExistingProduct(sku);

      let imageUrl = p.image_url;
      if (existing && existing.image_url) {
        // Reutilizar imagen existente
        console.log(`[scraper] ♻️ Reutilizando imagen para ${sku}`);
        imageUrl = existing.image_url;
      } else {
        // Intentar descargar y guardar nueva imagen
        const imagePath = `https://www.impotekno.com/fotos/${p.sku}.jpg`;
        const stored = await downloadAndStoreImage(imagePath, sku, SUPPLIER_ID);
        if (stored) {
          imageUrl = stored.url;
        } else {
          imageUrl = p.image_url;
        }
      }

      return {
        sku,
        name: p.name,
        unit_price: Math.round(p.unit_price * 1.15),
        units_per_package: p.units_per_package,
        image_url: imageUrl,
      };
    }));

    if (transformedProducts.length === 0) {
      return NextResponse.json(
        { error: "No se extrajeron productos", count: 0 },
        { status: 400 }
      );
    }

    // Guardar en archivo
    const filePath = path.join(process.cwd(), "public", "products.json");
    fs.writeFileSync(filePath, JSON.stringify(transformedProducts, null, 2), "utf-8");

    console.log(`[scraper] ✓ ${transformedProducts.length} productos guardados`);

    return NextResponse.json({
      success: true,
      imported: transformedProducts.length,
      message: `Se importaron ${transformedProducts.length} productos de Impotekno`,
    });
  } catch (err: any) {
    console.error("[scraper] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function extractProducts(html: string): any[] {
  const products: any[] = [];
  const productRegex = /<div class="col-xs-12 caja_producto">([\s\S]*?)<\/div>\s*<div class="col-xs-12 caja_producto">/g;
  const lastProductRegex = /<div class="col-xs-12 caja_producto">([\s\S]*?)$/;

  let matches = html.match(productRegex);
  let lastMatch = html.match(lastProductRegex);

  if (matches) {
    for (const match of matches) {
      const product = parseProduct(match);
      if (product) products.push(product);
    }
  }

  if (lastMatch) {
    const product = parseProduct(lastMatch[1]);
    if (product) products.push(product);
  }

  return products;
}

function parseProduct(html: string): any {
  try {
    // Extraer código
    const codeMatch = html.match(/Codigo:\s*([A-Z0-9-]+)<br>/);
    const code = codeMatch ? codeMatch[1].trim() : null;

    // Extraer nombre
    const nameMatch = html.match(/<h1>(.*?)<\/h1>/);
    const name = nameMatch ? nameMatch[1].trim() : null;

    // Extraer cantidad por bulto
    const qtyMatch = html.match(/Ctdad\.\s*por\s*bulto:\s*(\d+)<br>/);
    const units_per_package = qtyMatch ? parseInt(qtyMatch[1]) : 1;

    // Extraer precio
    const priceMatch = html.match(/\$\s*([\d,]+)/);
    let unit_price = 0;
    if (priceMatch) {
      unit_price = parseInt(priceMatch[1].replace(/,/g, ""));
    }

    if (!code || !name || unit_price === 0) {
      return null;
    }

    return {
      sku: code,
      name,
      unit_price,
      units_per_package,
      image_url: `https://www.impotekno.com/fotos/${code}.jpg`,
    };
  } catch (err) {
    return null;
  }
}
