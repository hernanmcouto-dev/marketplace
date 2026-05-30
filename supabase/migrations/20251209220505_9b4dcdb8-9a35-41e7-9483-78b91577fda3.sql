-- Add optional minimum purchase amount per supplier
ALTER TABLE public.suppliers 
ADD COLUMN minimum_purchase_amount numeric DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.suppliers.minimum_purchase_amount IS 'Monto mínimo de compra para este proveedor. NULL significa sin mínimo.';