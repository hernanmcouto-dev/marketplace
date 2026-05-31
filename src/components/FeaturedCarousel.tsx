import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import type { ShopifyProduct } from "@/types/shopify";
import { useCartStore } from "@/stores/cartStore";

interface FeaturedCarouselProps {
  products: ShopifyProduct[];
}

export const FeaturedCarousel = ({ products }: FeaturedCarouselProps) => {
  const addItem = useCartStore(state => state.addItem);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" },
    [Autoplay({ delay: 5000, stopOnInteraction: false })]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [emblaApi, products]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  if (!products || products.length === 0) return null;

  const handleAddToCart = (e: React.MouseEvent, product: ShopifyProduct) => {
    e.preventDefault();
    e.stopPropagation();
    
    const defaultVariant = product.node.variants.edges[0]?.node;
    if (!defaultVariant) return;

    const cartItem = {
      product,
      variantId: defaultVariant.id,
      variantTitle: defaultVariant.title,
      variantSku: defaultVariant.sku || defaultVariant.id,
      price: defaultVariant.price,
      quantity: 1,
      selectedOptions: defaultVariant.selectedOptions || []
    };
    
    addItem(cartItem);
  };

  return (
    <div className="relative bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Productos Destacados</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={scrollPrev}
              className="h-10 w-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollNext}
              className="h-10 w-10"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="overflow-hidden -mx-4" ref={emblaRef}>
          <div className="flex">
            {products.slice(0, 8).map((product) => {
              const { node } = product;
              const price = parseFloat(node.priceRange.minVariantPrice.amount);
              const image = node.images.edges[0]?.node?.url;

              return (
                <div key={node.id} className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] xl:flex-[0_0_25%] pl-4">
                  <Link to={`/producto/${node.handle}`}>
                    <Card className="group h-full overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border-border/50">
                      <div className="relative aspect-square bg-muted overflow-hidden max-h-40">
                        {image ? (
                          <img
                            src={image}
                            alt={node.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-secondary/20">
                            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            className="bg-marketplace-blue hover:bg-marketplace-blue/90 text-white shadow-lg h-7 w-7"
                            onClick={(e) => handleAddToCart(e, product)}
                          >
                            <ShoppingCart className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="absolute top-1 left-1 bg-marketplace-yellow text-foreground px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg">
                          DESTACADO
                        </div>
                      </div>
                      
                      <div className="p-2 space-y-1">
                        <h3 className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                          {node.title}
                        </h3>
                        
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-normal text-foreground">
                            $ {Math.floor(price)}
                          </span>
                          {price % 1 !== 0 && (
                            <span className="text-sm font-normal text-foreground">
                              {(price % 1).toFixed(2).substring(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dot Indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {products.slice(0, 8).map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`transition-all duration-300 rounded-full ${
                index === selectedIndex
                  ? 'w-8 h-2 bg-primary'
                  : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Ir al producto ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
