# Procedimientos de Web Scraping

Documentación de los scrapers implementados para PlanetaOnce.

## 1. Impotekno Scraper

**URL Base:** `https://www.impotekno.com/catalogo_imptk.php`

### Estructura
- **Categorías:** 22 categorías (IDs: 1, 2, 9, 10, 18, 22, 23, 29, 33, 44, 48, 51, 56, 61, 73, 78, 82, 83, 84, 85, 87, 88)
- **Parámetro:** `rub={categoryId}`
- **Headers:** User-Agent estándar Mozilla

### Extracción
```javascript
const response = await fetch(
  `https://www.impotekno.com/catalogo_imptk.php?rub=${categoryId}`,
  { headers: { "User-Agent": "Mozilla/5.0..." } }
);
const html = await response.text();
// Parser HTML con regex/cheerio
```

### Transformación
- **SKU Prefix:** `SAR-` (Ej: SAR-WS-1965)
- **Precio:** Multiplicar por 1.15 (15% margen)
- **Imágenes:** `https://www.impotekno.com/fotos/{SKU}.jpg`
- **Salida:** `public/products.json`

### Campos Extraídos
- `sku`: Código del producto
- `name`: Nombre del producto
- `unit_price`: Precio unitario
- `units_per_package`: Unidades por paquete
- `image_url`: URL de la imagen

---

## 2. San Julián Scraper

**URL Base:** `https://sanjulian99.com/`

### Estructura
- **Categorías:** 26 categorías (IDs: 1-25, 99999)
- **Parámetro:** `rub={categoryId}`
- **Autenticación:** Login requerido

### Autenticación
```javascript
const cookieJar = new CookieJar();
const client = got.extend({ cookieJar, headers: {...} });

await client.post("https://sanjulian99.com/index.php", {
  form: { clave: "pasteur", enviar: "Ingresar" }
});
```

### Extracción
```javascript
const response = await client.get(
  `https://sanjulian99.com/catalogo2021.php?rub=${categoryId}`
);
const html = response.body;
```

### Transformación
- **SKU Prefix:** `PAS-` (Ej: PAS-001)
- **Precio:** Multiplicar por 1.1 (10% margen)
- **Imágenes:** `https://sanjulian99.com/fotos/{SKU}.jpg`
- **Salida:** `public/products-sanjulian.json`

### Campos Extraídos
- `sku`: Código del producto
- `name`: Nombre del producto
- `unit_price`: Precio unitario
- `units_per_package`: Unidades por paquete
- `image_url`: URL de la imagen

---

## 3. NextCell Scraper (Estructura Propuesta)

**URL Base:** `https://nextcell.com.ar/` (ejemplo)

### Estructura Típica
- **Categorías:** Identificar IDs/slugs
- **Parámetro:** Depende de la estructura del sitio
- **Autenticación:** Verificar si es necesaria

### Procedimiento Genérico

```javascript
// 1. Login (si es necesario)
await client.post("https://nextcell.com.ar/login", { 
  username: "usuario", 
  password: "contraseña" 
});

// 2. Extraer categorías
for (const categoryId of categoryIds) {
  const response = await client.get(`https://nextcell.com.ar/category/${categoryId}`);
  const products = extractProducts(response.body);
  allProducts.push(...products);
}

// 3. Transformar
const transformed = products.map(p => ({
  sku: `PREFIX-${p.sku}`,
  name: p.name,
  unit_price: Math.round(p.unit_price * margen),
  units_per_package: p.units_per_package,
  image_url: p.image_url
}));

// 4. Guardar
fs.writeFileSync("public/products-nextcell.json", JSON.stringify(transformed));
```

---

## Patrones Comunes

### 1. Headers Necesarios
```javascript
{
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "es-AR",
}
```

### 2. Manejo de Cookies (para sitios con login)
```javascript
import { CookieJar } from "tough-cookie";
import got from "got";

const cookieJar = new CookieJar();
const client = got.extend({ cookieJar, headers: {...} });
```

### 3. Delays entre Requests
```javascript
await new Promise(r => setTimeout(r, 500)); // 500ms delay
```

### 4. Extracción HTML
```javascript
// Usar regex o librería como cheerio
const regex = /<td class="producto">(.+?)<\/td>/g;
const matches = html.matchAll(regex);
```

### 5. Transformación de Precios
```javascript
const margin = 1.15; // 15% para Impotekno
const newPrice = Math.round(originalPrice * margin);
```

### 6. Gestión de Imágenes
- Descargar y almacenar en Supabase Storage
- Reutilizar imágenes existentes (SKU ya registrado)
- Fallback a imagen original si no se puede descargar

---

## Configuración en suppliers-config.json

```json
{
  "id": "supplier-id-xxx",
  "name": "Nombre Proveedor",
  "currency": "ARS|USD",
  "exchange_rate": 1430,
  "margin": 15,
  "prefix": "SKU",
  "scrapeTime": "02:00",
  "username": "usuario",
  "password": "contraseña"
}
```

---

## API Endpoints

- **POST /api/scrape-impotekno** - Ejecuta scraper de Impotekno
- **POST /api/scrape-sanjulian** - Ejecuta scraper de San Julián
- **POST /api/scrape-nextcell** - Ejecuta scraper de NextCell (cuando esté implementado)

---

## Notas Importantes

1. **Rate Limiting:** Incluir delays entre requests para no sobrecargar servidores
2. **User-Agent:** Siempre usar headers de navegador válidos
3. **Robots.txt:** Verificar permisos antes de scrapearlo
4. **Cache:** Reutilizar imágenes cuando el SKU ya existe
5. **Manejo de Errores:** Continuar con categorías siguientes si una falla
6. **Validación:** Verificar estructura de datos antes de guardar
7. **Logs:** Registrar progreso y errores para debugging
