# 📍 ÍNDICE DE SCRAPERS - Referencia Rápida

## 📂 Ubicación de Archivos
Todos los códigos completos de los scrapers están guardados en:
```
.backups/
├── SCRAPERS-REFERENCIA-impotekno.ts
├── SCRAPERS-REFERENCIA-sanjulian.ts
├── SCRAPERS-REFERENCIA-nextcell.ts
└── SCRAPERS-INDICE.md (este archivo)
```

---

## 🕷️ SCRAPER 1: IMPOTEKNO

**Archivo Referencia:** `SCRAPERS-REFERENCIA-impotekno.ts`  
**Ubicación en Proyecto:** `src/app/api/scrape-impotekno/route.ts`

### Configuración
- **Método:** Web Scraping (HTML Parsing con `got`)
- **URL Base:** https://www.impotekno.com
- **Login:** `clave=sarmiento`
- **Categorías:** 22 categorías fijas
- **Prefijo SKU:** `SAR-`
- **Margen:** 15% (1.15x)
- **Archivo Salida:** `public/products.json`
- **URL Imágenes:** `https://www.impotekno.com/fotos/{sku-sin-prefijo}.jpg`

### API
```bash
curl -X POST http://localhost:3000/api/scrape-impotekno
```

### Características
- ✅ Manejo de sesiones con CookieJar
- ✅ Extracción de nombre, SKU, precio, cantidad por bulto
- ✅ Proxy inteligente de imágenes con caché
- ✅ Server-Sent Events (SSE) para monitoreo en tiempo real

---

## 🕷️ SCRAPER 2: SAN JULIÁN

**Archivo Referencia:** `SCRAPERS-REFERENCIA-sanjulian.ts`  
**Ubicación en Proyecto:** `src/app/api/scrape-sanjulian/route.ts`

### Configuración
- **Método:** Web Scraping (HTML Parsing con `got`)
- **URL Base:** https://sanjulian99.com
- **Login:** `clave=pasteur`
- **Categorías:** 26 categorías
- **Prefijo SKU:** `PAS-`
- **Margen:** 10% (1.1x)
- **Archivo Salida:** `public/products-sanjulian.json`
- **URL Imágenes:** `https://sanjulian99.com/fotos/{sku}.jpg`

### API
```bash
curl -X POST http://localhost:3000/api/scrape-sanjulian
```

### Características
- ✅ Regex para extraer SKU, nombre, precio
- ✅ Manejo de sesiones con CookieJar
- ✅ Proxy inteligente de imágenes
- ✅ SSE para monitoreo

---

## 🕷️ SCRAPER 3: NEXTCELL (API REST)

**Archivo Referencia:** `SCRAPERS-REFERENCIA-nextcell.ts`  
**Ubicación en Proyecto:** `src/app/api/scrape-nextcell/route.ts`

### Configuración
- **Método:** API REST (WooCommerce)
- **URL Base:** https://nextcell.com.ar/wp-json/wc/store/products
- **Paginación:** 20 items por página
- **Prefijo SKU:** `PTT-`
- **Margen:** 10% (1.1x)
- **Archivo Salida:** `public/products-nextcell.json`
- **Imágenes:** JSON directo de API

### API
```bash
curl -X POST http://localhost:3000/api/scrape-nextcell
```

### Características
- ✅ Fetching paginado automático
- ✅ Parsing de JSON (no HTML)
- ✅ Fallback para SKU (usa ID si no existe)
- ✅ Proxy inteligente de imágenes

---

## 📊 RESUMEN DE PRODUCTOS

| Proveedor | Prefijo | SKUs | Margen | Método |
|-----------|---------|------|--------|--------|
| Impotekno | SAR- | 438 | +15% | HTML Scraping |
| San Julián | PAS- | 486 | +10% | HTML Scraping |
| NextCell | PTT- | 4,668 | +10% | API REST |
| **TOTAL** | - | **5,592** | - | - |

---

## 🔧 Utilidades Compartidas

### `src/lib/image-registry.ts`
- **Función:** `getImageUrl(sku)` - Obtiene URL de imagen cacheada
- **Función:** `downloadAndCacheImage(sku, imageUrl)` - Descarga y cachea imágenes
- **Almacenamiento:** `public/images/registry.json` (mapeo SKU → URL)

### `src/app/api/image-proxy/route.ts`
- **Propósito:** Proxy de imágenes con caché bajo demanda
- **Parámetros:** `url`, `provider`, `sku`, `v` (timestamp)
- **Características:** Descarga solo cuando se solicita (lazy loading)

---

## ⚡ Cómo Usar la Referencia

1. **Necesitas entender un scraper específico:**
   - Abre el archivo de referencia correspondiente
   - Todos los comentarios están en la cabecera

2. **Necesitas copiar el código:**
   - Toma desde `SCRAPERS-REFERENCIA-{proveedor}.ts`
   - Adapta según tus necesidades

3. **Necesitas agregar un nuevo scraper:**
   - Sigue el mismo patrón de estructura
   - USA Server-Sent Events (SSE) para el progress
   - Implementa caché inteligente de imágenes

---

## 🚀 Próximas Integraciones (Plantilla)

```typescript
// ESTRUCTURA COMÚN DE UN SCRAPER

1. Autenticación (si es requerida)
2. Loop de páginas/categorías
3. Extracción de datos (HTML regex o JSON parsing)
4. Agregación con prefijo SKU
5. Caché inteligente de imágenes
6. Guardado en public/products-{nombre}.json
7. Retorno de eventos SSE

// SIEMPRE INCLUIR:
- sendLog() para mensajes
- sendProgress() para barra de progreso
- sendError() para errores
- sendComplete() para finalización
- maxDuration = 600 (10 minutos timeout)
```

---

**Última actualización:** 2026-05-31  
**Total de código guardado:** ~1,200 líneas
