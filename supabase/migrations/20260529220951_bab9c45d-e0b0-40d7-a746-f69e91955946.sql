
-- SUPPLIERS: tighten access
DROP POLICY IF EXISTS "Anyone can create suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Anyone can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Anyone can delete suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Anyone can view suppliers" ON public.suppliers;

CREATE POLICY "Authenticated can view suppliers"
ON public.suppliers FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can insert suppliers"
ON public.suppliers FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update suppliers"
ON public.suppliers FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete suppliers"
ON public.suppliers FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON public.suppliers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

-- SELLERS: remove public read
DROP POLICY IF EXISTS "Anyone can view sellers" ON public.sellers;

CREATE POLICY "Admins can view sellers"
ON public.sellers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can view own record"
ON public.sellers FOR SELECT TO authenticated
USING (email = (auth.jwt() ->> 'email'));

REVOKE ALL ON public.sellers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sellers TO authenticated;
GRANT ALL ON public.sellers TO service_role;
