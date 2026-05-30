<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Daily Scrapers (Automated)

Los scrapers de productos corren automáticamente cada día a través de `src/lib/scraper-scheduler.ts`, inicializado en `instrumentation.ts`.

### Horarios
- **Impotekno**: 2:00 AM (02:00) → `public/products.json` (prefijo SAR-, +15% margen)
- **San Julián**: 3:00 AM (03:00) → `public/products-sanjulian.json` (prefijo PAS-, +10% margen)

### Cómo funciona
1. El server inicia y ejecuta `instrumentation.ts` → `initScraperSchedule()`
2. Se crean 2 cron jobs que corren a las horas especificadas
3. Cada job hace POST a su endpoint correspondiente
4. Los logs aparecen en la consola del server (búscar `[scheduler]`)

### Para ejecutar manualmente
```bash
curl -X POST http://localhost:3000/api/scrape-impotekno
curl -X POST http://localhost:3000/api/scrape-sanjulian
```

### Para agregar un nuevo scraper
1. Agregar entrada en `SCRAPERS` array en `src/lib/scraper-scheduler.ts`
2. El endpoint debe hacer POST y retornar `{ imported: número }`
3. El scheduler lo ejecutará automáticamente
