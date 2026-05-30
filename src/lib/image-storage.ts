export async function downloadAndStoreImage(
  imageUrl: string,
  sku: string,
  supplierId: string
): Promise<{ url: string; path: string } | null> {
  try {
    console.log(`[image-storage] Guardando imagen para ${sku}`);
    return { url: imageUrl || "", path: sku };
  } catch (err) {
    console.error(`[image-storage] Error: ${err}`);
    return null;
  }
}

export async function getExistingImage(sku: string): Promise<string | null> {
  return null;
}

export async function getExistingProduct(sku: string) {
  return null;
}
