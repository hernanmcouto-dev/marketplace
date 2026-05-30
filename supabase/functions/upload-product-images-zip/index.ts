import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ZipReaderStream } from 'https://deno.land/x/zipjs/index.js';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { zipFile } = await req.json();
    
    if (!zipFile) {
      throw new Error("No ZIP file provided");
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Processing ZIP file...');

    // Convertir base64 a Blob
    const base64Data = zipFile.split(',')[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const zipBlob = new Blob([bytes], { type: 'application/zip' });

    // Primero, extraer TODAS las entradas del ZIP en memoria
    const entries: Array<{
      fileName: string;
      sku: string;
      supplierCode: string;
      imageData: Uint8Array;
      contentType: string;
      extension: string;
    }> = [];

    console.log('Extracting ZIP entries...');
    
    // Función para sanitizar nombres de archivo
    const sanitizeSku = (sku: string): string => {
      return sku
        .normalize('NFD') // Descomponer caracteres unicode
        .replace(/[\u0300-\u036f]/g, '') // Eliminar diacríticos
        .replace(/[^\w\s-_.]/g, '-') // Reemplazar caracteres especiales con guiones
        .replace(/\s+/g, '-') // Reemplazar espacios con guiones
        .replace(/-+/g, '-') // Eliminar guiones duplicados
        .replace(/^-|-$/g, ''); // Eliminar guiones al inicio/final
    };
    
    for await (const entry of zipBlob.stream().pipeThrough(new ZipReaderStream())) {
      if (entry.directory) continue;
      
      const fileName = entry.filename;
      
      // Ignorar archivos ocultos o metadatos
      if (fileName.startsWith('.') || fileName.includes('__MACOSX') || fileName.startsWith('__')) {
        continue;
      }

      // Solo procesar imágenes
      if (!fileName.match(/\.(jpg|jpeg|png|webp)$/i)) {
        continue;
      }

      const fileNameOnly = fileName.split('/').pop() || fileName;
      const rawSku = fileNameOnly.replace(/\.(jpg|jpeg|png|webp)$/i, '').trim();
      const sku = sanitizeSku(rawSku); // Sanitizar el SKU
      const supplierCode = sku.split('-')[0];
      
      console.log(`Processing: ${rawSku} -> ${sku}`);

      if (!supplierCode) {
        console.error(`Cannot extract supplier code from SKU: ${sku}`);
        continue;
      }

      // Leer imagen en memoria
      if (!entry.readable) {
        console.error(`No readable stream for entry: ${fileName}`);
        continue;
      }

      const imageBlob = await new Response(entry.readable).blob();
      const imageData = new Uint8Array(await imageBlob.arrayBuffer());
      
      let contentType = 'image/jpeg';
      if (fileNameOnly.toLowerCase().endsWith('.png')) contentType = 'image/png';
      else if (fileNameOnly.toLowerCase().endsWith('.webp')) contentType = 'image/webp';

      const extension = fileNameOnly.split('.').pop()?.toLowerCase() || 'jpg';

      entries.push({
        fileName: fileNameOnly,
        sku,
        supplierCode,
        imageData,
        contentType,
        extension
      });
    }

    console.log(`Extracted ${entries.length} image entries from ZIP`);

    if (entries.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No valid images found in ZIP"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Detectar proveedor del primer archivo
    const detectedSupplierCode = entries[0].supplierCode;
    console.log(`Detected supplier code: ${detectedSupplierCode}`);

    // Buscar proveedor en BD
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('code', detectedSupplierCode)
      .single();

    if (!supplier) {
      throw new Error(`Supplier with code ${detectedSupplierCode} not found`);
    }

    // Eliminar todas las imágenes existentes del proveedor
    console.log(`Deleting existing images for supplier: ${detectedSupplierCode}`);
    
    const { data: existingImages } = await supabase
      .from('product_images')
      .select('storage_path')
      .eq('supplier_id', supplier.id);

    let deletedOldImages = 0;
    if (existingImages && existingImages.length > 0) {
      const paths = existingImages.map(img => img.storage_path);
      await supabase.storage
        .from('product-images')
        .remove(paths);
      
      await supabase
        .from('product_images')
        .delete()
        .eq('supplier_id', supplier.id);
      
      deletedOldImages = existingImages.length;
      console.log(`Deleted ${deletedOldImages} old images`);
    }

    // Procesar imágenes en lotes
    let processedCount = 0;
    let errorCount = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(entries.length / BATCH_SIZE)}`);

      // Subir imágenes en paralelo dentro del lote
      const uploadPromises = batch.map(async (entry) => {
        try {
          const storagePath = `${entry.supplierCode}/products/${entry.sku}-${Date.now()}.${entry.extension}`;

          // Subir a storage
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(storagePath, entry.imageData, {
              contentType: entry.contentType,
              upsert: true
            });

          if (uploadError) {
            console.error(`Upload error for ${entry.sku}:`, uploadError.message);
            return { success: false };
          }

          // Obtener URL pública
          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(storagePath);

          // Guardar en BD
          const { error: dbError } = await supabase
            .from('product_images')
            .insert({
              sku: entry.sku,
              supplier_id: supplier.id,
              storage_path: storagePath,
              public_url: urlData.publicUrl,
              uploaded_to_shopify: false
            });

          if (dbError) {
            console.error(`DB error for ${entry.sku}:`, dbError.message);
            return { success: false };
          }

          return { success: true };
        } catch (error) {
          console.error(`Error processing ${entry.sku}:`, error);
          return { success: false };
        }
      });

      const results = await Promise.all(uploadPromises);
      
      results.forEach(result => {
        if (result.success) {
          processedCount++;
        } else {
          errorCount++;
        }
      });

      console.log(`Batch complete: ${processedCount} processed, ${errorCount} errors`);
    }

    console.log(`Processing complete: Deleted ${deletedOldImages} old images, Processed ${processedCount}/${entries.length}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedOldImages,
        totalFiles: entries.length,
        processedCount,
        errorCount,
        message: `Procesadas ${processedCount} de ${entries.length} imágenes`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing ZIP:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
