import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardWithSupplier } from "@/components/ProductCardWithSupplier";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";
import { LatestArrivalsCarousel } from "@/components/LatestArrivalsCarousel";
import { ProductFilters, FilterState } from "@/components/ProductFilters";
import { Loader2, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShopifyProduct } from "@/types/shopify";
import { useSearchParams } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDbProducts } from "@/hooks/useDbProducts";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [filters, setFilters] = useState<FilterState>({
    category: "all",
    minPrice: 0,
    maxPrice: 10000,
    sortBy: "relevance",
  });

  // Most-sold product titles (for default ordering)
  const { data: mostSoldProducts } = useQuery({
    queryKey: ["most-sold-products"],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("order_items");
      if (error) return [];
      const counts: Record<string, number> = {};
      orders.forEach((o: any) => {
        const items = o.order_items || [];
        const seen = new Set<string>();
        items.forEach((it: any) => {
          if (it.productTitle) seen.add(it.productTitle);
        });
        seen.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
      });
      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .map(([t]) => t);
    },
  });

  const { data: rawData, isLoading } = useDbProducts({
    search: searchQuery,
    limit: 250,
  });

  // Default ordering by most-sold when no search
  const data = useMemo(() => {
    if (!rawData) return [];
    if (searchQuery || !mostSoldProducts?.length) return rawData;
    return [...rawData].sort((a, b) => {
      const ai = mostSoldProducts.indexOf(a.node.title);
      const bi = mostSoldProducts.indexOf(b.node.title);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [rawData, mostSoldProducts, searchQuery]);

  // Suppliers config (color, sale_type, mins)
  const { data: suppliersConfig } = useQuery({
    queryKey: ["suppliers-config"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("suppliers_public")
        .select("code, name, sale_type, color, minimum_purchase_amount");
      if (error) return [] as any[];
      return (data || []) as any[];
    },
  });

  // Featured products: products tagged "destacados"
  const { data: featuredProducts, isLoading: isFeaturedLoading } = useDbProducts({
    tag: "destacados",
    limit: 12,
  });

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    let filtered = [...data];
    if (filters.category !== "all") {
      filtered = filtered.filter(
        (p: ShopifyProduct) =>
          p.node.productType === filters.category ||
          p.node.vendor === filters.category
      );
    }
    filtered = filtered.filter((p: ShopifyProduct) => {
      const price = parseFloat(p.node.priceRange.minVariantPrice.amount);
      return price >= filters.minPrice && price <= filters.maxPrice;
    });
    switch (filters.sortBy) {
      case "price-asc":
        filtered.sort(
          (a, b) =>
            parseFloat(a.node.priceRange.minVariantPrice.amount) -
            parseFloat(b.node.priceRange.minVariantPrice.amount)
        );
        break;
      case "price-desc":
        filtered.sort(
          (a, b) =>
            parseFloat(b.node.priceRange.minVariantPrice.amount) -
            parseFloat(a.node.priceRange.minVariantPrice.amount)
        );
        break;
      case "name-asc":
        filtered.sort((a, b) => a.node.title.localeCompare(b.node.title));
        break;
      case "name-desc":
        filtered.sort((a, b) => b.node.title.localeCompare(a.node.title));
        break;
    }
    return filtered;
  }, [data, filters]);

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-marketplace-blue to-accent py-3 mb-8">
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 animate-fade-in">
            ¡Bienvenido a PlanetaOnce!
          </h1>
          <Link to="/auth">
            <Button
              size="lg"
              className="font-semibold text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all bg-green-400 hover:bg-green-500 text-white"
            >
              Registrarse Ahora
            </Button>
          </Link>
        </div>
      </div>

      {!isFeaturedLoading && featuredProducts && featuredProducts.length > 0 && (
        <div className="mb-12">
          <FeaturedCarousel products={featuredProducts} />
        </div>
      )}

      <LatestArrivalsCarousel />

      <div className="container mx-auto px-4 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {searchQuery ? `Resultados para "${searchQuery}"` : "Más Vendidos"}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {searchQuery
              ? `Mostrando ${filteredProducts.length} producto${filteredProducts.length !== 1 ? "s" : ""}`
              : "Los productos más populares seleccionados especialmente para ti"}
          </p>
        </div>

        <div className="mb-6 max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por SKU (ej: DCH, IBEK, LUZ-48C10)..."
              value={searchQuery}
              onChange={(e) => setSearchParams({ q: e.target.value })}
              className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary"
            />
          </div>
        </div>

        {data && data.length > 0 && (
          <ProductFilters products={data} onFilterChange={handleFilterChange} />
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center bg-muted/30 rounded-2xl border-2 border-dashed border-border">
            <Package className="h-20 w-20 text-muted-foreground mb-6" />
            <h3 className="text-2xl font-bold text-foreground mb-3">
              No hay productos disponibles
            </h3>
            <p className="text-muted-foreground max-w-md text-lg">
              Carga productos desde el panel de administración para verlos aquí.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center bg-muted/30 rounded-2xl border-2 border-dashed border-border">
            <Package className="h-20 w-20 text-muted-foreground mb-6" />
            <h3 className="text-2xl font-bold text-foreground mb-3">
              No se encontraron productos
            </h3>
            <p className="text-muted-foreground max-w-md text-lg">
              No hay productos que coincidan con "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-5 gap-6">
            {(searchQuery ? filteredProducts : filteredProducts.slice(0, 8)).map(
              (product: ShopifyProduct, index: number) => {
                const vendor = product.node.vendor || "";
                const supplierConfig = suppliersConfig?.find(
                  (s: any) =>
                    s.name.toLowerCase() === vendor.toLowerCase() ||
                    s.code.toLowerCase() === vendor.toLowerCase()
                );
                const isBulkSale = supplierConfig?.sale_type === "bulto";
                const isBestSeller = !searchQuery && index < 10;
                const unitsPerPackage = product.node.unitsPerPackage ?? 1;
                const hasMinimum =
                  supplierConfig?.minimum_purchase_amount &&
                  supplierConfig.minimum_purchase_amount > 0;

                return isBulkSale ? (
                  <ProductCardWithSupplier
                    key={product.node.id}
                    product={product}
                    supplierInfo={supplierConfig}
                    unitsPerPackage={unitsPerPackage}
                    isBestSeller={isBestSeller}
                  />
                ) : (
                  <ProductCard
                    key={product.node.id}
                    product={product}
                    isBestSeller={isBestSeller}
                    supplierColor={supplierConfig?.color}
                    hasMinimum={hasMinimum}
                  />
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
