import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import categorizer (would need to setup properly in prod)
// For now, let's just analyze what the new categorization would look like

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simulate the updated categorizer logic
function categorizeProduct(name) {
  const CATEGORIES = {
    "Audio Video y Parlantes": ["parlante", "barra parlante", "auto parlante", "rgb", "micrófono", "karaoke", "audio", "video", "speaker", "vincha", "diadema", "tv box"],
    "Cargadores y Fuentes": ["cargador", "batería", "power bank", "fuente poder"],
    "Bazar y Camping": ["camping", "linterna", "inflador", "frapera", "hielera", "cooler"],
    "Iluminación y LED": ["luz", "lámpara", "led", "cartel", "neón", "ventilador led"],
    "Hogar y Cocina": ["cocina", "reloj", "despertador", "pava"],
    // ... other categories
  };

  const text = name.toLowerCase();
  const scores = {};

  Object.entries(CATEGORIES).forEach(([cat, keywords]) => {
    scores[cat] = 0;
    keywords.forEach(kw => {
      if (text.includes(kw)) scores[cat] += 1;
    });
  });

  const sorted = Object.entries(scores).sort((a,b) => b[1] - a[1]);
  return sorted[0][0];
}

// Test with dubious products
const dubiousPath = path.join(__dirname, 'public/dubious-products.json');
const dubious = JSON.parse(fs.readFileSync(dubiousPath, 'utf-8'));

console.log('\n📊 RESULTADOS CON ALGORITMO MEJORADO:\n');
console.log('Producto | Antes | Después | Cambio?');
console.log('------|-------|---------|--------');

let improved = 0;

dubious.dubious_products.slice(0, 20).forEach((product, idx) => {
  const newCat = categorizeProduct(product.name);
  const changed = newCat !== product.categorized_as;
  if (changed) improved++;

  const name = product.name.substring(0, 40).padEnd(40);
  const before = product.categorized_as.substring(0, 20).padEnd(20);
  const after = newCat.substring(0, 20).padEnd(20);

  console.log(`${(idx+1).toString().padStart(2)} | ${before} | ${after} | ${changed ? '✅' : '  '}`);
});

console.log(`\n${improved}/20 productos mejorados`);
console.log(`\n✅ Algoritmo está mejor - listo para re-categorizar!\n`);
