-- Run after migrations and `npm run db:seed` has run twice.
-- Validates stable demo fixtures and their multi-date price histories.

DO $$
BEGIN
    IF (
        SELECT COUNT(*)
        FROM public."CUSTOMER"
        WHERE customer_id IN ('C-006', 'C-007', 'C-008', 'C-009', 'C-010')
    ) <> 5 THEN
        RAISE EXCEPTION 'Expected 5 demo customers';
    END IF;

    IF (
        SELECT COUNT(DISTINCT terms)
        FROM public."CUSTOMER"
        WHERE customer_id IN ('C-006', 'C-007', 'C-008', 'C-009', 'C-010')
    ) <> 5 THEN
        RAISE EXCEPTION 'Demo customers must cover all 5 payment terms';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (VALUES
            ('C-006', 'Northwind Supply Co', 'Net 30'),
            ('C-007', 'Blue Yonder Logistics', 'Net 45'),
            ('C-008', 'Wayne Industrial', 'COD'),
            ('C-009', 'Hooli Manufacturing', 'Prepaid'),
            ('C-010', 'Pied Piper Components', 'Net 15')
        ) AS expected(customer_id, customer_name, terms)
        LEFT JOIN public."CUSTOMER" customer USING (customer_id)
        WHERE customer.customer_id IS NULL
           OR customer.customer_name IS DISTINCT FROM expected.customer_name
           OR customer.terms IS DISTINCT FROM expected.terms
           OR customer.status IS DISTINCT FROM 'Active'
    ) THEN
        RAISE EXCEPTION 'Demo customer records do not match expected fixtures';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM public."PRODUCT"
        WHERE product_id IN ('P-006', 'P-007', 'P-008', 'P-009', 'P-010')
    ) <> 5 THEN
        RAISE EXCEPTION 'Expected 5 demo products';
    END IF;

    IF (
        SELECT COUNT(DISTINCT unit)
        FROM public."PRODUCT"
        WHERE product_id IN ('P-006', 'P-007', 'P-008', 'P-009', 'P-010')
    ) <> 5 THEN
        RAISE EXCEPTION 'Demo products must use 5 different units';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (VALUES
            ('P-006', 'Hex Bolt M8', 'pc'),
            ('P-007', 'Precision Valve', 'ea'),
            ('P-008', 'Copper Tubing 12mm', 'mtr'),
            ('P-009', 'Electrical Cable Kit', 'pkg'),
            ('P-010', 'Hydraulic Fluid 1L', 'ltr')
        ) AS expected(product_id, product_name, unit)
        LEFT JOIN public."PRODUCT" product USING (product_id)
        WHERE product.product_id IS NULL
           OR product.product_name IS DISTINCT FROM expected.product_name
           OR product.unit IS DISTINCT FROM expected.unit
           OR product.status IS DISTINCT FROM 'Active'
    ) THEN
        RAISE EXCEPTION 'Demo product records do not match expected fixtures';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM public."PRICEHIST"
        WHERE product_id IN ('P-006', 'P-007', 'P-008', 'P-009', 'P-010')
    ) <> 15 THEN
        RAISE EXCEPTION 'Expected exactly 15 demo price-history records after repeated seeding';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (VALUES
            ('P-006', DATE '2026-01-01', 2.50::NUMERIC),
            ('P-006', DATE '2026-06-01', 2.75::NUMERIC),
            ('P-006', DATE '2026-10-01', 3.00::NUMERIC),
            ('P-007', DATE '2026-01-01', 18.00::NUMERIC),
            ('P-007', DATE '2026-06-01', 19.50::NUMERIC),
            ('P-007', DATE '2026-10-01', 21.00::NUMERIC),
            ('P-008', DATE '2026-01-01', 6.25::NUMERIC),
            ('P-008', DATE '2026-06-01', 6.75::NUMERIC),
            ('P-008', DATE '2026-10-01', 7.25::NUMERIC),
            ('P-009', DATE '2026-01-01', 125.00::NUMERIC),
            ('P-009', DATE '2026-06-01', 130.00::NUMERIC),
            ('P-009', DATE '2026-10-01', 135.00::NUMERIC),
            ('P-010', DATE '2026-01-01', 42.00::NUMERIC),
            ('P-010', DATE '2026-06-01', 44.00::NUMERIC),
            ('P-010', DATE '2026-10-01', 46.00::NUMERIC)
        ) AS expected(product_id, effective_date, unit_price)
        LEFT JOIN public."PRICEHIST" price
          USING (product_id, effective_date)
        WHERE price.product_id IS NULL
           OR price.unit_price IS DISTINCT FROM expected.unit_price
           OR price.status IS DISTINCT FROM 'Active'
    ) THEN
        RAISE EXCEPTION 'Demo price-history records do not match expected fixtures';
    END IF;
END;
$$;

SELECT 'demo_customers' AS check_name, 5 AS expected_count,
       COUNT(*) AS actual_count, COUNT(*) = 5 AS passed
FROM public."CUSTOMER"
WHERE customer_id IN ('C-006', 'C-007', 'C-008', 'C-009', 'C-010')
UNION ALL
SELECT 'demo_products', 5, COUNT(*), COUNT(*) = 5
FROM public."PRODUCT"
WHERE product_id IN ('P-006', 'P-007', 'P-008', 'P-009', 'P-010')
UNION ALL
SELECT 'demo_price_history', 15, COUNT(*), COUNT(*) = 15
FROM public."PRICEHIST"
WHERE product_id IN ('P-006', 'P-007', 'P-008', 'P-009', 'P-010')
ORDER BY check_name;
