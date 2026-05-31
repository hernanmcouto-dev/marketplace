-- Create table for site configuration
CREATE TABLE public.site_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read config
CREATE POLICY "Anyone can view site config"
ON public.site_config
FOR SELECT
USING (true);

-- Only admins can update config
CREATE POLICY "Admins can update site config"
ON public.site_config
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert config
CREATE POLICY "Admins can insert site config"
ON public.site_config
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default minimum purchase amount
INSERT INTO public.site_config (key, value, description)
VALUES ('minimum_purchase_usd', '150', 'Monto mínimo de compra en USD');

-- Create trigger for updated_at
CREATE TRIGGER update_site_config_updated_at
BEFORE UPDATE ON public.site_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();