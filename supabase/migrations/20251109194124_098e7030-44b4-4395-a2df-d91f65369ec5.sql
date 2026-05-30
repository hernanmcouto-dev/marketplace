-- Enable sellers to update their own orders
CREATE POLICY "Sellers can update their own orders"
ON public.orders
FOR UPDATE
USING (seller_id IN (SELECT id FROM public.sellers WHERE email = auth.jwt()->>'email'))
WITH CHECK (seller_id IN (SELECT id FROM public.sellers WHERE email = auth.jwt()->>'email'));

-- Enable admins to update all orders
CREATE POLICY "Admins can update all orders"
ON public.orders
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));