import { chromium } from 'playwright';

async function runMarketplace() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('🚀 Abriendo Marketplace PlanetaOnce...\n');

  try {
    // Navegar al marketplace
    console.log('📍 Accediendo a http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Esperar a que cargue la página de login
    await page.waitForSelector('input[placeholder="Contraseña"]', { timeout: 5000 });
    console.log('✅ Página de login cargada\n');

    // Hacer login como cliente
    console.log('🔐 Haciendo login como cliente (1234)...');
    const passwordInput = await page.locator('input[placeholder="Contraseña"]');
    await passwordInput.fill('1234');

    const loginButton = await page.locator('button:has-text("Ingresar")');
    await loginButton.click();

    // Esperar a que se redirija
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
    console.log('✅ Login exitoso\n');

    const currentUrl = page.url();
    console.log(`📄 URL actual: ${currentUrl}`);

    // Esperar un poco para que cargue el contenido
    await page.waitForTimeout(2000);

    // Tomar screenshot del marketplace
    console.log('\n📸 Capturando estado del marketplace...');
    await page.screenshot({ path: 'marketplace-running.png', fullPage: true });
    console.log('✅ Screenshot guardado: marketplace-running.png');

    // Verificar contenido
    const bodyText = await page.locator('body').innerText();
    console.log('\n📋 Contenido visible:');
    console.log(bodyText.substring(0, 500) + '...\n');

    // Buscar elementos clave
    console.log('🔍 Buscando elementos del marketplace:');

    const searchInputs = await page.locator('input[type="search"], input[placeholder*="Buscar" i]').count();
    console.log(`   • Buscador: ${searchInputs > 0 ? '✅' : '❌'}`);

    const cartButtons = await page.locator('button:has-text("Carrito"), button:has-text("carrito")').count();
    console.log(`   • Botón Carrito: ${cartButtons > 0 ? '✅' : '❌'}`);

    const productCards = await page.locator('[class*="product"], [data-testid*="product"]').count();
    console.log(`   • Tarjetas de productos: ${productCards > 0 ? '✅' : '❌'}`);

    const links = await page.locator('a').count();
    console.log(`   • Enlaces de navegación: ${links} encontrados`);

    // Esperar a que el usuario pueda interactuar
    console.log('\n⏸️  Marketplace abierto. Presiona cualquier tecla para cerrar...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

    await browser.close();
    console.log('\n✅ Navegador cerrado');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

runMarketplace();
