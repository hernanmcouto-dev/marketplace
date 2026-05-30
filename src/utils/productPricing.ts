/**
 * Extrae la información de bulto del título del producto
 * Busca patrones como "bulto x 52", "x52", "paquete x 10", etc.
 */
export function extractBulkInfo(title: string): { isBulk: boolean; units: number } {
  const normalizedTitle = title.toLowerCase();
  
  // Patrones para detectar venta por bulto en el título
  const bulkPatterns = [
    // "bulto x 52", "bulto x52", "BULTO 52", "BULTO X 378 unidades"
    /bulto\s*x?\s*(\d+)/i,
    // "bulto 52 unidades", "bulto 52 u"
    /bulto\s*(\d+)\s*u(nidades)?/i,
    /paquete\s*x\s*(\d+)/i,
    /pack\s*x\s*(\d+)/i,
    /\((\d+)\s*u(nidades)?\.?\)/i,
    /x(\d+)\s*u(nidades)?\.?$/i,
  ];

  for (const pattern of bulkPatterns) {
    const match = normalizedTitle.match(pattern);
    if (match) {
      const units = parseInt(match[1], 10);
      if (units > 1) {
        return { isBulk: true, units };
      }
    }
  }

  return { isBulk: false, units: 1 };
}

/**
 * Extrae unidades por bulto desde un SKU, por ejemplo "IBEK-XXXX-BULTO-48"
 */
export function extractUnitsFromSku(sku?: string | null): { isBulk: boolean; units: number } {
  if (!sku) return { isBulk: false, units: 1 };

  const normalizedSku = sku.toUpperCase();
  // Patrones típicos: DCH-24051-BULTO-48, IBEK-XXX-BULTO-144, etc.
  const pattern = /BULTO[-\s]*(\d+)/i;
  const match = normalizedSku.match(pattern);

  if (match) {
    const units = parseInt(match[1], 10);
    if (units > 1) {
      return { isBulk: true, units };
    }
  }

  return { isBulk: false, units: 1 };
}

/**
 * Calcula el precio unitario basado en el precio total y las unidades
 */
export function calculateUnitPrice(totalPrice: number, units: number): number {
  return units > 1 ? totalPrice / units : totalPrice;
}
