import { chromium } from "playwright";

const main = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log("1️⃣ Navegando a login...");
    await page.goto("https://www.nodourquiza.com/?sec=login", { waitUntil: "load" });

    console.log("2️⃣ Buscando inputs...");
    const inputs = await page.locator("input").all();
    console.log(`   Encontrados ${inputs.length} inputs`);

    for (let i = 0; i < Math.min(5, inputs.length); i++) {
      const name = await inputs[i].getAttribute("name");
      const type = await inputs[i].getAttribute("type");
      console.log(`   Input ${i}: name="${name}" type="${type}"`);
    }

    console.log("3️⃣ Intentando login...");
    await page.fill('input[name="loguser"]', "dti");
    await page.fill('input[name="logpass"]', "1234");
    await page.click('input[name="ingresar"]');

    await Promise.race([
      page.waitForNavigation({ waitUntil: "load", timeout: 20000 }).catch(() => {}),
      page.waitForTimeout(5000),
    ]);

    console.log("4️⃣ Navegando a listado...");
    const url = "https://www.nodourquiza.com/?sec=subcateg&npag=1&mostrarcamo=listado";
    await page.goto(url, { waitUntil: "load", timeout: 60000 }).catch(() => {
      console.log("   Timeout en carga, continuando...");
    });

    await page.waitForTimeout(3000);

    console.log("5️⃣ Buscando productos...");
    const itemCount = await page.locator("div.item").count();
    console.log(`   ✅ Encontrados ${itemCount} items`);

    if (itemCount > 0) {
      const firstItem = await page.locator("div.item").first().innerHTML();
      console.log("6️⃣ Primer item HTML (primeros 500 chars):");
      console.log(firstItem.substring(0, 500));
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await browser.close();
  }
};

main();
