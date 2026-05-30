import fs from 'fs';

const impoteknoProducts = JSON.parse(fs.readFileSync('public/products.json', 'utf-8'));
const sanjulianProducts = JSON.parse(fs.readFileSync('public/products-sanjulian.json', 'utf-8'));

const allProducts = [
  ...impoteknoProducts.map(p => ({ ...p, provider: "Impotekno" })),
  ...sanjulianProducts.map(p => ({ ...p, provider: "San Julián" }))
];

function categorizeProduct(name) {
  const lower = name.toLowerCase();
  
  // Audio
  if (lower.includes('parlante') || lower.includes('speaker') || lower.includes('altavoz') || lower.includes('bts') || lower.includes('gts') || lower.includes('ktx') || lower.includes('sv-')) return 'Parlantes';
  if (lower.includes('auricular') || lower.includes('vincha') || lower.includes('headphone') || lower.includes('manos libres')) return 'Auriculares';
  if (lower.includes('cable') || lower.includes('adaptador') || lower.includes('cab-') || lower.includes('cordon')) return 'Cables & Adaptadores';
  if (lower.includes('micrófono') || lower.includes('microfono')) return 'Microfonos';
  if (lower.includes('placa')) return 'Placas de Sonido';
  if (lower.includes('radio')) return 'Radios';
  
  // Iluminación
  if (lower.includes('foco') || lower.includes('lampara')) return 'Iluminación';
  
  // Personal
  if (lower.includes('mochila') || lower.includes('bolsa')) return 'Mochilas & Bolsas';
  if (lower.includes('lentes') || lower.includes('gafas')) return 'Accesorios Ópticos';
  if (lower.includes('buclera') || lower.includes('rizadora') || lower.includes('secador') || lower.includes('planchita') || lower.includes('cortapelo') || lower.includes('depiladora') || lower.includes('masajeador') || lower.includes('perfilador') || lower.includes('cejas') || lower.includes('strass') || lower.includes('cepillo')) return 'Belleza & Personal';
  
  // Cámaras
  if (lower.includes('camara') || lower.includes('cámara') || lower.includes('noga')) return 'Cámaras & Video';
  
  // Energía
  if (lower.includes('cargador') || lower.includes('fuente') || lower.includes('pila') || lower.includes('lithium') || lower.includes('bateria')) return 'Cargadores & Baterías';
  
  // Electrónica & Gadgets
  if (lower.includes('tv box') || lower.includes('proyector') || lower.includes('antena') || lower.includes('wifi') || lower.includes('smart') || lower.includes('conversor') || lower.includes('hdmi') || lower.includes('switch selector') || lower.includes('laser')) return 'Electrónica & Gadgets';
  
  // Gaming
  if (lower.includes('consola') || lower.includes('joystick') || lower.includes('mouse') || lower.includes('gamepad') || lower.includes('ps4') || lower.includes('x2')) return 'Electrónica Gamer';
  
  // Oficina
  if (lower.includes('marcador') || lower.includes('almohadilla') || lower.includes('reposamuñecas') || lower.includes('contadora')) return 'Accesorios Oficina';
  
  // Juguetes
  if (lower.includes('crayones') || lower.includes('auto') || lower.includes('juguete') || lower.includes('robot') || lower.includes('cybertruck')) return 'Juguetes & Entretenimiento';
  
  // Automotriz
  if (lower.includes('parasol') || lower.includes('holder') || lower.includes('soporte') || lower.includes('rejilla') || lower.includes('auto')) return 'Accesorios Automotrices';
  
  // Deportes
  if (lower.includes('colchon') || lower.includes('inflable') || lower.includes('camping') || lower.includes('deporte')) return 'Deportes & Camping';
  
  return 'Otros';
}

const categorized = {};
allProducts.forEach(product => {
  const category = categorizeProduct(product.name);
  if (!categorized[category]) {
    categorized[category] = [];
  }
  categorized[category].push(product);
});

console.log('✅ Categorización Final:\n');
let total = 0;
Object.entries(categorized).sort().forEach(([cat, prods]) => {
  console.log(`📦 ${cat}: ${prods.length}`);
  total += prods.length;
});
console.log(`\n📊 Total: ${total} productos`);

fs.writeFileSync('products-categorized.json', JSON.stringify(categorized, null, 2));
console.log('\n✅ Guardado en products-categorized.json');
