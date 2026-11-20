-- Run after all migrations. Fixtures are rolled back only if this script uses a
-- transaction; the view/index checks themselves are read-only.

SELECT COUNT(*) AS active_customer_count,
       COUNT(*) FILTER (WHERE status = 'Inactive') AS inactive_customer_count
FROM public.active_customers;

SELECT COUNT(*) AS active_product_count,
       COUNT(*) FILTER (WHERE status = 'Inactive') AS inactive_product_count
FROM public.active_products;

DO $$
DECLARE
    customer_count BIGINT;
    product_count BIGINT;
BEGIN
    IF to_regclass('public.active_customers') IS NULL THEN
        RAISE EXCEPTION 'public.active_customers view is missing';
    END IF;
    IF to_regclass('public.active_products') IS NULL THEN
        RAISE EXCEPTION 'public.active_products view is missing';
    END IF;

    SELECT COUNT(*) INTO customer_count
    FROM public.active_customers;
    IF customer_count <> 4 THEN
        RAISE EXCEPTION 'active_customers: expected 4 active rows, got %', customer_count;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.active_customers WHERE status <> 'Active'
    ) THEN
        RAISE EXCEPTION 'active_customers contains a non-active row';
    END IF;

    SELECT COUNT(*) INTO product_count
    FROM public.active_products;
    IF product_count <> 4 THEN
        RAISE EXCEPTION 'active_products: expected 4 active rows, got %', product_count;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.active_products WHERE status <> 'Active'
    ) THEN
        RAISE EXCEPTION 'active_products contains a non-active row';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'CUSTOMER'
          AND indexname = 'idx_customer_name'
    ) THEN
        RAISE EXCEPTION 'idx_customer_name is missing';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'CUSTOMER'
          AND indexname = 'idx_customer_id'
    ) THEN
        RAISE EXCEPTION 'idx_customer_id is missing';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'PRODUCT'
          AND indexname = 'idx_product_name'
    ) THEN
        RAISE EXCEPTION 'idx_product_name is missing';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'PRODUCT'
          AND indexname = 'idx_product_code'
    ) THEN
        RAISE EXCEPTION 'idx_product_code is missing';
    END IF;
END;
$$;
