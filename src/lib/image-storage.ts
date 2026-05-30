import { createServiceRoleClient } from './supabase/server';
import fetch from 'node-fetch';

export async function downloadAndStoreImage(
  imageUrl: string,
  sku: string,
  supplierId: string
): Promise<{ url: string; path: string } | null> {
  try {
    console.log(`[image-storage] Descargando imagen para ${sku}...`);

    const supabase = createServiceRoleClient();

    // Descargar imagen
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(`[image-storage] ⚠️ No se pudo descargar ${imageUrl}`);
      return null;
    }

    const buffer = await response.buffer();
    const fileExt = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const filename = `${sku}.${fileExt}`;
    const storagePath = `${supplierId}/${filename}`;

    // Guardar en Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(storagePath, buffer, { upsert: true });

    if (uploadError) {
      console.error(`[image-storage] ❌ Error al guardar: ${uploadError.message}`);
      return null;
    }

    // Obtener URL pública
    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(storagePath);

    const publicUrl = data.publicUrl;

    // Registrar en product_images
    await supabase
      .from('product_images')
      .upsert(
        {
          sku,
          supplier_id: supplierId,
          storage_path: storagePath,
          public_url: publicUrl,
        },
        { onConflict: 'sku' }
      );

    console.log(`[image-storage] ✓ Imagen guardada: ${publicUrl}`);
    return { url: publicUrl, path: storagePath };
  } catch (err: any) {
    console.error(`[image-storage] ❌ Error:`, err.message);
    return null;
  }
}

export async function getExistingImage(sku: string): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('product_images')
      .select('public_url')
      .eq('sku', sku)
      .single();

    if (error || !data) {
      return null;
    }

    return data.public_url;
  } catch (err) {
    return null;
  }
}

export async function getExistingProduct(sku: string) {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('products')
      .select('id, sku, image_url')
      .eq('sku', sku)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (err) {
    return null;
  }
}
