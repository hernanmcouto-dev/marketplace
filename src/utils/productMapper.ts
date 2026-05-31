import type { ShopifyProduct } from "@/types/shopify";

export interface DbProduct {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  supplier_code: string | null;
  supplier_id: string | null;
  unit_price: number | string;
  bulk_price: number | string | null;
  units_per_package: number | null;
  sale_type: string;
  image_url: string | null;
  stock: number | null;
  is_active: boolean;
  tags: string[] | null;
  suppliers?: { name: string; code: string; color?: string | null; sale_type?: string } | null;
}

/**
 * Maps a row of the `products` table into the legacy ShopifyProduct
 * shape so existing cards/carousels keep working without changes.
 */
export function mapDbProductToShopify(p: DbProduct): ShopifyProduct {
  const vendorName = p.suppliers?.name || p.supplier_code || "";
  const isBulk = p.sale_type === "bulto";
  const price = isBulk && p.bulk_price != null
    ? Number(p.bulk_price)
    : Number(p.unit_price);
  const priceStr = (isFinite(price) ? price : 0).toFixed(2);
  const imageUrl = p.image_url || "";
  const handle = p.id; // use id as handle for routing

  return {
    node: {
      id: p.id,
      title: p.name,
      description: p.description || "",
      handle,
      productType: undefined,
      vendor: vendorName,
      saleType: p.sale_type,
      unitsPerPackage: p.units_per_package && p.units_per_package > 1 ? p.units_per_package : 1,
      priceRange: {
        minVariantPrice: { amount: priceStr, currencyCode: "USD" },
      },
      images: {
        edges: imageUrl
          ? [{ node: { url: imageUrl, altText: p.name } }]
          : [],
      },
      variants: {
        edges: [
          {
            node: {
              id: p.id,
              title: "Default",
              price: { amount: priceStr, currencyCode: "USD" },
              availableForSale: p.is_active && (p.stock == null || p.stock > 0),
              selectedOptions: [],
              sku: p.sku,
            },
          },
        ],
      },
      options: [],
    },
  };
}
