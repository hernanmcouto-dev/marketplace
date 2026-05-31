import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Importar el categorizer (simulation - en real usaríamos import dinámico)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// SIMPLE CATEGORIZER based on current keywords (v7)
function categorizeProduct(name) {
  const text = name.toLowerCase();

  const categories = {
    "Cuidado Personal y Cosmética": ["corta pelo", "cortapelo", "cortadora pelo", "máquina cortar pelo", "rasuradora", "clipper", "trimmer", "cepillo secador", "masajeador", "cepillo moldeador", "perfilador", "perfilador cejas"],
    "Electrónica y Computación": ["computadora", "laptop", "mouse", "teclado", "monitor", "antena", "antena wifi", "joystick", "gamepad", "periférico"],
    "Cables y Conectores": ["cable", "cable auxiliar", "cable rca", "conector", "usb", "hdmi"],
    "Audio Video y Parlantes": ["parlante", "barra parlante", "auto parlante", "rgb", "micrófono", "karaoke", "audio", "video", "speaker", "vincha", "diadema", "tv box"],
    "Hogar y Cocina": ["cocina", "horno", "reloj", "despertador", "pava", "tetera", "molde", "freidora aire", "organizador", "encendedor", "encendedor recargable", "humidificador"],
    "Iluminación y LED": ["luz", "lámpara", "led", "cartel", "neón", "ventilador led"],
    "Bazar y Camping": ["camping", "carpa", "linterna", "inflador", "frapera", "hielera", "cooler", "botella", "botella termo", "botella termica", "termo"],
    "Juegos Juguetes y Librería": ["juego", "juguete", "pizarra", "marcadores", "libro", "papelería", "útiles"],
    "Cargadores y Fuentes": ["cargador", "batería", "power bank", "fuente poder"],
  };

  const scores = {};
  Object.keys(categories).forEach(cat => {
    scores[cat] = 0;
    categories[cat].forEach(kw => {
      if (text.includes(kw)) scores[cat] += 1;
    });
  });

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][0] || "Gadgets";
}

// Procesar ambos proveedores
const suppliers = ['impotekno', 'sanjulian'];

suppliers.forEach(supplier => {
  const filename = supplier === 'impotekno' ? 'products.json' : 'products-sanjulian.json';
  const filePath = path.join(__dirname, 'public', filename);

  console.log(`\n📦 Re-categorizando ${supplier}...`);

  const data = fs.readFileSync(filePath, 'utf-8');
  const products = JSON.parse(data);

  const categorized = products.map(p => ({
    ...p,
    category: categorizeProduct(p.name)
  }));

  fs.writeFileSync(filePath, JSON.stringify(categorized, null, 2), 'utf-8');

  // Stats
  const stats = {};
  categorized.forEach(p => {
    stats[p.category] = (stats[p.category] || 0) + 1;
  });

  console.log(`✅ ${categorized.length} productos categorizados\n`);
  console.log('📊 Distribucion final:');

  Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      const pct = ((count / categorized.length) * 100).toFixed(1);
      console.log(`  ${cat.padEnd(35)} ${count.toString().padStart(4)} (${pct}%)`);
    });
});

console.log(`\n✅ RE-CATEGORIZACION COMPLETADA`);
console.log(`🎉 Sistema listo para produccion\n`);
