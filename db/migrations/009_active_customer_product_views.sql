DO $$
BEGIN
    IF to_regrole('anon') IS NULL
        OR to_regrole('authenticated') IS NULL
        OR to_regrole('service_role') IS NULL THEN
        RAISE EXCEPTION 'Supabase anon, authenticated, and service_role roles are required';
    END IF;
END;
$$;

CREATE OR REPLACE VIEW public.active_customers
WITH (security_invoker = true) AS
SELECT
    customer_id,
    customer_name,
    customer_address,
    terms,
    status,
    stamp
FROM public."CUSTOMER"
WHERE status = 'Active';

COMMENT ON VIEW public.active_customers IS 'Customer records that are active and not soft-deleted.';

CREATE OR REPLACE VIEW public.active_products
WITH (security_invoker = true) AS
SELECT
    product_id,
    product_name,
    unit,
    status,
    stamp
FROM public."PRODUCT"
WHERE status = 'Active';

COMMENT ON VIEW public.active_products IS 'Product records that are active and not soft-deleted.';

CREATE INDEX IF NOT EXISTS idx_customer_id ON public."CUSTOMER"(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_name ON public."CUSTOMER"(customer_name);
CREATE INDEX IF NOT EXISTS idx_product_code ON public."PRODUCT"(product_id);
CREATE INDEX IF NOT EXISTS idx_product_name ON public."PRODUCT"(product_name);

REVOKE ALL ON TABLE public.active_customers FROM PUBLIC;
REVOKE ALL ON TABLE public.active_products FROM PUBLIC;
GRANT SELECT ON TABLE public.active_customers TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.active_products TO anon, authenticated, service_role;
