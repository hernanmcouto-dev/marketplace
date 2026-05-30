
CREATE OR REPLACE VIEW public.suppliers_public AS
SELECT id, code, name, color, sale_type, minimum_purchase_amount
FROM public.suppliers;

GRANT SELECT ON public.suppliers_public TO anon, authenticated;
