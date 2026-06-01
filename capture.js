const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  try {
    // Capture shop page
    const page1 = await browser.newPage();
    await page1.setViewportSize({ width: 1280, height: 800 });
    await page1.goto('http://localhost:3000/shop', { waitUntil: 'load', timeout: 15000 });
    await page1.waitForTimeout(2000);
    const path1 = 'screenshot-shop.png';
    await page1.screenshot({ path: path1, fullPage: false });
    console.log('✓ Shop screenshot saved');
    await page1.close();
    
    // Capture admin page
    const page2 = await browser.newPage();
    await page2.setViewportSize({ width: 1280, height: 800 });
    await page2.goto('http://localhost:3000/admin', { waitUntil: 'load', timeout: 15000 });
    await page2.waitForTimeout(2000);
    const path2 = 'screenshot-admin.png';
    await page2.screenshot({ path: path2, fullPage: false });
    console.log('✓ Admin screenshot saved');
    await page2.close();
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
