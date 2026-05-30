-- Add default address field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN address TEXT;

-- Add comment to the column
COMMENT ON COLUMN public.profiles.address IS 'Dirección predeterminada del usuario para envíos';