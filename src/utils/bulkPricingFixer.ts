import { supabase } from "@/integrations/supabase/client";

const SHOPIFY_API_VERSION = '2025-07';
const SHOPIFY_STORE_PERMANENT_DOMAIN = 'quickstart-ca8e3b56.myshopify.com';
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

interface PriceChange {
  productId: string;
  sku: string;
  oldTitle: string;
  newTitle: string;
  oldPrice: number;
  newPrice: number;
  unitsPerPackage: number;
  unitPrice: number;
}

export async function previewBulkPricingChanges(supplierCode: string): Promise<PriceChange[]> {
  // Get supplier
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('*')
    .eq('code', supplierCode)
    .single();

  if (!supplier) {
    throw new Error(`Proveedor con código ${supplierCode} no encontrado`);
  }

  // Get products from database that belong to this supplier
  const { data: dbProducts } = await supabase
    .from('supplier_products')
    .select('*')
    .eq('supplier_id', supplier.id)
    .gt('units_per_package', 1);

  if (!dbProducts || dbProducts.length === 0) {
    return [];
  }

  const changes: PriceChange[] = [];

  // For each product, calculate the new pricing
  for (const dbProduct of dbProducts) {
    if (!dbProduct.shopify_product_id || !dbProduct.units_per_package) continue;

    const currentPrice = dbProduct.sale_price || dbProduct.cost_price || 0;
    const unitsPerPackage = dbProduct.units_per_package;

    // Calculate unit price (current price is per bulk, we need unit price)
    const unitPrice = currentPrice / unitsPerPackage;

    // Calculate new sale price with supplier markup
    const priceAfterDiscount = unitPrice * (1 - supplier.discount_percentage / 100);
    const newSalePrice = priceAfterDiscount * (1 + supplier.markup_percentage / 100);

    // Format title to include "- Bulto x {units}" if not already present
    let newTitle = dbProduct.product_name || '';
    const hasBultoFormat = newTitle.includes('- Bulto x');
    
    if (!hasBultoFormat) {
      // Remove old bulk info patterns and add standard format
      newTitle = newTitle
        .replace(/\s*bulto\s*x\s*\d+/gi, '')
        .replace(/\s*paquete\s*x\s*\d+/gi, '')
        .replace(/\s*pack\s*x\s*\d+/gi, '')
        .replace(/\s*\(\d+\s*u(nidades)?\.?\)/gi, '')
        .replace(/\s*x\d+\s*u(nidades)?\.?$/gi, '')
        .trim();
      
      newTitle = `${newTitle} - Bulto x ${unitsPerPackage}`;
    }

    changes.push({
      productId: dbProduct.shopify_product_id,
      sku: dbProduct.product_sku || '',
      oldTitle: dbProduct.product_name || '',
      newTitle: newTitle,
      oldPrice: currentPrice,
      newPrice: parseFloat(newSalePrice.toFixed(2)),
      unitsPerPackage: unitsPerPackage,
      unitPrice: parseFloat(unitPrice.toFixed(2))
    });
  }

  return changes;
}

export async function applyBulkPricingChanges(
  changes: PriceChange[], 
  supplierId: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ updated: number; failed: number }> {
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    
    if (onProgress) {
      onProgress(i + 1, changes.length);
    }

    try {
      // Update in database
      const { error: dbError } = await supabase
        .from('supplier_products')
        .update({
          product_name: change.newTitle,
          cost_price: change.unitPrice,
          sale_price: change.newPrice
        })
        .eq('shopify_product_id', change.productId)
        .eq('supplier_id', supplierId);

      if (dbError) {
        console.error(`Error actualizando producto ${change.productId} en BD:`, dbError);
        failed++;
        continue;
      }

      // Note: We're only updating the database here
      // Shopify product updates would need to be done through the Admin API
      // which requires proper access tokens configured in edge functions
      
      updated++;
    } catch (error) {
      console.error(`Error procesando producto ${change.productId}:`, error);
      failed++;
    }
  }

  return { updated, failed };
}
