import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Truck, Package, Flame } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import type { ShopifyProduct } from "@/types/shopify";

interface SupplierInfo {
  name: string;
  code: string;
  sale_type: 'bulto' | 'unitario';
  color?: string;
  minimum_purchase_amount?: number;
}

interface ProductCardWithSupplierProps {
  product: ShopifyProduct;
  supplierInfo?: SupplierInfo;
  unitsPerPackage?: number;
  isBestSeller?: boolean;
}

export const ProductCardWithSupplier = ({ product, supplierInfo, unitsPerPackage = 1, isBestSeller = false }: ProductCardWithSupplierProps) => {
  const addItem = useCartStore(state => state.addItem);
  const { node } = product;

  const bulkPrice = parseFloat(node.priceRange.minVariantPrice.amount);
  const currency = node.priceRange.minVariantPrice.currencyCode;
  const image = node.images.edges[0]?.node?.url;
  const defaultVariant = node.variants.edges[0]?.node;

  const isBulkSale = supplierInfo?.sale_type === 'bulto' || node.saleType === 'bulto';
  const mappedUnits = node.unitsPerPackage && node.unitsPerPackage > 1 ? node.unitsPerPackage : 1;
  const effectiveUnits = unitsPerPackage > 1 ? unitsPerPackage : mappedUnits;
  const unitPrice = isBulkSale ? bulkPrice / effectiveUnits : bulkPrice;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!defaultVariant) return;

    const cartItem = {
      product,
      variantId: defaultVariant.id,
      variantTitle: defaultVariant.title,
      variantSku: defaultVariant.sku || defaultVariant.id,
      price: defaultVariant.price,
      quantity: 1,
      selectedOptions: defaultVariant.selectedOptions || [],
      vendor: supplierInfo?.name // Agregar el nombre del proveedor al carrito
    };
    
    addItem(cartItem);
  };

  const supplierColor = supplierInfo?.color;
  const hasMinimum = supplierInfo?.minimum_purchase_amount && supplierInfo.minimum_purchase_amount > 0;

  return (
    <Link to={`/producto/${node.handle}`}>
      <Card className={`group h-full overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer bg-card ${isBulkSale ? 'border-2 border-primary/40 shadow-lg shadow-primary/10' : 'border-border/50'}`}>
        <div className="relative aspect-square overflow-hidden">
          {/* Color indicator for suppliers with minimum purchase */}
          {supplierColor && hasMinimum && (
            <div 
              className="absolute inset-0 opacity-20 z-0"
              style={{ backgroundColor: supplierColor }}
            />
          )}
          {image ? (
            <img
              src={image}
              alt={node.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 relative z-10"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/50 relative z-10">
              <ShoppingCart className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
          
          {isBestSeller && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold shadow-lg animate-pulse">
                <Flame className="h-3 w-3 mr-1" />
                Más Vendido
              </Badge>
            </div>
          )}

          {isBulkSale && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-primary/90 text-primary-foreground text-xs font-semibold">
                <Package className="h-3 w-3 mr-1" />
                Venta por bulto
              </Badge>
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className={`absolute ${isBestSeller ? 'bottom-3' : 'top-3'} right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0`}>
            <Button
              size="icon"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl rounded-full h-12 w-12"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="p-5 space-y-3 bg-card">
          <h3 className="text-base font-semibold text-foreground line-clamp-2 min-h-[3rem] group-hover:text-primary transition-colors duration-300">
            {node.title}
          </h3>
          
          <div className="space-y-2">
            {isBulkSale ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-medium text-muted-foreground">USD</span>
                  <span className="text-2xl font-bold text-foreground">
                    {Math.floor(unitPrice)}
                  </span>
                  <span className="text-base font-semibold text-foreground/80">
                    .{(unitPrice % 1).toFixed(2).substring(2)}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    c/u
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Bulto x {effectiveUnits} u. · USD {Math.floor(bulkPrice)}.{(bulkPrice % 1).toFixed(2).substring(2)}
                </div>
              </>
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-medium text-muted-foreground">USD</span>
                <span className="text-2xl font-bold text-foreground">
                  {Math.floor(bulkPrice)}
                </span>
                <span className="text-base font-semibold text-foreground/80">
                  .{(bulkPrice % 1).toFixed(2).substring(2)}
                </span>
              </div>
            )}

            {supplierInfo && (
              <div className="pt-1">
                <Badge variant="secondary" className="text-xs">
                  {supplierInfo.code}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
};
