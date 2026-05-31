-- Add missing product_name column to supplier_products table
ALTER TABLE supplier_products 
ADD COLUMN product_name TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_supplier_products_name ON supplier_products(product_name);