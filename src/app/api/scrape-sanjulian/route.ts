import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import got from "got";
import { CookieJar } from "tough-cookie";
import { downloadAndStoreImage, getExistingProduct } from "@/lib/image-storage";

export const maxDuration = 600;

const SUPPLIER_ID = 'b4c0e4a0-5f2d-4a1b-9c3e-8d1f2a5b6c7d'; // Proveedor B (San Julián)

export async function POST(req: NextRequest) {
  try {
    console.log("[sanjulian-scraper] Iniciando scraping de San Julián...");

    const products: any[] = [];
    const categoryIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 99999];

    const cookieJar = new CookieJar();
    const client = got.extend({
      cookieJar,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    console.log("[sanjulian-scraper] Haciendo login...");
    await client.post("https://sanjulian99.com/index.php", {
      form: {
        clave: "pasteur",
        enviar: "Ingresar",
      },
    });
    console.log(`[sanjulian-scraper] ✓ Login exitoso`);

    for (const categoryId of categoryIds) {
      try {
        console.log(`[sanjulian-scraper] Extrayendo categoría ${categoryId}...`);

        const response = await client.get(
          `https://sanjulian99.com/catalogo2021.php?rub=${categoryId}`
        );

        const html = response.body;
        const categoryProducts = extractProducts(html);
        products.push(...categoryProducts);
        console.log(`[sanjulian-scraper] ✓ Categoría ${categoryId}: ${categoryProducts.length} productos`);
      } catch (err) {
        console.log(`[sanjulian-scraper] ⚠️ Error en categoría ${categoryId}`);
      }
    }

    console.log(`[sanjulian-scraper] ✓ Extraídos ${products.length} productos en total`);

    // Transformar: prefijo PAS-, margen 10%
    const transformedProducts = await Promise.all(products.map(async (p) => {
      const sku = `PAS-${p.sku}`;

      const existing = await getExistingProduct(sku);

      let imageUrl = p.image_url;
      if (existing && existing.image_url) {
        console.log(`[sanjulian-scraper] ♻️ Reutilizando imagen para ${sku}`);
        imageUrl = existing.image_url;
      } else {
        const imagePath = `https://sanjulian99.com/fotos/${p.sku}.jpg`;
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
        unit_price: Math.round(p.unit_price * 1.1),
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
    const filePath = path.join(process.cwd(), "public", "products-sanjulian.json");
    fs.writeFileSync(filePath, JSON.stringify(transformedProducts, null, 2), "utf-8");

    console.log(`[sanjulian-scraper] ✓ ${transformedProducts.length} productos guardados`);

    return NextResponse.json({
      success: true,
      imported: transformedProducts.length,
      message: `Se importaron ${transformedProducts.length} productos de San Julián`,
    });
  } catch (err: any) {
    console.error("[sanjulian-scraper] Error:", err.message);
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
      image_url: `https://sanjulian99.com/fotos/${code}.jpg`,
    };
  } catch (err) {
    return null;
  }
}
