import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set viewport for consistent screenshots
  await page.setViewportSize({ width: 1280, height: 720 });

  const screenshots = [];

  try {
    console.log('🧪 Testing Marketplace App\n');

    // Test 1: Homepage loads
    console.log('1️⃣ Loading homepage...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'screenshot-01-homepage.png' });
    screenshots.push('screenshot-01-homepage.png');
    console.log('✅ Homepage loaded successfully');

    // Test 2: Check page title
    const title = await page.title();
    console.log(`   Title: "${title}"`);

    // Test 3: Check main elements exist
    console.log('\n2️⃣ Checking main elements...');
    const navbar = await page.locator('[role="navigation"]').count();
    console.log(`   Navigation found: ${navbar > 0 ? '✅' : '❌'}`);

    const products = await page.locator('[data-testid*="product"], [class*="product"], h2, h3').count();
    console.log(`   Product elements found: ${products > 0 ? '✅' : '❌'}`);

    // Test 4: Check for search functionality
    console.log('\n3️⃣ Checking search functionality...');
    const searchInput = await page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.count() > 0) {
      console.log('   Search input found: ✅');
      await page.screenshot({ path: 'screenshot-02-search.png' });
      screenshots.push('screenshot-02-search.png');
    } else {
      console.log('   Search input: ⚠️ Not found');
    }

    // Test 5: Check navigation links
    console.log('\n4️⃣ Checking navigation...');
    const links = await page.locator('a').count();
    console.log(`   Navigation links found: ${links}`);

    // Test 6: Check if cart is available
    console.log('\n5️⃣ Checking cart...');
    const cartButton = await page.locator('[class*="cart"], button:has-text("Cart")').first();
    if (await cartButton.count() > 0) {
      console.log('   Cart button found: ✅');
    } else {
      console.log('   Cart button: ⚠️ Not found in expected place');
    }

    // Test 7: Try clicking on a product if visible
    console.log('\n6️⃣ Testing product interaction...');
    const productButtons = await page.locator('button:has-text("Add to cart"), button:has-text("View"), [class*="product-card"]').first();
    if (await productButtons.count() > 0) {
      console.log('   Product interaction elements found: ✅');
      await page.screenshot({ path: 'screenshot-03-products.png' });
      screenshots.push('screenshot-03-products.png');
    } else {
      console.log('   Product interaction: ⚠️ Limited elements found');
    }

    // Test 8: Check admin link
    console.log('\n7️⃣ Checking admin access...');
    const adminLink = await page.locator('a:has-text("Admin"), a[href*="admin"]').first();
    if (await adminLink.count() > 0) {
      console.log('   Admin link found: ✅');
    } else {
      console.log('   Admin link: ⚠️ Not found');
    }

    // Test 9: Responsive check
    console.log('\n8️⃣ Checking responsiveness...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: 'screenshot-04-mobile.png' });
    screenshots.push('screenshot-04-mobile.png');
    console.log('   Mobile view captured: ✅');

    console.log('\n✅ All tests completed!');
    console.log(`\n📸 Screenshots saved:\n${screenshots.map(s => `   - ${s}`).join('\n')}`);

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    await page.screenshot({ path: 'screenshot-error.png' });
  } finally {
    await browser.close();
  }
}

test();
