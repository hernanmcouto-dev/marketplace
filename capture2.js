const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  
  // Shop page
  const page1 = await browser.newPage();
  await page1.setViewportSize({ width: 1280, height: 900 });
  
  console.log('Loading shop page...');
  try {
    await page1.goto('http://localhost:3000/shop', { waitUntil: 'domcontentloaded' });
    console.log('Shop page loaded, waiting for images...');
    await page1.waitForTimeout(3000);
    
    await page1.screenshot({ path: 'shop.png' });
    console.log('✓ Shop screenshot saved to shop.png');
  } catch (e) {
    console.error('Shop error:', e.message);
  }
  
  // Admin page
  const page2 = await browser.newPage();
  await page2.setViewportSize({ width: 1280, height: 900 });
  
  console.log('Loading admin page...');
  try {
    await page2.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
    console.log('Admin page loaded, waiting...');
    await page2.waitForTimeout(3000);
    
    await page2.screenshot({ path: 'admin.png' });
    console.log('✓ Admin screenshot saved to admin.png');
  } catch (e) {
    console.error('Admin error:', e.message);
  }
  
  await browser.close();
  console.log('Done!');
})();
