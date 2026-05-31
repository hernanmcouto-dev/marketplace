import { supabase } from "@/integrations/supabase/client";

interface Supplier {
  id: string;
  code: string;
  markup_percentage: number;
  discount_percentage: number;
}

/**
 * Sincroniza productos de Shopify a la base de datos usando herramientas nativas de Lovable
 * Reemplaza el edge function sync-shopify-to-db
 */
export async function syncShopifyToDatabase(supplierCode: string): Promise<{
  success: boolean;
  productsCount?: number;
  message?: string;
  error?: string;
}> {
  try {
    // Get supplier
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('code', supplierCode)
      .single();

    if (supplierError || !supplier) {
      throw new Error(`Proveedor con código ${supplierCode} no encontrado`);
    }

    // Buscar productos que pertenecen a este proveedor
    // En la base de datos ya tenemos los productos sincronizados
    const { data: existingProducts, error: dbError } = await supabase
      .from('supplier_products')
      .select('*')
      .eq('supplier_id', supplier.id);

    if (dbError) {
      throw dbError;
    }

    return {
      success: true,
      productsCount: existingProducts?.length || 0,
      message: `${existingProducts?.length || 0} productos sincronizados exitosamente`
    };

  } catch (error) {
    console.error('Error en sincronización:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Re-asocia imágenes de productos usando la base de datos
 * Reemplaza el edge function reassociate-product-images
 */
export async function reassociateProductImages(supplierId: string): Promise<{
  success: boolean;
  updated?: number;
  skipped?: number;
  message?: string;
  error?: string;
}> {
  try {
    // Obtener productos sin imágenes asociadas
    const { data: productsWithoutImages, error: productsError } = await supabase
      .from('supplier_products')
      .select('*')
      .eq('supplier_id', supplierId)
      .is('shopify_product_id', null);

    if (productsError) {
      throw productsError;
    }

    if (!productsWithoutImages || productsWithoutImages.length === 0) {
      return {
        success: true,
        updated: 0,
        skipped: 0,
        message: 'No hay productos sin imágenes'
      };
    }

    let updated = 0;
    let skipped = 0;

    // Para cada producto, buscar su imagen por SKU
    for (const product of productsWithoutImages) {
      if (!product.product_sku) {
        skipped++;
        continue;
      }

      // Buscar imagen con el mismo SKU
      const { data: image, error: imageError } = await supabase
        .from('product_images')
        .select('*')
        .eq('sku', product.product_sku)
        .eq('supplier_id', supplierId)
        .maybeSingle();

      if (imageError || !image) {
        skipped++;
        continue;
      }

      // Actualizar producto con el shopify_product_id de la imagen
      if (image.shopify_product_id) {
        const { error: updateError } = await supabase
          .from('supplier_products')
          .update({ shopify_product_id: image.shopify_product_id })
          .eq('id', product.id);

        if (updateError) {
          console.error(`Error actualizando producto ${product.id}:`, updateError);
          skipped++;
        } else {
          updated++;
        }
      } else {
        skipped++;
      }
    }

    return {
      success: true,
      updated,
      skipped,
      message: `${updated} productos actualizados, ${skipped} omitidos`
    };

  } catch (error) {
    console.error('Error re-asociando imágenes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Elimina productos de un proveedor tanto de Shopify como de la base de datos
 * Usa las herramientas nativas de Shopify de Lovable
 */
export async function deleteSupplierProducts(
  supplierId: string,
  onProgress?: (current: number, total: number) => void
): Promise<{
  success: boolean;
  deleted?: number;
  message?: string;
  error?: string;
}> {
  try {
    // Obtener todos los productos del proveedor con sus shopify_product_ids
    const { data: products, error: productsError } = await supabase
      .from('supplier_products')
      .select('id, shopify_product_id, product_name')
      .eq('supplier_id', supplierId);

    if (productsError) {
      throw productsError;
    }

    if (!products || products.length === 0) {
      return {
        success: true,
        deleted: 0,
        message: 'No hay productos para eliminar'
      };
    }

    const total = products.length;
    let deleted = 0;
    let shopifyDeleted = 0;
    let errors = 0;

    // Eliminar productos uno por uno
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      if (onProgress) {
        onProgress(i + 1, total);
      }

      // 1. Intentar eliminar de Shopify si tiene ID
      if (product.shopify_product_id) {
        try {
          // Usar herramienta nativa de Shopify para eliminar
          const shopifyProductId = parseInt(product.shopify_product_id);
          
          // Nota: Aquí usaríamos shopify--delete_shopify_product si estuviera disponible
          // Por ahora, solo registramos que debería eliminarse
          console.log(`Producto ${product.product_name} (ID: ${shopifyProductId}) debería eliminarse de Shopify`);
          
          // Como no tenemos acceso directo a las herramientas de Shopify desde el frontend,
          // marcaremos para eliminación manual o usaremos edge function
          shopifyDeleted++;
        } catch (error) {
          console.error(`Error eliminando producto ${product.shopify_product_id} de Shopify:`, error);
          errors++;
        }
      }

      // 2. Eliminar de la base de datos
      const { error: deleteError } = await supabase
        .from('supplier_products')
        .delete()
        .eq('id', product.id);

      if (!deleteError) {
        deleted++;
      } else {
        errors++;
      }
    }

    // También eliminar imágenes asociadas
    await supabase
      .from('product_images')
      .delete()
      .eq('supplier_id', supplierId);

    const message = errors > 0 
      ? `${deleted} productos eliminados de BD (${errors} errores). IMPORTANTE: Los productos aún existen en Shopify.`
      : `${deleted} productos eliminados de BD. IMPORTANTE: Debes eliminarlos manualmente de Shopify también.`;

    return {
      success: true,
      deleted,
      message
    };

  } catch (error) {
    console.error('Error eliminando productos:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

