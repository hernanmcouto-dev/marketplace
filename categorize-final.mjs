import fs from 'fs';

const impoteknoProducts = JSON.parse(fs.readFileSync('public/products.json', 'utf-8'));
const sanjulianProducts = JSON.parse(fs.readFileSync('public/products-sanjulian.json', 'utf-8'));

const allProducts = [
  ...impoteknoProducts.map(p => ({ ...p, provider: "Impotekno" })),
  ...sanjulianProducts.map(p => ({ ...p, provider: "San Julián" }))
];

function categorizeProduct(name) {
  const lower = name.toLowerCase();

  if (lower.includes('camara') || lower.includes('cámara') || lower.includes('noga') || lower.includes('alarma') || lower.includes('sensor')) return 'Seguridad y Cámaras';
  if (lower.includes('parlante') || lower.includes('speaker') || lower.includes('bts') || lower.includes('gts') || lower.includes('ktx') || lower.includes('sv-')) return 'Parlantes';
  if (lower.includes('auricular') || lower.includes('vincha') || lower.includes('headphone') || lower.includes('auric')) return 'Auriculares';
  if (lower.includes('radio')) return 'Radios';
  if (lower.includes('micrófono') || lower.includes('microfono')) return 'Microfonos';
  if (lower.includes('proyector') || lower.includes('soporte') || lower.includes('holder') || lower.includes('tripode') || lower.includes('corbatero')) return 'Audio y Video';
  if (lower.includes('placa')) return 'Electrónica';
  if (lower.includes('cable') || lower.includes('adaptador') || lower.includes('cab-') || lower.includes('hdmi') || lower.includes('switch')) return 'Cables y Adaptadores';
  if (lower.includes('foco') || lower.includes('lampara') || lower.includes('linterna') || lower.includes('led') || lower.includes('aro') || lower.includes('tira') || lower.includes('neon') || lower.includes('rgb') || lower.includes('velador') || lower.includes('antorcha')) return 'Iluminación';
  if (lower.includes('cargador') || lower.includes('fuente') || lower.includes('pila') || lower.includes('bateria') || lower.includes('power bank')) return 'Cargadores y Baterías';
  if (lower.includes('tv box') || lower.includes('antena') || lower.includes('reloj') || lower.includes('pendrive') || lower.includes('impresora') || lower.includes('walkie') || lower.includes('control remoto') || lower.includes('encendedor') || lower.includes('drone') || lower.includes('laser') || lower.includes('amplificador') || lower.includes('smart tv') || lower.includes('smart watch') || lower.includes('calc')) return 'Electrónica y Gadgets';
  if (lower.includes('consola') || lower.includes('joystick') || lower.includes('mouse') || lower.includes('gamepad') || lower.includes('ps4') || lower.includes('x2')) return 'Electrónica Gamer';
  if (lower.includes('buclera') || lower.includes('rizadora') || lower.includes('secador') || lower.includes('planchita') || lower.includes('cortapelo') || lower.includes('corta pelo') || lower.includes('depiladora') || lower.includes('masajeador') || lower.includes('corta uña') || lower.includes('extractor') || lower.includes('espejo') || lower.includes('pistola') || lower.includes('aplicador') || lower.includes('perfilador') || lower.includes('cepillo a vapor')) return 'Cuidado Personal';
  if (lower.includes('mochila') || lower.includes('bolsa') || lower.includes('bandolera') || lower.includes('riñonera') || lower.includes('shirka')) return 'Mochilas y Bolsas';
  if (lower.includes('lentes') || lower.includes('gafas')) return 'Accesorios Ópticos';
  if (lower.includes('guante') || lower.includes('gorra') || lower.includes('bufanda') || lower.includes('afa')) return 'Ropa y Accesorios';
  if (lower.includes('marcador') || lower.includes('almohadilla') || lower.includes('contadora') || lower.includes('boligrafo') || lower.includes('lapiz') || lower.includes('calculadora')) return 'Accesorios Oficina';
  if (lower.includes('jarra') || lower.includes('tetera') || lower.includes('anafe') || lower.includes('freidora') || lower.includes('licuadora') || lower.includes('juguera') || lower.includes('aspiradora') || lower.includes('balanza') || lower.includes('cafetera') || lower.includes('escurridor') || lower.includes('humidificador') || lower.includes('pava') || lower.includes('olla') || lower.includes('cuchillo') || lower.includes('secaplatos') || lower.includes('exprimidor') || lower.includes('bacha') || lower.includes('inflador de globos') || lower.includes('pochoclera') || lower.includes('molde') || lower.includes('set de') || lower.includes('tender') || lower.includes('organizador') || lower.includes('ventilador') || lower.includes('mini lavarropa') || lower.includes('cabezal') || lower.includes('canilla') || lower.includes('dispenser') || lower.includes('practicuna') || lower.includes('mopa') || lower.includes('despertador') || lower.includes('taza')) return 'Hogar y Cocina';
  if (lower.includes('botella') || lower.includes('mate') || lower.includes('termo') || lower.includes('copa') || lower.includes('pela')) return 'Bazar';
  if (lower.includes('bicicleta') || lower.includes('bici') || lower.includes('monopatin') || lower.includes('camping') || lower.includes('colchon') || lower.includes('inflable') || lower.includes('linga') || lower.includes('cadena') || lower.includes('candado') || lower.includes('cinta metrica') || lower.includes('pelota') || lower.includes('parrilla') || lower.includes('carpa') || lower.includes('compresor') || lower.includes('manguera')) return 'Deportes y Camping';
  if (lower.includes('juguete') || lower.includes('infantil') || lower.includes('muñeca') || lower.includes('crayones') || lower.includes('pop it') || lower.includes('tetris') || lower.includes('pizarra') || lower.includes('mascota') || lower.includes('globo') || lower.includes('llavero') || lower.includes('valija') || lower.includes('sticker') || lower.includes('cartel') || lower.includes('bandera') || lower.includes('marranito') || lower.includes('cactus') || lower.includes('sony') || lower.includes('burbujera') || lower.includes('juego') || lower.includes('ritmo')) return 'Juguetes y Entretenimiento';
  if (lower.includes('destornillador') || lower.includes('cinta aisladora') || lower.includes('inflador') || lower.includes('chispero') || lower.includes('kit')) return 'Ferretería y Herramientas';
  if (lower.includes('parasol') || lower.includes('auto')) return 'Accesorios para Autos';

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

console.log('Categorización Final Actualizada:\n');
let total = 0;
Object.entries(categorized).sort().forEach(([cat, prods]) => {
  console.log(cat + ': ' + prods.length);
  total += prods.length;
});
console.log('\nTotal: ' + total);

fs.writeFileSync('products-categorized.json', JSON.stringify(categorized, null, 2));
console.log('\nGuardado');
