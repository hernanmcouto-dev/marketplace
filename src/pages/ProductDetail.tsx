import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { ShoppingCart, Truck, Shield, ChevronLeft, Loader2, Plus, Minus, Store } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useState } from "react";
import type { ShopifyProduct } from "@/types/shopify";
import { supabase } from "@/integrations/supabase/client";
import { extractBulkInfo } from "@/utils/productPricing";

const SHOPIFY_API_VERSION = '2025-07';
const SHOPIFY_STORE_PERMANENT_DOMAIN = 'bright-hola-app-5s8xv.myshopify.com';
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_STOREFRONT_TOKEN = 'de805d114a98bd63976cb2007e3a2a55';

const PRODUCT_BY_HANDLE_QUERY = `
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      handle
      vendor
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 5) {
        edges {
          node {
            url
            altText
          }
        }
      }
      variants(first: 10) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            availableForSale
            selectedOptions {
              name
              value
            }
            sku
          }
        }
      }
      options {
        name
        values
      }
    }
  }
`;

async function storefrontApiRequest(query: string, variables: any = {}) {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new Error(`Error: ${data.errors.map((e: any) => e.message).join(', ')}`);
  }

  return data;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ProductDetail = () => {
  const { handle } = useParams();
  const addItem = useCartStore(state => state.addItem);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const isDbId = !!handle && UUID_RE.test(handle);

  const { data, isLoading } = useQuery({
    queryKey: ['product', handle],
    queryFn: async () => {
      // Productos de la base (DB) — handle = uuid
      if (isDbId) {
        const { data: p, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', handle!)
          .maybeSingle();
        if (error) throw error;
        if (!p) return null;

        let supplierName = p.supplier_code || '';
        if (p.supplier_id) {
          const { data: sup } = await (supabase as any)
            .from('suppliers_public')
            .select('name, code')
            .eq('id', p.supplier_id)
            .maybeSingle();
          if (sup?.name) supplierName = sup.name;
        }

        const isBulk = p.sale_type === 'bulto';
        const price = isBulk && p.bulk_price != null ? Number(p.bulk_price) : Number(p.unit_price);
        const unitsPerPackage = p.units_per_package && p.units_per_package > 1 ? Number(p.units_per_package) : 1;
        const priceStr = (isFinite(price) ? price : 0).toFixed(2);

        return {
          id: p.id,
          title: p.name,
          description: p.description || '',
          handle: p.id,
          vendor: supplierName,
          saleType: p.sale_type,
          unitsPerPackage,
          priceRange: { minVariantPrice: { amount: priceStr, currencyCode: 'USD' } },
          images: {
            edges: p.image_url
              ? [{ node: { url: p.image_url, altText: p.name } }]
              : [],
          },
          variants: {
            edges: [{
              node: {
                id: p.id,
                title: 'Default',
                price: { amount: priceStr, currencyCode: 'USD' },
                availableForSale: p.is_active && (p.stock == null || p.stock > 0),
                selectedOptions: [],
                sku: p.sku,
              },
            }],
          },
          options: [],
        };
      }

      // Fallback: producto de Shopify por handle
      const result = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
      return result.data.product;
    },
  });

  // Obtener configuración del proveedor basado en el vendor
  const { data: supplierConfig } = useQuery({
    queryKey: ['supplier-config', data?.vendor],
    queryFn: async () => {
      if (!data?.vendor) return null;
      
      const { data: supplier, error } = await (supabase as any)
        .from('suppliers_public')
        .select('name, code, sale_type')
        .or(`name.eq.${data.vendor},code.eq.${data.vendor}`)
        .maybeSingle() as { data: any; error: any };

      if (error) {
        console.error('Error fetching supplier:', error);
        return null;
      }

      return supplier;
    },
    enabled: !!data?.vendor,
  });

  // Obtener producto del proveedor con unidades por bulto usando SKU o product ID
  const { data: supplierProduct } = useQuery({
    queryKey: ['supplier-product', data?.variants?.edges?.[0]?.node?.sku, data?.id],
    queryFn: async () => {
      const sku = data?.variants?.edges?.[0]?.node?.sku;
      const productId = data?.id?.split('/').pop();
      
      if (!sku && !productId) return null;

      // Intentar buscar por SKU primero
      if (sku) {
        const { data: product, error } = await (supabase as any)
          .from('supplier_products_public')
          .select('units_per_package')
          .eq('product_sku', sku)
          .maybeSingle();

        if (!error && product) {
          return product;
        }
      }

      // Si no encuentra por SKU, buscar por product ID
      if (productId) {
        const { data: product, error } = await (supabase as any)
          .from('supplier_products_public')
          .select('units_per_package')
          .eq('shopify_product_id', productId)
          .maybeSingle();

        if (!error && product) {
          return product;
        }
      }

      return null;
    },
    enabled: !!(data?.variants?.edges?.[0]?.node?.sku || data?.id),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Producto no encontrado</p>
        </div>
      </div>
    );
  }

  const product: ShopifyProduct = { node: data };
  const defaultVariant = data.variants.edges[0]?.node;
  const price = parseFloat(data.priceRange.minVariantPrice.amount);
  const images = data.images.edges;
  
  // Información de bulto basada en el vendor
  const isBulkSale = supplierConfig?.sale_type === 'bulto' || data.saleType === 'bulto';

  // Preferir units_per_package de la base; si no sirve, usar el título
  const mappedUnits = data.unitsPerPackage && data.unitsPerPackage > 1 ? data.unitsPerPackage : undefined;
  const dbUnits = supplierProduct?.units_per_package && supplierProduct.units_per_package > 1
    ? supplierProduct.units_per_package
    : undefined;
  const titleBulkInfo = extractBulkInfo(data.title);
  const unitsPerPackage = mappedUnits ?? dbUnits ?? (titleBulkInfo.isBulk ? titleBulkInfo.units : 1);

  const unitPrice = isBulkSale ? price / unitsPerPackage : price;

  const handleAddToCart = () => {
    if (!defaultVariant) return;

    const vendorName = supplierConfig?.name || data.vendor;

    const cartItem = {
      product,
      variantId: defaultVariant.id,
      variantTitle: defaultVariant.title,
      variantSku: defaultVariant.sku || defaultVariant.id,
      price: defaultVariant.price,
      quantity: quantity,
      selectedOptions: defaultVariant.selectedOptions || [],
      vendor: vendorName
    };
    
    addItem(cartItem);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-lg font-semibold text-primary hover:text-primary/80 mb-6 bg-primary/10 hover:bg-primary/20 px-6 py-3 rounded-lg transition-all shadow-sm hover:shadow-md">
          <ChevronLeft className="h-7 w-7" />
          Volver a la tienda
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg overflow-hidden border">
              <img
                src={images[selectedImage]?.node.url || '/placeholder.svg'}
                alt={data.title}
                className="w-full h-full object-cover"
              />
            </div>
            
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((img: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded overflow-hidden border-2 ${
                      selectedImage === idx ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={img.node.url}
                      alt={`${data.title} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-normal text-foreground mb-4">{data.title}</h1>
              
              <div className="space-y-3">
                {isBulkSale ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-medium text-muted-foreground">USD</span>
                      <span className="text-3xl font-light text-foreground">
                        {Math.floor(unitPrice)}
                      </span>
                      <span className="text-xl font-light text-foreground/80">
                        .{(unitPrice % 1).toFixed(2).substring(2)}
                      </span>
                      <span className="text-base text-muted-foreground font-medium">
                        c/u
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground px-4 py-2">
                      Se cobra por bulto · {unitsPerPackage} unidades · USD {Math.floor(price)}.{(price % 1).toFixed(2).substring(2)} / bulto
                    </div>
                  </>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-medium text-muted-foreground">USD</span>
                    <span className="text-3xl font-light text-foreground">
                      {Math.floor(price)}
                    </span>
                    <span className="text-xl font-light text-foreground/80">
                      .{(price % 1).toFixed(2).substring(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg">
                <span className="font-medium text-foreground">Cantidad:</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleAddToCart}
                className="w-full bg-marketplace-blue hover:bg-marketplace-blue/90 text-white text-base h-12"
                size="lg"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Agregar al carrito
              </Button>

              <Link to="/" className="block">
                <Button
                  className="w-full text-base h-12 bg-success hover:bg-success/90 text-white"
                  size="lg"
                >
                  <Store className="h-5 w-5 mr-2" />
                  Seguir comprando
                </Button>
              </Link>
            </div>

            {data.description && (
              <div className="pt-6 border-t">
                <h2 className="text-lg font-medium mb-3">Descripción</h2>
                <p className="text-muted-foreground whitespace-pre-line">
                  {data.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
