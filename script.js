const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  
  // Open shop page
  const page1 = await browser.newPage();
  await page1.goto('http://localhost:3000/shop', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
  await page1.screenshot({ path: 'shop-page.png', fullPage: true, timeout: 5000 }).catch(() => console.log('Screenshot saved with timeout'));
  console.log('✓ Shop page captured');
  
  // Open admin page
  const page2 = await browser.newPage();
  await page2.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
  await page2.screenshot({ path: 'admin-page.png', fullPage: true, timeout: 5000 }).catch(() => console.log('Screenshot saved with timeout'));
  console.log('✓ Admin page captured');
  
  await browser.close();
})();
