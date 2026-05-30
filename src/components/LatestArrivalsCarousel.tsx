import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Package, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import type { ShopifyProduct } from "@/types/shopify";
import { Badge } from "@/components/ui/badge";
import { extractBulkInfo, calculateUnitPrice } from "@/utils/productPricing";
import { useDbProducts } from "@/hooks/useDbProducts";

export const LatestArrivalsCarousel = () => {
  const { data: latestProducts, isLoading } = useDbProducts({
    limit: 12,
    orderBy: "created_desc",
  });

  if (isLoading || !latestProducts || latestProducts.length === 0) {
    return null;
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-semibold text-foreground">
          Últimos Ingresos
        </h2>
        <Badge variant="secondary" className="ml-auto">
          {latestProducts.length} productos nuevos
        </Badge>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 4000,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent>
          {latestProducts.map((item: ShopifyProduct, index: number) => {
            const product = item.node;
            const imageUrl = product.images?.edges?.[0]?.node?.url;
            const price = product.priceRange?.minVariantPrice?.amount;
            const currencyCode = product.priceRange?.minVariantPrice?.currencyCode;
            
            const bulkInfo = extractBulkInfo(product.title);
            const totalPrice = parseFloat(price || '0');
            const isBulkSale = product.saleType === 'bulto' || bulkInfo.isBulk;
            const effectiveUnits = product.unitsPerPackage && product.unitsPerPackage > 1 ? product.unitsPerPackage : bulkInfo.units;
            const unitPrice = calculateUnitPrice(totalPrice, effectiveUnits);

            return (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <Link to={`/producto/${product.handle}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer">
                    <div className="relative aspect-square overflow-hidden bg-muted max-h-40">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-1 right-1">
                        <Badge className="bg-green-500 hover:bg-green-600 text-white text-[10px] px-1.5 py-0.5">
                          NUEVO
                        </Badge>
                      </div>
                      {isBulkSale && (
                        <div className="absolute bottom-1 left-1">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                            <Package className="h-2 w-2 mr-0.5" />
                            Bulto x{effectiveUnits}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-2">
                      <h3 className="font-semibold text-xs mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {product.title}
                      </h3>
                      {isBulkSale ? (
                        <>
                          <p className="text-base font-bold text-primary">
                            {currencyCode} {unitPrice.toFixed(2)} c/u
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Bulto x {effectiveUnits} u. · {currencyCode} {totalPrice.toFixed(2)}
                          </p>
                        </>
                      ) : (
                        <p className="text-base font-bold text-primary">
                          {currencyCode} {parseFloat(price || '0').toFixed(2)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="left-0 -translate-x-1/2" />
        <CarouselNext className="right-0 translate-x-1/2" />
      </Carousel>
    </div>
  );
};
