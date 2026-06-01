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

    // Debug HTML
    const htmlSample = await page.evaluate(() => {
      const firstItem = document.querySelector("div.item");
      return {
        itemCount: document.querySelectorAll("div.item").length,
        firstItemHTML: firstItem?.outerHTML || "No encontrado",
        selectors: {
          divItemText: document.querySelector("div.item-text") ? "existe" : "no existe",
          divItemPrecio: document.querySelector("div.item-precio") ? "existe" : "no existe",
          pStock: document.querySelector("p[id^='stockTotal']") ? "existe" : "no existe",
        }
      };
    });

    console.log("Items encontrados:", htmlSample.itemCount);
    console.log("\nSelectores:", htmlSample.selectors);
    console.log("\nPrimer item HTML:");
    console.log(htmlSample.firstItemHTML.substring(0, 1000));

    // Intentar extraer datos
    const productos = await page.evaluate(() => {
      const items = document.querySelectorAll("div.item");
      const resultado = [];

      items.slice(0, 1).forEach((item, idx) => {
        resultado.push({
          index: idx,
          classes: item.className,
          children: Array.from(item.children).map(c => ({
            tag: c.tagName,
            class: c.className,
            text: c.textContent?.substring(0, 50)
          }))
        });
      });

      return resultado;
    });

    console.log("\nEstructura del primer item:");
    console.log(JSON.stringify(productos, null, 2));

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await browser.close();
  }
};

main();
