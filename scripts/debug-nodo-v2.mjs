import { chromium } from "playwright";

const main = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Login
    await page.goto("https://www.nodourquiza.com/?sec=login", { waitUntil: "load" });
    await page.fill('input[name="loguser"]', "dti");
    await page.fill('input[name="logpass"]', "1234");
    await page.click('input[name="ingresar"]');

    await Promise.race([
      page.waitForNavigation({ waitUntil: "load", timeout: 20000 }).catch(() => {}),
      page.waitForTimeout(5000),
    ]);

    // Ir a listado
    await page.goto("https://www.nodourquiza.com/?sec=subcateg&npag=1&mostrarcamo=listado", {
      waitUntil: "load",
      timeout: 60000
    }).catch(() => {});

    await page.waitForTimeout(3000);

    // Test extraction igual a route.ts
    const result = await page.evaluate(() => {
      const items = document.querySelectorAll("div.item");
      const productos = [];
      let errors = 0;

      Array.from(items).forEach((item, idx) => {
        try {
          const linkDetalle = item.querySelector('div.item-text a[href*="idProd="]');
          if (!linkDetalle) {
            return;
          }

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
          errors++;
        }
      });

      return { productos, totalItems: items.length, errors };
    });

    console.log("RESULTADO:");
    console.log(JSON.stringify(result, null, 2));

    if (result.productos.length > 0) {
      console.log("\n✅ PRIMEROS 3 PRODUCTOS:");
      result.productos.slice(0, 3).forEach((p, i) => {
        console.log(`\n${i+1}. ${p.nombre}`);
        console.log(`   ID: ${p.id}, Precio: $${p.precioCostoUsd}, Stock: ${p.stock}`);
      });
    }

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await browser.close();
  }
};

main();
