import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://uenznotcycpygslwwqvp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlbnpub3RjeWNweWdzbHd3cXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMDMyOTEsImV4cCI6MjA5NTY3OTI5MX0.0PDR-L_DzJkj-N2w_jL9V-WcqQW5r5pzN-VqJ0M7jMY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreImages() {
  console.log('📥 Restaurando imágenes de Supabase...\n');

  try {
    // Listar todos los archivos en el bucket product-images
    const { data: files, error } = await supabase.storage
      .from('product-images')
      .list('', { limit: 1000 });

    if (error) throw error;

    console.log(`✓ Encontrados ${files.length} archivos en Supabase Storage`);

    // Mapear imágenes por SKU
    const imageMap = {};
    files.forEach(file => {
      const sku = file.name.split('.')[0];
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${file.name}`;
      imageMap[sku] = publicUrl;
    });

    // Actualizar productos
    const products = ['products.json', 'products-sanjulian.json', 'products-nodourquiza.json'];

    for (const file of products) {
      const path = `public/${file}`;
      if (!fs.existsSync(path)) continue;

      const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
      let updated = 0;

      data.forEach(product => {
        if (imageMap[product.sku]) {
          product.image_url = imageMap[product.sku];
          updated++;
        }
      });

      fs.writeFileSync(path, JSON.stringify(data, null, 2));
      console.log(`✓ ${file}: ${updated} imágenes actualizadas`);
    }

    console.log('\n✅ Imágenes restauradas exitosamente');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

restoreImages();
