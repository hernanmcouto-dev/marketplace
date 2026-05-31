-- Create sellers table
CREATE TABLE public.sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read sellers (needed to validate referral codes)
CREATE POLICY "Anyone can view sellers"
ON public.sellers
FOR SELECT
USING (true);

-- Add seller_id to orders table
ALTER TABLE public.orders
ADD COLUMN seller_id UUID REFERENCES public.sellers(id);

-- Create trigger for sellers updated_at
CREATE TRIGGER update_sellers_updated_at
BEFORE UPDATE ON public.sellers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample sellers
INSERT INTO public.sellers (code, name, email, phone) VALUES
  ('VENDEDOR1', 'Vendedor 1', 'vendedor1@example.com', '1234567890'),
  ('VENDEDOR2', 'Vendedor 2', 'vendedor2@example.com', '0987654321'),
  ('VENDEDOR3', 'Vendedor 3', 'vendedor3@example.com', '1122334455');