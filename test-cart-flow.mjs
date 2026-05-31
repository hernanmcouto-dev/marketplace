import playwright from 'playwright';

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('📱 Navegando a página de cliente...');
    await page.goto('http://localhost:3000/cliente', { waitUntil: 'networkidle' });

    // Esperar a que cargue un producto
    console.log('⏳ Esperando productos...');
    await page.waitForSelector('div:has-text("📦")', { timeout: 10000 });

    // Hacer click en la tarjeta de un producto
    console.log('🖱️ Haciendo click en un producto...');
    const productCard = await page.locator('div[style*="background-color: white"]').filter({
      hasText: /\$/
    }).first();

    await productCard.click();

    // Esperar a que se abra el modal
    console.log('👀 Verificando que el modal se abrió...');
    const modal = page.locator('div[style*="position: fixed"][style*="backgroundColor: white"]').last();
    await modal.waitFor({ state: 'visible', timeout: 5000 });

    // Incrementar cantidad
    console.log('➕ Incrementando cantidad a 3...');
    const input = await page.locator('input[type="number"]');
    await input.fill('3');

    // Click en agregar al carrito
    console.log('🛒 Agregando producto al carrito...');
    const addBtn = await page.locator('button:has-text("Agregar al carrito")').last();
    await addBtn.click();

    // Esperar a que se cierre el modal
    await page.waitForTimeout(500);

    // Verificar que el carrito muestre el contador
    console.log('🔍 Verificando contador del carrito...');
    const badge = await page.locator('span:has-text("3")').last();
    await badge.waitFor({ state: 'visible', timeout: 5000 });

    // Click en el carrito
    console.log('📦 Abriendo carrito...');
    const cartBtn = await page.locator('button:has-text("🛒")').first();
    await cartBtn.click();

    // Esperar a que se abra el panel del carrito
    console.log('⏳ Esperando panel del carrito...');
    const cartPanel = page.locator('div[style*="right: 0"][style*="top: 0"]');
    await cartPanel.waitFor({ state: 'visible', timeout: 5000 });

    // Verificar que hay un producto en el carrito
    console.log('✅ Verificando producto en carrito...');
    const cartItem = cartPanel.locator('div:has-text("SKU")');
    await cartItem.waitFor({ state: 'visible', timeout: 5000 });

    console.log('✨ ¡ÉXITO! Todas las funcionalidades funcionan correctamente:');
    console.log('  ✓ Modal de detalles del producto');
    console.log('  ✓ Selector de cantidad');
    console.log('  ✓ Agregar al carrito');
    console.log('  ✓ Contador del carrito');
    console.log('  ✓ Panel del carrito');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
