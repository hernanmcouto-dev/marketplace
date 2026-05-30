
DROP POLICY IF EXISTS "Public can view suppliers via view" ON public.suppliers;

CREATE POLICY "Authenticated can view suppliers"
ON public.suppliers FOR SELECT TO authenticated
USING (true);

REVOKE SELECT ON public.suppliers FROM anon;
