-- Insert default minimum purchase amount configuration
INSERT INTO site_config (key, value, description)
VALUES ('minimum_purchase_amount', '150', 'Monto mínimo de compra en USD')
ON CONFLICT (key) DO NOTHING;