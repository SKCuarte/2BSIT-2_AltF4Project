-- Run after all migrations. Verifies that hard deletes respect existing child records.

DO $$
DECLARE
    blocked BOOLEAN;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public."SALES"'::REGCLASS
          AND contype = 'f'
          AND confrelid = 'public."CUSTOMER"'::REGCLASS
          AND confdeltype IN ('r', 'a')
    ) THEN
        RAISE EXCEPTION 'SALES -> CUSTOMER must use RESTRICT or NO ACTION';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public."SALESDETAIL"'::REGCLASS
          AND contype = 'f'
          AND confrelid = 'public."PRODUCT"'::REGCLASS
          AND confdeltype IN ('r', 'a')
    ) THEN
        RAISE EXCEPTION 'SALESDETAIL -> PRODUCT must use RESTRICT or NO ACTION';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public."PRICEHIST"'::REGCLASS
          AND contype = 'f'
          AND confrelid = 'public."PRODUCT"'::REGCLASS
          AND confdeltype IN ('r', 'a')
    ) THEN
        RAISE EXCEPTION 'PRICEHIST -> PRODUCT must use RESTRICT or NO ACTION';
    END IF;

    blocked := FALSE;
    BEGIN
        DELETE FROM public."CUSTOMER" WHERE customer_id = 'C-001';
    EXCEPTION WHEN foreign_key_violation THEN
        blocked := TRUE;
    END;
    IF NOT blocked THEN
        RAISE EXCEPTION 'Customer C-001 with sales unexpectedly deleted';
    END IF;

    blocked := FALSE;
    BEGIN
        DELETE FROM public."PRODUCT" WHERE product_id = 'P-001';
    EXCEPTION WHEN foreign_key_violation THEN
        blocked := TRUE;
    END;
    IF NOT blocked THEN
        RAISE EXCEPTION 'Product P-001 with sales-detail or price-history rows unexpectedly deleted';
    END IF;

    INSERT INTO public."CUSTOMER" (
        customer_id, customer_name, terms, status, stamp
    )
    VALUES (
        'C-VERIFY-NODELETE', 'No-Child Delete Verification',
        'COD', 'Inactive', 'VERIFICATION'
    )
    ON CONFLICT (customer_id) DO NOTHING;

    DELETE FROM public."CUSTOMER" WHERE customer_id = 'C-VERIFY-NODELETE';
    IF EXISTS (
        SELECT 1 FROM public."CUSTOMER" WHERE customer_id = 'C-VERIFY-NODELETE'
    ) THEN
        RAISE EXCEPTION 'Customer with no child records was not deleted';
    END IF;

    INSERT INTO public."PRODUCT" (
        product_id, product_name, unit, status, stamp
    )
    VALUES (
        'P-VERIFY-NODELETE', 'No-Child Delete Verification',
        'pcs', 'Inactive', 'VERIFICATION'
    )
    ON CONFLICT (product_id) DO NOTHING;

    DELETE FROM public."PRODUCT" WHERE product_id = 'P-VERIFY-NODELETE';
    IF EXISTS (
        SELECT 1 FROM public."PRODUCT" WHERE product_id = 'P-VERIFY-NODELETE'
    ) THEN
        RAISE EXCEPTION 'Product with no child records was not deleted';
    END IF;
END;
$$;
