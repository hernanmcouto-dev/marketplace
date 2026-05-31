const fs = require('fs');
const path = require('path');

// Manual categorizer implementation for analysis
function categorizeProduct(productName) {
  const CATEGORIES = {
    "Hogar y Cocina": ["cocina", "horno", "reloj", "despertador", "pava", "molde"],
    "Herramientas y Electricidad": ["herramienta", "destornillador", "taladro", "sierra"],
    "Iluminación y LED": ["luz", "lámpara", "led", "cartel", "neón"],
    "Audio Video y Parlantes": ["audio", "parlante", "micrófono", "vincha", "tv box"],
    "Electrónica y Computación": ["computadora", "laptop", "mouse", "joystick", "antena"],
    "Juegos Juguetes y Librería": ["juego", "juguete", "pizarra", "marcadores", "libro"],
    "Gadgets": ["gadget", "smartwatch", "drone", "power bank"],
    "Bazar y Camping": ["camping", "carpa", "linterna", "inflador"],
    "Indumentaria y Textiles": ["ropa", "camiseta", "zapato", "gorro"],
    "Cuidado Personal y Cosmética": ["jabón", "champú", "crema", "corta pelo", "masajeador"],
    "Cables y Conectores": ["cable", "conector", "usb", "hdmi"],
    "Seguridad y Cámaras": ["cámara seguridad", "alarma", "sensor"],
    "Cargadores y Fuentes": ["cargador", "batería", "power bank", "fuente poder"],
    "Accesorios para Celulares": ["funda celular", "protector pantalla", "cargador celular"],
    "Accesorios Auto Moto y Bici": ["auto", "moto", "bici", "candado"],
    "Liquidación": ["liquidación", "oferta", "descuento"],
    "Próximo a Ingresar": ["próximo", "preventa", "coming soon"]
  };

  const text = productName.toLowerCase();
  const scores = {};

  Object.entries(CATEGORIES).forEach(([cat, keywords]) => {
    scores[cat] = 0;
    keywords.forEach(kw => {
      if (text.includes(kw)) scores[cat] += 1;
    });
  });

  const sorted = Object.entries(scores).sort((a,b) => b[1] - a[1]);
  const topScore = sorted[0][1];
  const secondScore = sorted[1][1];

  return {
    primary: sorted[0][0],
    primaryScore: topScore,
    secondaryScore: secondScore,
    confidence: topScore > secondScore ? topScore / (topScore + secondScore) : 0.5,
    isDubious: topScore === secondScore || (topScore - secondScore) < 2 || topScore === 0
  };
}

// Read and analyze
const suppliers = ['impotekno', 'sanjulian'];
const dubious = [];

suppliers.forEach(supplier => {
  const filename = supplier === 'impotekno' ? 'products.json' : 'products-sanjulian.json';
  const filePath = path.join(__dirname, 'public', filename);

  const data = fs.readFileSync(filePath, 'utf-8');
  const products = JSON.parse(data);

  products.forEach(product => {
    const analysis = categorizeProduct(product.name);
    if (analysis.isDubious) {
      dubious.push({
        sku: product.sku,
        name: product.name,
        image_url: product.image_url,
        unit_price: product.unit_price,
        units_per_package: product.units_per_package,
        categorized_as: product.category,
        confidence: analysis.confidence.toFixed(2),
        supplier
      });
    }
  });
});

// Get first 20 dubious items
const sample = dubious.slice(0, 20);

console.log(`Found ${dubious.length} dubious products`);
console.log(`\nSample of first 20:\n`);
sample.forEach(p => {
  console.log(`${p.name.substring(0, 60)} → ${p.categorized_as} (${p.confidence} confidence)`);
});

// Save to localStorage-like file for training
const trainingData = {
  dubious_products: sample,
  total_dubious: dubious.length,
  timestamp: new Date().toISOString()
};

fs.writeFileSync(
  path.join(__dirname, 'dubious-products.json'),
  JSON.stringify(trainingData, null, 2)
);

console.log(`\n✅ Saved ${sample.length} dubious products to dubious-products.json`);
