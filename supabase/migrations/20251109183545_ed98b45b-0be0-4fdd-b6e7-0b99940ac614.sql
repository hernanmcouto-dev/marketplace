-- Agregar columna para unidades por bulto en supplier_products
ALTER TABLE supplier_products 
ADD COLUMN units_per_package integer DEFAULT 1;

COMMENT ON COLUMN supplier_products.units_per_package IS 'Cantidad de unidades que vienen en el bulto/paquete. 1 para venta unitaria.';