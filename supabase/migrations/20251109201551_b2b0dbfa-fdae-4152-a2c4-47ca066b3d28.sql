-- Add user_id column to orders table
ALTER TABLE public.orders 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_orders_user_id ON public.orders(user_id);

-- Drop the overly permissive "Anyone can view orders" policy
DROP POLICY IF EXISTS "Anyone can view orders by email" ON public.orders;

-- Create new policy: Users can view their own orders
CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Keep admin policy for viewing all orders
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));