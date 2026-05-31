## Resultado final

App 100% independiente de Shopify. Vos gestionás productos desde el panel admin, los clientes arman carrito, confirman orden, ven datos bancarios y transfieren. Vos confirmás cada orden a mano desde `/admin/orders`.

## Fase 1 — Base de datos

Crear tabla `products` (catálogo propio):
- nombre, descripción, SKU, código de proveedor
- precio unitario y precio por bulto
- `units_per_package`, `sale_type` (`unitario` / `bulto`)
- `supplier_id` (FK a `suppliers` existente)
- `image_url` (apunta al bucket `product-images` actual)
- `stock` (opcional, nullable = sin control de stock)
- `is_active`, `tags[]`, `created_at`, `updated_at`

Políticas RLS: lectura pública, escritura solo admin.

Agregar a `site_config` la clave `bank_details` (texto libre con CBU/alias/titular/CUIT que el cliente verá al confirmar la compra). La editás desde `/admin/site-config`.

Agregar a `orders` el campo `payment_proof_url` (nullable, para que el cliente suba el comprobante opcionalmente) y ampliar los estados: `pending_transfer` → `paid` → `shipped` → `completed` (o `cancelled`).

## Fase 2 — Catálogo propio

Reemplazar todas las queries a la Storefront API de Shopify (`storefrontApiRequest`) por queries a la tabla `products`. Archivos afectados:
- `src/pages/Index.tsx`
- `src/pages/OfertasDelDia.tsx`
- `src/pages/ProductDetail.tsx`
- `src/components/FeaturedCarousel.tsx`, `LatestArrivalsCarousel.tsx`, `ProductCard.tsx`, `ProductCardWithSupplier.tsx`, `ProductFilters.tsx`

Crear un hook `useProducts()` central que centralice las consultas (filtros, búsqueda con fallback, joins con `suppliers` para color/mínimo).

Mantener intactas las reglas existentes: precios "USD" con decimal chico, vendor mostrado como color (no nombre), lógica de bultos, fallback de búsqueda por código.

## Fase 3 — Admin de productos

Nueva página `/admin/products`:
- Lista con búsqueda y filtros por proveedor
- Crear / editar / eliminar producto
- Subir imagen (al bucket `product-images` existente)
- Marcar activo/inactivo

Importación masiva opcional desde CSV (reutilizando la lógica de `ImportProducts.tsx`).

## Fase 4 — Carrito sin Shopify

Reescribir `src/stores/cartStore.ts`:
- Sacar todo el código de `cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`, `checkoutUrl`, `cartId`
- Estado puramente local (Zustand + localStorage)
- `CartItem` apunta a `products.id` en vez de `variantId` de Shopify
- Mantener validaciones de mínimos globales y por proveedor

Actualizar `CartDrawer.tsx` para que el botón de checkout navegue a `/checkout` interno en vez de abrir URL de Shopify.

## Fase 5 — Checkout y orden

Refactor `src/pages/Checkout.tsx`:
1. Cliente revisa items, total, datos de envío (ya cargados en su perfil)
2. Al confirmar: insert en `orders` con `status='pending_transfer'`
3. Redirect a `/orden/<id>/pago`

Nueva página `/orden/:id/pago`:
- Muestra resumen + número de orden
- Muestra `bank_details` desde `site_config`
- Botón "Ya transferí" → opcional: subir comprobante al bucket
- Mensaje: "Te avisaremos por email cuando confirmemos el pago"

En `/admin/orders` agregar acción "Marcar como pagada" que cambia `status` a `paid` y dispara email de confirmación al cliente (edge function nueva, simple).

## Fase 6 — Limpieza Shopify

Borrar:
- 9 edge functions: `create-products-from-list`, `create-shopify-product`, `delete-all-shopify-products`, `delete-products-without-images`, `delete-shopify-products-without-images`, `delete-supplier-products`, `reassociate-product-images`, `sync-shopify-to-db`, `test-shopify-access`, `sync-product-skus`, `update-dch-vendors`, `update-ibek-units`
- Páginas admin obsoletas: `DeleteDchProducts`, `DeleteIbekProducts`, `DeleteUnassociatedProducts`, `DeleteUnsyncedProducts`
- Secrets: `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_STOREFRONT_ACCESS_TOKEN`, `SHOPIFY_STORE_PERMANENT_DOMAIN`
- Tipos: `src/types/shopify.ts`
- Archivo `SHOPIFY_TOKEN_ISSUE.md`

Mantenemos:
- `suppliers`, `supplier_products` (lo seguís usando para costos/markup)
- `product_images` (sigue siendo útil, vinculada por SKU)
- Auth, perfiles, sellers, site_config, orders

## Orden de ejecución sugerido

Lo hago en 3 entregas para que puedas probar entre medio:

**Entrega 1 (esta tarea):** Fases 1 + 3 + 6 (BD nueva, admin de productos, limpieza Shopify). Te queda la home rota temporalmente.

**Entrega 2:** Fase 2 (reconectar todas las pantallas al nuevo catálogo).

**Entrega 3:** Fases 4 + 5 (carrito y checkout propios + email de confirmación).

## Lo que necesito de vos antes de arrancar

1. Confirmás el plan
2. Me decís los **datos bancarios** para cargarlos en `site_config` (o los dejo vacíos y los completás vos después desde el panel)

Una vez confirmes, arranco con la Entrega 1.
