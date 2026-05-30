CREATE OR REPLACE FUNCTION public.apply_supplier_markup()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  factor numeric;
BEGIN
  IF NEW.supplier_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT (1 + COALESCE(markup_percentage,0)/100.0) * (1 - COALESCE(discount_percentage,0)/100.0)
    INTO factor
  FROM public.suppliers
  WHERE id = NEW.supplier_id;

  IF factor IS NULL OR factor = 1 THEN
    RETURN NEW;
  END IF;

  NEW.unit_price := ROUND(NEW.unit_price * factor, 2);
  IF NEW.bulk_price IS NOT NULL THEN
    NEW.bulk_price := ROUND(NEW.bulk_price * factor, 2);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_supplier_markup_on_insert ON public.products;
CREATE TRIGGER apply_supplier_markup_on_insert
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.apply_supplier_markup();