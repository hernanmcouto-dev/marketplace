-- Add sale_type to suppliers table
CREATE TYPE public.sale_type AS ENUM ('unitario', 'bulto');

ALTER TABLE public.suppliers
ADD COLUMN sale_type public.sale_type NOT NULL DEFAULT 'unitario';

-- Update existing suppliers examples
UPDATE public.suppliers
SET sale_type = 'bulto'
WHERE code = 'PB';

-- Add comment for clarity
COMMENT ON COLUMN public.suppliers.sale_type IS 'Tipo de venta: unitario o bulto cerrado';