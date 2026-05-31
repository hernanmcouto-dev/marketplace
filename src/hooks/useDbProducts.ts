import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapDbProductToShopify, type DbProduct } from "@/utils/productMapper";
import type { ShopifyProduct } from "@/types/shopify";

interface UseDbProductsOptions {
  search?: string;
  tag?: string;
  limit?: number;
  orderBy?: "created_desc" | "name_asc";
  enabled?: boolean;
}

export function useDbProducts(opts: UseDbProductsOptions = {}) {
  const { search = "", tag, limit = 250, orderBy = "name_asc", enabled = true } = opts;

  return useQuery({
    queryKey: ["db-products", { search, tag, limit, orderBy }],
    enabled,
    queryFn: async (): Promise<ShopifyProduct[]> => {
      let query = supabase
        .from("products")
        .select("*")
        .eq("is_active", true);

      const cleaned = search.trim();
      if (cleaned) {
        const upper = cleaned.toUpperCase();
        const isSupplierCode = /^[A-Z]{2,5}$/.test(upper);
        const isBulk = upper === "BULTO";

        if (isBulk) {
          query = query.eq("sale_type", "bulto");
        } else if (isSupplierCode) {
          const { data: sup } = await (supabase as any)
            .from("suppliers_public")
            .select("id")
            .eq("code", upper)
            .maybeSingle();
          if (sup?.id) {
            query = query.eq("supplier_id", sup.id);
          } else {
            query = query.or(
              `name.ilike.%${cleaned}%,sku.ilike.%${cleaned}%,supplier_code.ilike.%${cleaned}%`
            );
          }
        } else {
          query = query.or(
            `name.ilike.%${cleaned}%,sku.ilike.%${cleaned}%,supplier_code.ilike.%${cleaned}%,description.ilike.%${cleaned}%`
          );
        }
      }

      if (tag) {
        query = query.contains("tags", [tag]);
      }

      if (orderBy === "created_desc") {
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("name", { ascending: true });
      }

      query = query.limit(limit);

      const [{ data, error }, { data: suppliers }] = await Promise.all([
        query,
        (supabase as any)
          .from("suppliers_public")
          .select("id, name, code, color, sale_type"),
      ]);

      if (error) {
        console.error("Error fetching products:", error);
        return [];
      }

      const supplierMap = new Map<string, any>(
        (suppliers || []).map((s: any) => [s.id, s])
      );

      return (data as any[]).map((p) =>
        mapDbProductToShopify({
          ...p,
          suppliers: p.supplier_id ? supplierMap.get(p.supplier_id) : null,
        } as DbProduct)
      );
    },
  });
}
