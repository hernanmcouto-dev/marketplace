import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lee todos los productos categorizados
const impoteknoPath = path.join(__dirname, 'public/products.json');
const products = JSON.parse(fs.readFileSync(impoteknoPath, 'utf-8'));

// Estrategia: seleccionar 1-2 de cada categoría que hemos entrenado POCO
// y algunos edge cases interesantes

const categoriesNeeded = {
  "Seguridad y Cámaras": 1,           // No entrenamos casi nada
  "Gadgets": 1,                        // Poco entrenado
  "Indumentaria y Textiles": 1,       // Poco entrenado
  "Cables y Conectores": 1,           // Poco entrenado
  "Accesorios para Celulares": 1,    // Poco entrenado
  "Herramientas y Electricidad": 2,   // Solo 1 ronda
  "Electrónica y Computación": 2,     // Poco
  "Hogar y Cocina": 2,                // Nueva ronda
  "Audio Video y Parlantes": 2,       // Validar mejoras
  "Iluminación y LED": 1,             // Validar cambios
};

const selected = [];
const categoryCounts = {};

// Inicializar counts
Object.keys(categoriesNeeded).forEach(cat => {
  categoryCounts[cat] = 0;
});

// Seleccionar productos de forma aleatoria pero cubriendo todas las categorías
products.forEach(product => {
  const cat = product.category;
  if (categoryCounts[cat] < (categoriesNeeded[cat] || 0)) {
    if (Math.random() > 0.95) { // 5% chance para diversidad aleatoria
      selected.push({
        sku: product.sku,
        name: product.name,
        image_url: product.image_url,
        unit_price: product.unit_price,
        units_per_package: product.units_per_package,
        categorized_as: product.category
      });
      categoryCounts[cat]++;
    }
  }
});

// Si faltan productos, llenar con aleatorios
while (selected.length < 15) {
  const random = products[Math.floor(Math.random() * products.length)];
  const cat = random.category;
  if (categoryCounts[cat] < (categoriesNeeded[cat] || 2)) {
    selected.push({
      sku: random.sku,
      name: random.name,
      image_url: random.image_url,
      unit_price: random.unit_price,
      units_per_package: random.units_per_package,
      categorized_as: random.category
    });
    categoryCounts[cat]++;
  }
}

// Guardar selección
const finalRound = {
  final_validation_round: selected.slice(0, 15),
  total_selected: Math.min(selected.length, 15),
  timestamp: new Date().toISOString(),
  strategy: "1-2 de cada categoria, priorizando poco entrenadas"
};

fs.writeFileSync(
  path.join(__dirname, 'public/final-round.json'),
  JSON.stringify(finalRound, null, 2)
);

console.log('\n📋 SELECCIÓN FINAL DE VALIDACIÓN (15 productos)\n');
console.log('Categorías cubiertas:');
Object.entries(categoryCounts)
  .filter(([, count]) => count > 0)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

console.log(`\n✅ Guardados en final-round.json`);
console.log(`\nProductos seleccionados:\n`);

finalRound.final_validation_round.forEach((p, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${p.name.substring(0, 55).padEnd(55)} → ${p.categorized_as}`);
});
