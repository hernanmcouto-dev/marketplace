import cron from 'cron';

const SCRAPERS = [
  {
    name: 'Impotekno',
    endpoint: '/api/scrape-impotekno',
    schedule: '0 2 * * *', // 2:00 AM diariamente
  },
  {
    name: 'San Julián',
    endpoint: '/api/scrape-sanjulian',
    schedule: '0 3 * * *', // 3:00 AM diariamente
  },
];

export function initScraperSchedule() {
  console.log('[scheduler] Inicializando scraper schedule...');

  SCRAPERS.forEach(({ name, endpoint, schedule }) => {
    try {
      const task = cron.schedule(schedule, async () => {
        console.log(`[scheduler] ▶️  Ejecutando ${name} scraper...`);

        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });

          const result = await response.json();

          if (response.ok) {
            console.log(`[scheduler] ✅ ${name}: ${result.imported} productos importados`);
          } else {
            console.error(`[scheduler] ❌ ${name}: ${result.error}`);
          }
        } catch (err: any) {
          console.error(`[scheduler] ❌ Error en ${name}:`, err.message);
        }
      });

      console.log(`[scheduler] ✓ ${name} programado: ${schedule}`);
      // Guardar referencia para poder detener si es necesario
      (global as any)[`${name}CronTask`] = task;
    } catch (err: any) {
      console.error(`[scheduler] ✗ Error al programar ${name}:`, err.message);
    }
  });
}

export function stopScraperSchedule() {
  console.log('[scheduler] Deteniendo todos los scrapers...');
  SCRAPERS.forEach(({ name }) => {
    const task = (global as any)[`${name}CronTask`];
    if (task) {
      task.stop();
      console.log(`[scheduler] ✓ ${name} detenido`);
    }
  });
}
