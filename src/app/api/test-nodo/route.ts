import { NextRequest } from "next/server";
import { chromium } from "playwright";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("🔐 Login...");
    await page.goto("https://www.nodourquiza.com/?sec=login", { waitUntil: "load" });
    await page.fill('input[name="loguser"]', "dti");
    await page.fill('input[name="logpass"]', "1234");
    await page.click('input[name="ingresar"]');

    await Promise.race([
      page.waitForNavigation({ waitUntil: "load", timeout: 20000 }).catch(() => {}),
      page.waitForTimeout(5000),
    ]);

    console.log("📄 Navegando a listado...");
    await page.goto("https://www.nodourquiza.com/?sec=subcateg&npag=1&mostrarcamo=listado", {
      waitUntil: "load",
      timeout: 60000
    }).catch(() => {});

    await page.waitForTimeout(3000);

    console.log("🔍 Extrayendo...");
    const result = await page.evaluate(() => {
      const items = document.querySelectorAll("div.item");
      const productos: Array<{
        id: number;
        nombre: string;
        imagenUrl: string;
        precioCostoUsd: number;
        stock: number;
      }> = [];

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
            if (imagenUrl && !imagenUrl.includes("http")) {
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
            productos.push({
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

      return { productos, totalItems: items.length };
    });

    await browser.close();

    console.log(`✅ Resultado: ${result.productos.length} productos de ${result.totalItems}`);

    return new Response(
      JSON.stringify({
        success: true,
        extracted: result.productos.length,
        total: result.totalItems,
        sample: result.productos.slice(0, 2),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("❌ Error:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
}
