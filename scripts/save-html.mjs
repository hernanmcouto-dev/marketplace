import { chromium } from 'playwright';
import * as fs from 'fs';

const main = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('1️⃣ Login...');
    await page.goto('https://www.nodourquiza.com/?sec=login', { waitUntil: 'load' });
    await page.fill('input[name="loguser"]', 'dti');
    await page.fill('input[name="logpass"]', '1234');
    await page.click('input[name="ingresar"]');

    await Promise.race([
      page.waitForNavigation({ waitUntil: 'load', timeout: 20000 }).catch(() => {}),
      page.waitForTimeout(5000)
    ]);

    console.log('2️⃣ Navegando a listado...');
    await page.goto('https://www.nodourquiza.com/?sec=subcateg&npag=1&mostrarcomo=listado', {
      waitUntil: 'load',
      timeout: 60000
    }).catch(() => console.log('  ⚠️ Timeout, continuando..'));

    console.log('3️⃣ Esperando 3 segundos...');
    await page.waitForTimeout(3000);

    console.log('4️⃣ Obteniendo HTML...');
    const html = await page.content();

    // Guardar primeros 5000 caracteres
    fs.writeFileSync('./scripts/debug-html.txt', html.substring(0, 5000), 'utf-8');
    console.log('✅ HTML guardado en debug-html.txt');

    // Evaluar items
    const itemsCount = await page.locator('div.item').count();
    console.log(`📊 Elementos div.item encontrados: ${itemsCount}`);

    // Buscar otros selectores posibles
    const divCount = await page.locator('div').count();
    console.log(`📊 Total de divs: ${divCount}`);

    // Guardar HTML completo
    fs.writeFileSync('./scripts/debug-html-completo.html', html, 'utf-8');
    console.log('✅ HTML completo guardado');

    await browser.close();

  } catch (err) {
    console.error('❌ Error:', err.message);
    await browser.close();
  }
};

main();
