-- Agregar política de UPDATE para supplier_products
-- Esto es necesario para que las funciones de shopifyOperations puedan actualizar productos

CREATE POLICY "Anyone can update supplier products"
ON supplier_products
FOR UPDATE
USING (true)
WITH CHECK (true);