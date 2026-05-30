export async function downloadAndStoreImage(
  imageUrl: string,
  sku: string,
  supplierId: string
): Promise<{ url: string; path: string } | null> {
  console.log(`[image-storage] Usando imagen original para ${sku}`);
  return { url: imageUrl, path: sku };
}

export async function getExistingImage(sku: string): Promise<string | null> {
  return null;
}

export async function getExistingProduct(sku: string) {
  return null;
}
