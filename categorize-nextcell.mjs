import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import the categorizer (we'll inline the function since we can't import from .ts directly)
// Using simplified version that matches the algorithm

function categorizeProduct(name) {
  const text = name.toLowerCase();

  const categories = {
    "Cargadores y Fuentes": ["cargador", "batería", "power bank", "fuente poder", "transformador", "inversor", "estabilizador"],
    "Audio Video y Parlantes": ["parlante", "barra parlante", "auto parlante", "rgb", "micrófono", "karaoke", "audio", "video", "speaker", "vincha", "diadema", "tv box", "auricular", "headphones"],
    "Hogar y Cocina": ["cocina", "horno", "reloj", "despertador", "pava", "tetera", "molde", "freidora aire", "organizador", "encendedor", "humidificador", "refrigerador", "microondas"],
    "Electrónica y Computación": ["computadora", "laptop", "mouse", "teclado", "monitor", "antena", "antena wifi", "joystick", "gamepad", "periférico", "pc", "notebook", "router"],
    "Iluminación y LED": ["luz", "lámpara", "led", "cartel", "neón", "ventilador led", "linterna", "foco", "bombilla", "panel led"],
    "Bazar y Camping": ["camping", "carpa", "linterna", "inflador", "frapera", "hielera", "cooler", "botella", "botella termo", "botella termica", "termo", "saco dormir", "colchoneta", "mochila"],
    "Cables y Conectores": ["cable", "cable auxiliar", "cable rca", "conector", "usb", "hdmi", "jack", "plug", "ethernet"],
    "Juegos Juguetes y Librería": ["juego", "juguete", "pizarra", "marcadores", "libro", "papelería", "útiles", "peluche", "figura", "lego", "puzzle", "videojuego"],
    "Cuidado Personal y Cosmética": ["corta pelo", "cortapelo", "cortadora pelo", "rasuradora", "cepillo secador", "masajeador", "cepillo moldeador", "perfilador", "perfilador cejas", "jabón", "champú", "crema", "maquillaje"],
    "Accesorios para Celulares": ["funda celular", "protector pantalla", "cargador celular", "vidrio templado", "mica", "cable celular", "soporte celular"],
    "Accesorios Auto Moto y Bici": ["auto", "moto", "bici", "bicicleta", "candado", "casco", "llanta", "rueda", "cadena", "soporte"],
    "Herramientas y Electricidad": ["herramienta", "destornillador", "martillo", "sierra", "taladro", "amoladora", "pinza", "llave", "tornillo"],
    "Seguridad y Cámaras": ["cámara seguridad", "cámara vigilancia", "cámara ip", "dvr", "nvr", "sensor", "alarma"],
    "Gadgets": ["gadget", "smartwatch", "reloj inteligente", "pulsera inteligente", "drone", "scooter", "power bank", "batería externa"],
    "Indumentaria y Textiles": ["ropa", "camiseta", "remera", "pantalón", "zapato", "zapatilla", "gorro", "gorro con luz", "gorro led", "bufanda", "cinturón"],
    "Liquidación": ["liquidación", "oferta", "promoción", "descuento", "rebaja", "sale"],
    "Próximo a Ingresar": ["próximo", "próxima llegada", "preventa", "pre-order", "coming soon"]
  };

  const scores = {};
  Object.keys(categories).forEach(cat => {
    scores[cat] = 0;
    categories[cat].forEach(kw => {
      if (text.includes(kw)) scores[cat] += 1;
    });
  });

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || "Gadgets";
}

console.log('\n🟣 CATEGORIZANDO NEXTCELL (4,668 productos)...\n');

const filePath = path.join(__dirname, 'public', 'products-nextcell.json');
const data = fs.readFileSync(filePath, 'utf-8');
const products = JSON.parse(data);

console.log(`📦 Procesando ${products.length} productos...`);

const categorized = products.map((p, idx) => {
  if (idx % 500 === 0) console.log(`  Progreso: ${idx}/${products.length}`);
  return {
    ...p,
    category: categorizeProduct(p.name)
  };
});

fs.writeFileSync(filePath, JSON.stringify(categorized, null, 2), 'utf-8');

// Stats
const stats = {};
categorized.forEach(p => {
  stats[p.category] = (stats[p.category] || 0) + 1;
});

console.log('\n✅ CATEGORIZACIÓN COMPLETADA\n');
console.log('📊 Distribucion NextCell:');

Object.entries(stats)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    const pct = ((count / products.length) * 100).toFixed(1);
    console.log(`  ${cat.padEnd(35)} ${count.toString().padStart(4)} (${pct}%)`);
  });

const total = Object.values(stats).reduce((a, b) => a + b, 0);
console.log(`\n🎉 TOTAL: ${total} productos categorizados\n`);

console.log('Estadísticas:');
console.log(JSON.stringify(stats, null, 2));
