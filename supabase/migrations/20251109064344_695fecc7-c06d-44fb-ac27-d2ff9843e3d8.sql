-- Tabla para rastrear imágenes de productos
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  uploaded_to_shopify BOOLEAN DEFAULT false,
  shopify_product_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view product images"
ON public.product_images FOR SELECT
USING (true);

CREATE POLICY "Anyone can create product images"
ON public.product_images FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update product images"
ON public.product_images FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete product images"
ON public.product_images FOR DELETE
USING (true);

-- Índices
CREATE INDEX idx_product_images_sku ON public.product_images(sku);
CREATE INDEX idx_product_images_supplier ON public.product_images(supplier_id);
CREATE INDEX idx_product_images_shopify ON public.product_images(shopify_product_id);
