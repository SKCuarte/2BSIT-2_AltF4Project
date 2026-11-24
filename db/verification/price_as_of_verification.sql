-- Run after all migrations. Verifies historical, exact-date, and no-prior-price results.

DO $$
DECLARE
    resolved_price NUMERIC(10,2);
BEGIN
    resolved_price := public.get_product_price_as_of('P-003', '2026-01-31');
    IF resolved_price IS NOT NULL THEN
        RAISE EXCEPTION 'P-003 before first effective date: expected NULL, got %', resolved_price;
    END IF;

    resolved_price := public.get_product_price_as_of('P-003', '2026-02-01');
    IF resolved_price IS DISTINCT FROM 28.00::NUMERIC(10,2) THEN
        RAISE EXCEPTION 'P-003 on effective date: expected 28.00, got %', resolved_price;
    END IF;

    resolved_price := public.get_product_price_as_of('P-003', '2026-12-31');
    IF resolved_price IS DISTINCT FROM 28.00::NUMERIC(10,2) THEN
        RAISE EXCEPTION 'P-003 at later date: expected 28.00, got %', resolved_price;
    END IF;

    resolved_price := public.get_product_price_as_of('P-004', '2026-12-31');
    IF resolved_price IS NOT NULL THEN
        RAISE EXCEPTION 'P-004 inactive product: expected NULL, got %', resolved_price;
    END IF;

    resolved_price := public.get_product_price_as_of('UNKNOWN', '2026-12-31');
    IF resolved_price IS NOT NULL THEN
        RAISE EXCEPTION 'Unknown product: expected NULL, got %', resolved_price;
    END IF;
END;
$$;

-- Verify that a newer history row supersedes an older row.
DO $$
DECLARE
    resolved_price NUMERIC(10,2);
BEGIN
    INSERT INTO public."PRICEHIST" (product_id, effective_date, unit_price, status, stamp)
    VALUES
        ('P-003', '2026-10-01', 30.00, 'Active', 'VERIFICATION test 2026-10-01'),
        ('P-003', '2026-11-01', 32.00, 'Active', 'VERIFICATION test 2026-11-01')
    ON CONFLICT (product_id, effective_date) DO NOTHING;

    resolved_price := public.get_product_price_as_of('P-003', '2026-09-30');
    IF resolved_price IS DISTINCT FROM 28.00::NUMERIC(10,2) THEN
        RAISE EXCEPTION 'P-003 before history rows: expected 28.00, got %', resolved_price;
    END IF;

    resolved_price := public.get_product_price_as_of('P-003', '2026-10-15');
    IF resolved_price IS DISTINCT FROM 30.00::NUMERIC(10,2) THEN
        RAISE EXCEPTION 'P-003 October price: expected 30.00, got %', resolved_price;
    END IF;

    resolved_price := public.get_product_price_as_of('P-003', '2026-11-01');
    IF resolved_price IS DISTINCT FROM 32.00::NUMERIC(10,2) THEN
        RAISE EXCEPTION 'P-003 exact latest date: expected 32.00, got %', resolved_price;
    END IF;

    DELETE FROM public."PRICEHIST"
    WHERE product_id = 'P-003'
      AND effective_date IN ('2026-10-01', '2026-11-01')
      AND stamp LIKE 'VERIFICATION test %';
END;
$$;

SELECT public.get_product_price_as_of('P-003', '2026-02-01') AS p003_price_on_effective_date,
       public.get_product_price_as_of('P-003', '2026-01-31') AS p003_price_before_effective_date,
       public.get_product_price_as_of('P-004', '2026-12-31') AS p004_price,
       public.get_product_price_as_of('UNKNOWN', '2026-12-31') AS unknown_product_price;
