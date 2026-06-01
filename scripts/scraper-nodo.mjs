import { chromium } from 'playwright';
import * as fs from 'fs';

const BASE_URL = 'https://www.nodourquiza.com';
const MARKUP = 1.08; // 8% margen
const SUPPLIER_CODE = 'NDO';

let productos = [];
let stats = {
  total: 0,
  exitosos: 0,
  errores: 0,
  precioMin: Infinity,
  precioMax: -Infinity,
  tiempoInicio: Date.now()
};

const log = (msg, tipo = 'info') => {
  const tipos = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warn: '\x1b[33m',    // Yellow
    reset: '\x1b[0m'
  };
  console.log(`${tipos[tipo] || tipos.info}${msg}${tipos.reset}`);
};

const main = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. LOGIN
    log('🔐 Navegando a login...', 'info');
    await page.goto(`${BASE_URL}/?sec=login`, { waitUntil: 'networkidle' });

    log('🔐 Ingresando credenciales...', 'info');

    // Usar los selectores correctos: loguser, logpass, ingresar
    await page.fill('input[name="loguser"]', 'dti');
    await page.fill('input[name="logpass"]', '1234');
    await page.click('input[name="ingresar"]');

    // Esperar a que cambie la URL o la página se recargue
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'load', timeout: 20000 }).catch(() => {}),
      page.waitForTimeout(5000)
    ]);

    log('✅ Login completado', 'success');

    // 2. SCRAPEAR LISTADO CON PRECIOS
    let pagina = 1;
    while (true) {
      const url = `${BASE_URL}/?sec=subcateg&npag=${pagina}&mostrarcomo=listado`;
      log(`📄 Scrapeando página ${pagina}...`, 'info');

      try {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      } catch (e) {
        log(`  ⚠️ Timeout cargando página, continuando de todas formas...`, 'warn');
      }

      // Esperar a que carguen los precios (máximo 3 segundos)
      await page.waitForTimeout(3000);

      // Extraer todos los productos de la página
      const productosEnPagina = await page.evaluate(() => {
        const items = document.querySelectorAll('div.item');
        const productos = [];

        items.forEach((item) => {
          try {
            // Extraer idProd del primer link con href que contiene idProd
            const linkDetalle = item.querySelector('a[href*="idProd="]');
            if (!linkDetalle) return;

            const href = linkDetalle.getAttribute('href');
            const idProdMatch = href.match(/idProd=(\d+)/);
            if (!idProdMatch) return;

            const idProd = parseInt(idProdMatch[1]);

            // Extraer nombre - del link con clase "descripcion"
            const linkDescripcion = item.querySelector('a.descripcion');
            const nombre = linkDescripcion ? linkDescripcion.textContent.trim() : '';
            if (!nombre) return;

            // Extraer imagen - src del img dentro del item
            const img = item.querySelector('img');
            let imagenUrl = '';
            if (img) {
              imagenUrl = img.getAttribute('src');
              if (imagenUrl && !imagenUrl.includes('http')) {
                imagenUrl = `https://www.nodourquiza.com/${imagenUrl}`;
              }
            }

            // Extraer precio - strong dentro de div.grid_3.precio
            let precio = 0;
            const precioStrong = item.querySelector('div.precio strong');
            if (precioStrong) {
              const precioTexto = precioStrong.textContent.trim();
              // Remover $ y convertir 1,10 → 1.10
              const num = parseFloat(precioTexto.replace(/\$/g, '').replace(/\./g, '').replace(',', '.').trim());
              if (num > 0) precio = num;
            }

            // Extraer stock - está en <p id="stockTotal{idProd}"> pero oculta
            let stock = 0;
            const stockP = item.querySelector(`p#stockTotal${idProd}`);
            if (stockP) {
              const stockTexto = stockP.textContent;
              const stockMatch = stockTexto.match(/(\d+)/);
              if (stockMatch) stock = parseInt(stockMatch[1]);
            }

            if (idProd && nombre && precio > 0) {
              productos.push({
                id: idProd,
                nombre: nombre,
                imagenUrl: imagenUrl,
                precioCosto: precio,
                stock: stock,
                url_detalle: `https://www.nodourquiza.com/?sec=detalle&idProd=${idProd}`
              });
            }
          } catch (e) {
            // Ignorar productos con error
          }
        });

        return productos;
      });

      log(`  ✓ ${productosEnPagina.length} productos encontrados en página ${pagina}`, 'success');

      if (productosEnPagina.length === 0) {
        log(`🛑 Fin del listado. No hay productos en página ${pagina}`, 'info');
        break;
      }

      productos.push(...productosEnPagina);
      pagina++;
      await page.waitForTimeout(500); // Delay entre páginas
    }

    // 3. PROCESAR PRECIOS
    log(`\n💰 Procesando ${productos.length} productos...`, 'info');

    for (let i = 0; i < productos.length; i++) {
      const p = productos[i];
      if (p.precioCosto > 0) {
        p.precio_venta = Math.round(p.precioCosto * MARKUP * 100) / 100;
        stats.precioMin = Math.min(stats.precioMin, p.precioCosto);
        stats.precioMax = Math.max(stats.precioMax, p.precioCosto);
        stats.exitosos++;
      } else {
        stats.errores++;
      }
    }

    // 4. EXPORTAR JSON
    const salida = productos.map(p => ({
      id: p.id,
      sku: `${SUPPLIER_CODE}-${p.id}`,
      nombre: p.nombre,
      precio_costo: p.precioCosto || 0,
      precio_venta: p.precio_venta || 0,
      imagen_url: p.imagenUrl,
      stock: p.stock || 0,
      url_detalle: p.url_detalle
    }));

    fs.writeFileSync('./scripts/nodo-productos.json', JSON.stringify(salida, null, 2), 'utf-8');
    log(`✅ JSON exportado: scripts/nodo-productos.json`, 'success');

    // 5. MOSTRAR RESUMEN
    const tiempoTotal = ((Date.now() - stats.tiempoInicio) / 1000).toFixed(2);
    log(`\n${'='.repeat(60)}`, 'info');
    log('📊 RESUMEN DEL SCRAPING', 'success');
    log(`${'='.repeat(60)}`, 'info');
    log(`✅ Total de productos: ${productos.length}`, 'success');
    log(`✅ Exitosos con precio: ${stats.exitosos}`, 'success');
    log(`❌ Errores: ${stats.errores}`, 'warn');
    if (stats.precioMin !== Infinity) {
      log(`💰 Rango de precios: $${stats.precioMin.toFixed(2)} - $${stats.precioMax.toFixed(2)}`, 'info');
    }
    log(`⏱️  Tiempo total: ${tiempoTotal}s`, 'info');
    log(`${'='.repeat(60)}\n`, 'info');

  } catch (err) {
    log(`\n💥 Error fatal: ${err.message}`, 'error');
    process.exit(1);
  } finally {
    await browser.close();
  }
};

main();
