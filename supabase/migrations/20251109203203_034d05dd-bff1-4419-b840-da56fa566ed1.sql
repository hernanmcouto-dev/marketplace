-- Update handle_new_user function to include address field
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, provincia, localidad, address, cuit_dni, telefono, transporte_preferido, valor_declarado)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'provincia',
    new.raw_user_meta_data->>'localidad',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'cuit_dni',
    new.raw_user_meta_data->>'telefono',
    new.raw_user_meta_data->>'transporte_preferido',
    new.raw_user_meta_data->>'valor_declarado'
  );
  RETURN new;
END;
$$;