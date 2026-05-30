-- Tabla products: catálogo propio independiente de Shopify
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT NOT NULL UNIQUE,
  supplier_code TEXT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  bulk_price NUMERIC(12,2),
  units_per_package INTEGER DEFAULT 1,
  sale_type TEXT NOT NULL DEFAULT 'unitario',
  image_url TEXT,
  stock INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Permitir que admins escriban desde frontend
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;

CREATE INDEX idx_products_supplier ON public.products(supplier_id);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_active ON public.products(is_active);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ampliar orders: agregar comprobante de transferencia
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS order_number SERIAL;

-- Cargar config bancaria por defecto (vacía, el admin la completa)
INSERT INTO public.site_config (key, value, description)
VALUES ('bank_details', '', 'Datos bancarios mostrados al cliente para pagar por transferencia (Banco, CBU, Alias, Titular, CUIT)')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_config (key, value, description)
VALUES ('payment_instructions', 'Una vez realizada la transferencia, te enviaremos la confirmación por email dentro de las 24hs hábiles.', 'Mensaje que ve el cliente luego de generar la orden')
ON CONFLICT (key) DO NOTHING;