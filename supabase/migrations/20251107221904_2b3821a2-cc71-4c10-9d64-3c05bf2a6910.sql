-- Create suppliers/providers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  discount_percentage NUMERIC NOT NULL DEFAULT 0,
  markup_percentage NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Anyone can view suppliers
CREATE POLICY "Anyone can view suppliers"
ON public.suppliers FOR SELECT
USING (true);

-- Anyone can create suppliers
CREATE POLICY "Anyone can create suppliers"
ON public.suppliers FOR INSERT
WITH CHECK (true);

-- Anyone can update suppliers
CREATE POLICY "Anyone can update suppliers"
ON public.suppliers FOR UPDATE
USING (true);

-- Anyone can delete suppliers
CREATE POLICY "Anyone can delete suppliers"
ON public.suppliers FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create supplier_products table to track which products came from which supplier
CREATE TABLE public.supplier_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  shopify_product_id TEXT NOT NULL,
  cost_price NUMERIC NOT NULL,
  sale_price NUMERIC NOT NULL,
  product_sku TEXT,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, shopify_product_id)
);

-- Enable RLS
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

-- Anyone can view supplier products
CREATE POLICY "Anyone can view supplier products"
ON public.supplier_products FOR SELECT
USING (true);

-- Anyone can create supplier products
CREATE POLICY "Anyone can create supplier products"
ON public.supplier_products FOR INSERT
WITH CHECK (true);

-- Anyone can delete supplier products
CREATE POLICY "Anyone can delete supplier products"
ON public.supplier_products FOR DELETE
USING (true);

-- Insert some example suppliers
INSERT INTO public.suppliers (name, code, discount_percentage, markup_percentage)
VALUES 
  ('Proveedor A', 'PA', 10, 30),
  ('Proveedor B', 'PB', 15, 25),
  ('Proveedor C', 'PC', 20, 35);
