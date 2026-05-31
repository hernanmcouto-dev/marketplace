/**
 * Configuración de PDF.js
 * 
 * IMPORTANTE: No modificar esta configuración a menos que sea necesario
 * Esta configuración usa unpkg CDN que es la más confiable para cargar el worker
 * 
 * Problemas conocidos y soluciones:
 * - ❌ import.meta.url con new URL() → Falla en producción
 * - ❌ cdnjs.cloudflare.com → A veces falla por CORS
 * - ❌ workerSrc vacío → PDF.js requiere un valor válido
 * - ✅ unpkg.com → Funciona de manera confiable
 */

export const PDFJS_WORKER_VERSION = '5.4.394';
export const PDFJS_WORKER_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_WORKER_VERSION}/build/pdf.worker.min.mjs`;

/**
 * Configura el worker de PDF.js
 * Debe llamarse antes de usar cualquier funcionalidad de PDF.js
 */
export async function configurePdfJsWorker() {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  return pdfjsLib;
}
