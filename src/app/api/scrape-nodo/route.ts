import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { downloadAndCacheImage } from "@/lib/image-registry";
import { categorizeProduct } from "@/lib/product-categorizer";

export const maxDuration = 300;

const BASE_URL = "https://www.nodourquiza.com";
const SUPPLIER_CODE = "NDO";
const MARGIN = 1.15;

export async function POST(request: NextRequest) {
  // Retornar un stream de respuesta
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Helper para enviar logs
      const log = (msg: any) => {
        const msgStr = typeof msg === "string" ? msg : JSON.stringify(msg);
        const data = JSON.stringify({ type: "log", message: msgStr });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        console.log(`[NODO-SCRAPER] ${msgStr}`);
      };

      const report = (rep: any) => {
        try {
          const data = JSON.stringify({ type: "report", report: rep });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (e) {
          console.error("[REPORT-ERROR]", e);
        }
      };

      let browser: any = null;

      try {
        log("✅ Iniciando scraper Nodo Urquiza");

        // Leer config
        let usdToArs = 1430;
        try {
          const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/config-nodo.json"), "utf-8"));
          usdToArs = cfg.usd_to_ars || 1430;
        } catch (e) {
          log("⚠️ Config no encontrado, usando 1430");
        }
        log(`💱 Tipo cambio: 1 USD = ${usdToArs} ARS`);

        // Lanzar browser
        log("🌐 Lanzando Playwright...");
        browser = await chromium.launch({ headless: true });
        log("✅ Browser activo");

        const page = await browser.newPage();
        const allProducts: any[] = [];

        // Login
        log("🔐 Yendo a login...");
        await page.goto(`${BASE_URL}/?sec=login`, { waitUntil: "load" });

        log("📝 Ingresando credenciales...");
        await page.fill('input[name="loguser"]', "dti");
        await page.fill('input[name="logpass"]', "1234");
        await page.click('input[name="ingresar"]');

        log("⏳ Esperando login...");
        await Promise.race([
          page.waitForNavigation({ timeout: 20000 }).catch(() => {}),
          new Promise(r => setTimeout(r, 5000))
        ]);

        log("✅ Login OK");

        // Ir a listado
        log("🛍️ Navegando a listado...");
        const listUrl = `${BASE_URL}/?sec=subcateg&npag=1&mostrarcamo=listado`;
        await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

        log("⏱️ Esperando carga de DOM...");
        await new Promise(r => setTimeout(r, 3000));

        // Extraer
        log("🔍 Extrayendo productos...");
        const productos = await page.evaluate(() => {
          const items = document.querySelectorAll("div.item");
          const prods: any[] = [];

          Array.from(items).forEach((item) => {
            try {
              const linkDetalle = item.querySelector('div.item-text a[href*="idProd="]');
              if (!linkDetalle) return;

              const href = linkDetalle.getAttribute("href");
              if (!href) return;

              const idProdMatch = href.match(/idProd=(\d+)/);
              if (!idProdMatch) return;

              const idProd = parseInt(idProdMatch[1]);
              let nombre = linkDetalle.textContent?.trim() || "";
              nombre = nombre.replace(/\s+/g, " ").trim();
              if (!nombre) return;

              const img = linkDetalle.querySelector("img");
              let imagenUrl = "";
              if (img) {
                imagenUrl = img.getAttribute("src") || "";
                if (!imagenUrl.includes("http")) {
                  imagenUrl = `https://www.nodourquiza.com/${imagenUrl}`;
                }
              }

              let precio = 0;
              const itemAgregaDiv = item.querySelector("div.item-agregar1");
              if (itemAgregaDiv) {
                const precioDiv = itemAgregaDiv.querySelector("div.item-precio strong");
                if (precioDiv) {
                  const precioTexto = precioDiv.textContent?.trim() || "";
                  const num = parseFloat(
                    precioTexto
                      .replace(/\$/g, "")
                      .replace(/\./g, "")
                      .replace(",", ".")
                      .trim()
                  );
                  if (num > 0) precio = num;
                }
              }

              let stock = 0;
              const stockP = item.querySelector(`p#stockTotal${idProd}`);
              if (stockP) {
                const stockTexto = stockP.textContent || "";
                const stockMatch = stockTexto.match(/(\d+)/);
                if (stockMatch) stock = parseInt(stockMatch[1]);
              }

              if (idProd && nombre && precio > 0) {
                prods.push({
                  id: idProd,
                  nombre,
                  imagenUrl,
                  precioCostoUsd: precio,
                  stock,
                });
              }
            } catch (e) {
              // ignore
            }
          });

          return prods;
        });

        log(`✅ ${productos.length} productos encontrados`);
        allProducts.push(...productos);

        // Cargar productos existentes
        log("📂 Cargando productos existentes...");
        let existingProducts: any[] = [];
        try {
          const existingData = fs.readFileSync(path.join(process.cwd(), "public/products-nodo.json"), "utf-8");
          existingProducts = JSON.parse(existingData || "[]");
        } catch (e) {
          // No hay productos existentes
        }

        const existingSKUs = new Set(existingProducts.map((p: any) => p.sku));

        // Procesar precios
        log("💰 Procesando precios...");
        for (const p of allProducts) {
          const precioCostoArs = p.precioCostoUsd * usdToArs;
          p.unit_price = Math.round(precioCostoArs * MARGIN);
          p.sku = `${SUPPLIER_CODE}-${p.id}`;
          p.name = p.nombre;
          p.image_url = p.imagenUrl;
          const catResult = categorizeProduct(p.name);
          p.category = typeof catResult === "string" ? catResult : (catResult as any).primary || "otros";

          // Si el producto ya existe, mantener su imagen anterior
          const existing = existingProducts.find((ep: any) => ep.sku === p.sku);
          if (existing && existing.image_url && !existing.image_url.includes("http")) {
            p.image_url = existing.image_url;
          }
        }

        // Solo descargar imágenes de productos NUEVOS
        log("📥 Descargando imágenes de productos nuevos...");
        let descargadas = 0;
        const CONCURRENT_DOWNLOADS = 5;
        const productosNuevos = allProducts.filter((p) => !existingSKUs.has(p.sku));

        log(`📊 Productos nuevos: ${productosNuevos.length}, Productos existentes: ${existingSKUs.size}`);

        for (let i = 0; i < productosNuevos.length; i += CONCURRENT_DOWNLOADS) {
          const batch = productosNuevos.slice(i, i + CONCURRENT_DOWNLOADS);

          const promises = batch.map(async (p) => {
            if (p.image_url?.includes("http")) {
              try {
                const imgPath = await downloadAndCacheImage(p.image_url, p.sku, SUPPLIER_CODE.toLowerCase());
                p.image_url = imgPath;
                descargadas++;
              } catch (e) {
                // continuar sin imagen
              }
            }
          });

          await Promise.all(promises);
          if (productosNuevos.length > 0) {
            log(`📥 Progreso: ${Math.min(i + CONCURRENT_DOWNLOADS, productosNuevos.length)}/${productosNuevos.length} imágenes`);
          }
        }

        log(`✅ ${descargadas} imágenes nuevas descargadas`);

        // Guardar
        log("💾 Guardando productos...");
        fs.writeFileSync(
          path.join(process.cwd(), "public/products-nodo.json"),
          JSON.stringify(allProducts, null, 2)
        );

        const rep = {
          timestamp: new Date().toISOString(),
          totalProducts: allProducts.length,
          newProducts: allProducts.length,
          description: `${allProducts.length} productos, ${descargadas} imágenes`,
          usdToArs,
        };

        fs.writeFileSync(
          path.join(process.cwd(), "public/.scraping-report-nodo.json"),
          JSON.stringify(rep, null, 2)
        );

        report(rep);
        log(`🎉 ¡Completado! ${allProducts.length} productos guardados`);

        await browser.close();
        controller.close();
      } catch (err: any) {
        log(`❌ ERROR: ${err.message}`);
        console.error("[NODO-ERROR]", err);
        if (browser) {
          try {
            await browser.close();
          } catch (e) {}
        }
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
