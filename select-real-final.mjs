import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read real products
const productsPath = path.join(__dirname, 'public/products.json');
const allProducts = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

// Filter out test products and select 15 real ones
const realProducts = allProducts.filter(p => !p.sku.includes('TEST') && p.name && p.category);

console.log(`\n📦 Total productos reales: ${realProducts.length}`);

// Select strategically - get variety of categories
const categoryMap = {};
const selected = [];

realProducts.forEach(product => {
  const cat = product.category;
  if (!categoryMap[cat]) {
    categoryMap[cat] = [];
  }
  categoryMap[cat].push(product);
});

// Select 1-2 from each category to get 15 total
Object.entries(categoryMap).forEach(([category, products]) => {
  if (selected.length >= 15) return;

  const count = Math.min(products.length, selected.length >= 13 ? 1 : 2);
  const shuffled = products.sort(() => Math.random() - 0.5);

  for (let i = 0; i < count && selected.length < 15; i++) {
    selected.push(shuffled[i]);
  }
});

// Save final round
const finalRound = {
  final_validation_round: selected,
  total_selected: selected.length,
  timestamp: new Date().toISOString(),
  strategy: "15 productos REALES de Impotekno - diversas categorias"
};

fs.writeFileSync(
  path.join(__dirname, 'public/final-round.json'),
  JSON.stringify(finalRound, null, 2)
);

console.log(`✅ Seleccionados ${selected.length} productos reales\n`);
console.log('Distribucion:');
const dist = {};
selected.forEach(p => {
  dist[p.category] = (dist[p.category] || 0) + 1;
});

Object.entries(dist).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`);
});

console.log(`\nProductos para validar:\n`);
selected.forEach((p, i) => {
  const name = p.name.substring(0, 55);
  console.log(`${(i+1).toString().padStart(2)}. ${name} -> ${p.category}`);
});

console.log(`\n✅ Guardado en public/final-round.json`);
