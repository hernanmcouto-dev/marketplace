const fs = require('fs');
const path = require('path');

// Import the categorizer
const { categorizeProduct } = require('./src/lib/product-categorizer.ts');

// Read products for both suppliers
const suppliers = ['impotekno', 'sanjulian'];

suppliers.forEach(supplier => {
  const filename = supplier === 'impotekno' ? 'products.json' : 'products-sanjulian.json';
  const filePath = path.join(__dirname, 'public', filename);

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const products = JSON.parse(data);

    console.log(`\n📦 Categorizing ${products.length} products from ${supplier}...`);

    // Categorize each product
    const categorized = products.map(product => ({
      ...product,
      category: categorizeProduct(product.name).primary
    }));

    // Save back
    fs.writeFileSync(
      filePath,
      JSON.stringify(categorized, null, 2),
      'utf-8'
    );

    // Show stats
    const stats = {};
    categorized.forEach(p => {
      stats[p.category] = (stats[p.category] || 0) + 1;
    });

    console.log(`✅ ${supplier} - Done!`);
    console.log('Category Distribution:');
    Object.entries(stats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });

  } catch (error) {
    console.error(`❌ Error processing ${supplier}:`, error.message);
  }
});

console.log('\n🎉 All products categorized!');
