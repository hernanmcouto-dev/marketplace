# Código Fuente Completo de Web Scrapers

## 1. IMPOTEKNO SCRAPER

**Archivo:** `src/app/api/scrape-impotekno/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { downloadAndStoreImage, getExistingImage, getExistingProduct } from "@/lib/image-storage";

export const maxDuration = 600;

const SUPPLIER_ID = '324f12a0-7c4d-4ced-90a2-6c9681fccabc';

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

    const transformedProducts = await Promise.all(products.map(async (p) => {
      const sku = `SAR-${p.sku}`;
      const existing = await getExistingProduct(sku);

      let imageUrl = p.image_url;
      if (existing && existing.image_url) {
        console.log(`[scraper] ♻️ Reutilizando imagen para ${sku}`);
        imageUrl = existing.image_url;
      } else {
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
  
  // Regex para extraer productos de la tabla HTML
  const productRegex = /<tr[^>]*>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>([^<]+)<\/td>/gs;
  
  let match;
  while ((match = productRegex.exec(html)) !== null) {
    const sku = match[1].trim();
    const name = match[2].trim();
    const priceStr = match[3].replace(/[^0-9.]/g, '');
    const unit_price = parseFloat(priceStr) || 0;

    if (sku && name) {
      products.push({
        sku,
        name,
        unit_price,
        units_per_package: 1,
        image_url: `https://www.impotekno.com/fotos/${sku}.jpg`,
      });
    }
  }

  return products;
}
```

---

## 2. SAN JULIÁN SCRAPER

**Archivo:** `src/app/api/scrape-sanjulian/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import got from "got";
import { CookieJar } from "tough-cookie";
import { downloadAndStoreImage, getExistingProduct } from "@/lib/image-storage";

export const maxDuration = 600;

const SUPPLIER_ID = 'b4c0e4a0-5f2d-4a1b-9c3e-8d1f2a5b6c7d';

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
  
  // Regex para extraer productos
  const productRegex = /<tr[^>]*>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>([^<]+)<\/td>/gs;
  
  let match;
  while ((match = productRegex.exec(html)) !== null) {
    const sku = match[1].trim();
    const name = match[2].trim();
    const priceStr = match[3].replace(/[^0-9.]/g, '');
    const unit_price = parseFloat(priceStr) || 0;

    if (sku && name) {
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
```

---

## 3. DEPENDENCIAS NECESARIAS

Para los scrapers se necesitan:

```json
{
  "dependencies": {
    "next": "16.2.6",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "got": "^14.0.0",
    "tough-cookie": "^4.1.0"
  }
}
```

### Instalación
```bash
npm install got tough-cookie
```

---

## 4. VARIABLES DE ENTORNO

Crear `.env.local` con credenciales de proveedores:

```env
IMPOTEKNO_URL=https://www.impotekno.com
SANJULIAN_URL=https://sanjulian99.com
SANJULIAN_PASSWORD=pasteur
```

---

## 5. FLUJO DE SCRAPING COMPLETO

```
1. POST /api/scrape-impotekno
   ├─ Conectar a impotekno.com
   ├─ Iterar 22 categorías
   ├─ Extraer HTML con regex
   ├─ Parsear productos
   ├─ Agregar prefijo SAR-
   ├─ Aplicar margen 15%
   ├─ Descargar/reutilizar imágenes
   └─ Guardar en public/products.json

2. POST /api/scrape-sanjulian
   ├─ Login (cookie: pasteur)
   ├─ Iterar 26 categorías
   ├─ Extraer HTML con regex
   ├─ Parsear productos
   ├─ Agregar prefijo PAS-
   ├─ Aplicar margen 10%
   ├─ Descargar/reutilizar imágenes
   └─ Guardar en public/products-sanjulian.json
```

---

## 6. PATRÓN DE REGEX PARA EXTRACCIÓN

### Impotekno (Tabla HTML)
```regex
/<tr[^>]*>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>([^<]+)<\/td>/gs
```
Captura: SKU, Nombre, Precio

### San Julián (Tabla HTML con login)
```regex
Igual que Impotekno
```

---

## 7. MANEJO DE COOKIES (para sitios con autenticación)

```typescript
import { CookieJar } from "tough-cookie";
import got from "got";

const cookieJar = new CookieJar();
const client = got.extend({ cookieJar });

// Login
await client.post("https://sitio.com/login", {
  form: { usuario: "xx", contraseña: "yy" }
});

// Request autenticado (cookies se mantienen)
const response = await client.get("https://sitio.com/productos");
```

---

## 8. CÁLCULO DE MÁRGENES

```typescript
// Impotekno: 15% margen
const newPrice = Math.round(originalPrice * 1.15);

// San Julián: 10% margen
const newPrice = Math.round(originalPrice * 1.1);

// Nodo Urquiza: USD → ARS (1430) + 8% margen
const newPrice = Math.round(originalPrice * 1430 * 1.08);
```

---

## 9. ENDPOINTS PARA EJECUTAR

```bash
# Scrapiear Impotekno
curl -X POST http://localhost:3000/api/scrape-impotekno

# Scrapear San Julián
curl -X POST http://localhost:3000/api/scrape-sanjulian
```

---

## 10. NOTAS Y BEST PRACTICES

✓ Usar timeouts para requests (500ms entre requests)
✓ Validar HTML antes de extraer
✓ Usar User-Agent válido
✓ Manejar errores por categoría (no fallar todo)
✓ Logs detallados para debugging
✓ Reutilizar imágenes cuando ya existen (SKU)
✓ Guardar en JSON formateado (indent: 2)
✓ Verificar estructura de datos antes de guardar
✗ No sobrecargar servidores (respetar robots.txt)
✗ No hacer requests simultáneos masivos
