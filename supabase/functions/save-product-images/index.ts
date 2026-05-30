import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // images: array de { dataUrl: string, yPosition: number, width: number, height: number, pageNum: number }
    // products: array con { codigo, nombre, imageRowIndex, ... }
    const { images, supplierCode, products } = await req.json();
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`[save-product-images] ${products.length} productos, ${images.length} imágenes embebidas`);

    // Obtener supplier ID
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('code', supplierCode)
      .single();

    if (!supplier) {
      throw new Error(`Proveedor con código ${supplierCode} no encontrado`);
    }

    // ─── PASO 1: filtrar imágenes de encabezado ───────────────────────────────
    // Descartamos imágenes muy anchas y bajas (logos/encabezados).
    // Heurística: si ancho > 3 × alto y alto < 100px → es encabezado.
    const productImages = images.filter((img: any) => {
      if (!img.width || !img.height) return true; // sin info de dimensiones → conservar
      const isHeader = img.width > img.height * 3 && img.height < 120;
      if (isHeader) console.log(`[save-product-images] Descartando imagen encabezado (${img.width}x${img.height})`);
      return !isHeader;
    });

    // ─── PASO 2: ordenar imágenes de producto por posición Y dentro de cada página ──
    // Esto asegura que el orden sea top→bottom (igual al orden de filas de la tabla).
    productImages.sort((a: any, b: any) => {
      if (a.pageNum !== b.pageNum) return (a.pageNum || 0) - (b.pageNum || 0);
      return (a.yPosition || 0) - (b.yPosition || 0);
    });

    console.log(`[save-product-images] ${productImages.length} imágenes de producto tras filtrar encabezados`);

    const uploadedImages = [];
    let skippedCount = 0;

    for (const product of products) {
      if (!product.codigo) {
        console.log(`[save-product-images] Saltando producto sin código: ${product.nombre}`);
        continue;
      }

      // Construir SKU base (con prefijo de proveedor si no lo tiene)
      let baseSKU = product.codigo;
      if (!product.codigo.startsWith(supplierCode)) {
        baseSKU = `${supplierCode}-${product.codigo}`;
      }

      // Verificar si ya existe imagen para este SKU
      const { data: existingImage } = await supabase
        .from('product_images')
        .select('public_url, id')
        .eq('sku', baseSKU)
        .eq('supplier_id', supplier.id)
        .single();

      if (existingImage?.public_url) {
        console.log(`[save-product-images] Imagen ya existe para ${baseSKU}, reutilizando`);
        uploadedImages.push({ sku: baseSKU, publicUrl: existingImage.public_url, reused: true });
        skippedCount++;
        continue;
      }

      // ─── Seleccionar la imagen correcta ─────────────────────────────────────
      // Si la IA nos dio imageRowIndex (≥ 0), usamos ese índice dentro del array
      // ya ordenado por posición Y. De lo contrario, usamos rowIndex como fallback.
      const imageRowIndex = typeof product.imageRowIndex === 'number' && product.imageRowIndex >= 0
        ? product.imageRowIndex
        : (product.rowIndex ?? -1);

      const selectedImage = imageRowIndex >= 0 && imageRowIndex < productImages.length
        ? productImages[imageRowIndex]
        : null;

      if (!selectedImage) {
        console.log(`[save-product-images] Sin imagen disponible para ${baseSKU} (imageRowIndex=${imageRowIndex})`);
        continue;
      }

      // ─── Subir imagen a Supabase Storage ────────────────────────────────────
      const imageDataUrl = selectedImage.dataUrl;
      const fileName = `${baseSKU}-${Date.now()}.jpeg`;
      const filePath = `${supplierCode}/products/${fileName}`;

      const base64Data = imageDataUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let j = 0; j < byteCharacters.length; j++) {
        byteArray[j] = byteCharacters.charCodeAt(j);
      }
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) {
        console.error(`[save-product-images] Error subiendo imagen para ${baseSKU}:`, uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Guardar referencia en la BD
      const { error: dbError } = await supabase
        .from('product_images')
        .insert({
          sku: baseSKU,
          supplier_id: supplier.id,
          storage_path: filePath,
          public_url: publicUrl,
          uploaded_to_shopify: false
        });

      if (dbError) {
        console.error(`[save-product-images] Error guardando registro para ${baseSKU}:`, dbError);
      } else {
        uploadedImages.push({ sku: baseSKU, publicUrl, reused: false });
        console.log(`[save-product-images] ✅ Imagen guardada para ${baseSKU} (imageRowIndex=${imageRowIndex})`);
      }
    }

    console.log(`[save-product-images] Completo: ${uploadedImages.length} imágenes, ${skippedCount} reutilizadas`);

    return new Response(
      JSON.stringify({
        success: true,
        uploadedCount: uploadedImages.length,
        skippedCount,
        newCount: uploadedImages.filter(img => !img.reused).length,
        images: uploadedImages
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[save-product-images] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
