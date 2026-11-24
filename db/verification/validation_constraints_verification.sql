-- Run after all migrations. Invalid customer and product values must be rejected.

DO $$
DECLARE
    rejected BOOLEAN;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'CUSTOMER'
          AND column_name = 'terms'
          AND is_nullable = 'NO'
    ) THEN
        RAISE EXCEPTION 'CUSTOMER.terms is not NOT NULL';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'PRODUCT'
          AND column_name = 'unit'
          AND is_nullable = 'NO'
    ) THEN
        RAISE EXCEPTION 'PRODUCT.unit is not NOT NULL';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'customer_terms_allowed'
          AND conrelid = 'public."CUSTOMER"'::REGCLASS
    ) THEN
        RAISE EXCEPTION 'customer_terms_allowed constraint is missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'product_unit_allowed'
          AND conrelid = 'public."PRODUCT"'::REGCLASS
    ) THEN
        RAISE EXCEPTION 'product_unit_allowed constraint is missing';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO public."CUSTOMER" (customer_id, customer_name, terms, status, stamp)
        VALUES ('C-INVALID', 'Invalid Terms Test', 'Invalid', 'Active', 'VERIFICATION');
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Invalid CUSTOMER.terms unexpectedly succeeded';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO public."CUSTOMER" (customer_id, customer_name, terms, status, stamp)
        VALUES ('C-INVALID', 'Empty Terms Test', '', 'Active', 'VERIFICATION');
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Empty CUSTOMER.terms unexpectedly succeeded';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO public."CUSTOMER" (customer_id, customer_name, status, stamp)
        VALUES ('C-INVALID', 'Null Terms Test', 'Active', 'VERIFICATION');
    EXCEPTION WHEN not_null_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'NULL CUSTOMER.terms unexpectedly succeeded';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO public."PRODUCT" (product_id, product_name, unit, status, stamp)
        VALUES ('P-INVALID', 'Invalid Unit Test', 'box', 'Active', 'VERIFICATION');
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Invalid PRODUCT.unit unexpectedly succeeded';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO public."PRODUCT" (product_id, product_name, unit, status, stamp)
        VALUES ('P-INVALID', 'Empty Unit Test', '', 'Active', 'VERIFICATION');
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Empty PRODUCT.unit unexpectedly succeeded';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO public."PRODUCT" (product_id, product_name, status, stamp)
        VALUES ('P-INVALID', 'Null Unit Test', 'Active', 'VERIFICATION');
    EXCEPTION WHEN not_null_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'NULL PRODUCT.unit unexpectedly succeeded';
    END IF;

    DELETE FROM public."CUSTOMER" WHERE customer_id = 'C-INVALID';
    DELETE FROM public."PRODUCT" WHERE product_id = 'P-INVALID';
END;
$$;
