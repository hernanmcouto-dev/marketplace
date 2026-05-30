
-- ====== supplier_products ======
DROP POLICY IF EXISTS "Anyone can view supplier products" ON public.supplier_products;
DROP POLICY IF EXISTS "Anyone can create supplier products" ON public.supplier_products;
DROP POLICY IF EXISTS "Anyone can update supplier products" ON public.supplier_products;
DROP POLICY IF EXISTS "Anyone can delete supplier products" ON public.supplier_products;

CREATE POLICY "Admins can view supplier products"
ON public.supplier_products FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert supplier products"
ON public.supplier_products FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update supplier products"
ON public.supplier_products FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete supplier products"
ON public.supplier_products FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON public.supplier_products FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_products TO authenticated;
GRANT ALL ON public.supplier_products TO service_role;

-- Public view exposing only non-sensitive units info (no cost_price/sale_price)
CREATE OR REPLACE VIEW public.supplier_products_public
WITH (security_invoker = true) AS
SELECT id, product_sku, shopify_product_id, supplier_id, units_per_package, product_name
FROM public.supplier_products;

GRANT SELECT ON public.supplier_products_public TO anon, authenticated;

-- ====== pdf_page_presets ======
DROP POLICY IF EXISTS "Anyone can create presets" ON public.pdf_page_presets;
DROP POLICY IF EXISTS "Anyone can update presets" ON public.pdf_page_presets;
DROP POLICY IF EXISTS "Anyone can delete presets" ON public.pdf_page_presets;

CREATE POLICY "Admins can create presets"
ON public.pdf_page_presets FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update presets"
ON public.pdf_page_presets FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete presets"
ON public.pdf_page_presets FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ====== product_images ======
DROP POLICY IF EXISTS "Anyone can create product images" ON public.product_images;
DROP POLICY IF EXISTS "Anyone can update product images" ON public.product_images;
DROP POLICY IF EXISTS "Anyone can delete product images" ON public.product_images;

CREATE POLICY "Admins can create product images"
ON public.product_images FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product images"
ON public.product_images FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product images"
ON public.product_images FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ====== Storage: product-images bucket ======
-- Drop any overly permissive policies and recreate scoped ones
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname ILIKE '%product-images%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "product-images read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "product-images authenticated insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "product-images authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "product-images authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND auth.uid() = owner);

-- ====== Lock internal SECURITY DEFINER functions ======
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
