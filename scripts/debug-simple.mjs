import { chromium } from 'playwright';

const main = async () => {
  const browser = await chromium.launch({ headless: false }); // visible para ver qué pasa
  const page = await browser.newPage();
  const context = page.context();

  try {
    console.log('1️⃣ Navegando a login...');
    await page.goto('https://www.nodourquiza.com/?sec=login', { waitUntil: 'load' });
    console.log('2️⃣ Página de login cargada');

    // Esperar y llenar inputs
    console.log('3️⃣ Llenando usuario...');
    await page.fill('input[name="loguser"]', 'dti');
    console.log('4️⃣ Llenando contraseña...');
    await page.fill('input[name="logpass"]', '1234');

    console.log('5️⃣ Haciendo click en ingresar...');
    await page.click('input[name="ingresar"]');

    console.log('6️⃣ Esperando navegación...');
    await page.waitForNavigation({ waitUntil: 'load', timeout: 30000 });
    console.log('7️⃣ Login exitoso');

    console.log('8️⃣ Navegando a listado...');
    await page.goto('https://www.nodourquiza.com/?sec=subcateg&npag=1&mostrarcomo=listado', {
      waitUntil: 'load',
      timeout: 60000
    });
    console.log('9️⃣ Página de listado cargada');

    // Esperar a que carguen los precios
    console.log('🔟 Esperando 3 segundos para que carguen los precios...');
    await page.waitForTimeout(3000);

    // Evaluar en el contexto de la página
    console.log('1️⃣1️⃣ Evaluando contenido de la página...');
    const resultado = await page.evaluate(() => {
      const items = document.querySelectorAll('div.item');
      console.log('Items encontrados:', items.length);
      return {
        itemsCount: items.length,
        htmlSample: document.body.innerHTML.substring(0, 1000)
      };
    });

    console.log('Resultado:', resultado);

    await page.waitForTimeout(5000);
    await browser.close();

  } catch (err) {
    console.error('❌ Error:', err.message);
    await browser.close();
  }
};

main();
