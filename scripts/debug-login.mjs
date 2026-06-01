import { chromium } from 'playwright';

const main = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Navegando a login...');
    await page.goto('https://www.nodourquiza.com/?sec=login', { waitUntil: 'networkidle' });

    console.log('\n=== FORMULARIOS EN LA PÁGINA ===\n');

    const forms = await page.locator('form').count();
    console.log(`Total de formularios: ${forms}`);

    // Buscar todos los inputs
    const inputs = await page.locator('input').all();
    console.log(`\nTotal de inputs: ${inputs.length}\n`);

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const id = await input.getAttribute('id');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`Input ${i}: type="${type}" name="${name}" id="${id}" placeholder="${placeholder}"`);
    }

    // Extraer HTML del formulario
    console.log('\n=== HTML DEL FORMULARIO ===\n');
    const formHtml = await page.locator('form').first().innerHTML();
    console.log(formHtml.substring(0, 1500));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
};

main();
