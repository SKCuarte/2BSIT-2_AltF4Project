INSERT INTO public.module (code, name, sort_order)
VALUES
    ('CUSTOMER', 'Customer', 1),
    ('PRODUCT', 'Product', 2),
    ('HR', 'Human Resources', 3),
    ('SALES', 'Sales', 4),
    ('REPORTS', 'Reports', 5)
ON CONFLICT (code) DO NOTHING;
