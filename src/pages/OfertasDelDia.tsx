import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { Loader2, Percent, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ShopifyProduct } from "@/types/shopify";
import { useDbProducts } from "@/hooks/useDbProducts";

const OfertasDelDia = () => {
  const { data, isLoading } = useDbProducts({ tag: "ofertas del dia", limit: 50 });

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Percent className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-4xl font-bold text-foreground">Ofertas del Día</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Clock className="h-4 w-4" />
              Válido hasta las 23:59 de hoy
            </p>
          </div>
          <Badge className="ml-auto text-lg px-4 py-2" variant="destructive">
            Hasta 50% OFF
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            No hay ofertas activas en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.map((product: ShopifyProduct) => (
              <ProductCard key={product.node.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfertasDelDia;
