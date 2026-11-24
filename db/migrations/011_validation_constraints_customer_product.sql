DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public."CUSTOMER"
        WHERE terms IS NULL
           OR btrim(terms) = ''
           OR terms NOT IN ('Net 30', 'Net 45', 'COD', 'Prepaid', 'Net 15')
    ) THEN
        RAISE EXCEPTION 'Cannot add validation constraints: CUSTOMER contains invalid or empty terms';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public."PRODUCT"
        WHERE unit IS NULL
           OR btrim(unit) = ''
           OR unit NOT IN ('pc', 'ea', 'mtr', 'pkg', 'ltr', 'pcs', 'pair', 'can', 'meter')
    ) THEN
        RAISE EXCEPTION 'Cannot add validation constraints: PRODUCT contains invalid or empty unit';
    END IF;
END;
$$;

ALTER TABLE public."CUSTOMER"
    ALTER COLUMN terms SET NOT NULL,
    ADD CONSTRAINT customer_terms_allowed
        CHECK (btrim(terms) <> '' AND terms IN ('Net 30', 'Net 45', 'COD', 'Prepaid', 'Net 15'));

ALTER TABLE public."PRODUCT"
    ALTER COLUMN unit SET NOT NULL,
    ADD CONSTRAINT product_unit_allowed
        CHECK (btrim(unit) <> '' AND unit IN ('pc', 'ea', 'mtr', 'pkg', 'ltr', 'pcs', 'pair', 'can', 'meter'));

COMMENT ON CONSTRAINT customer_terms_allowed ON public."CUSTOMER"
IS 'Payment terms must be one of Net 30, Net 45, COD, Prepaid, or Net 15.';
COMMENT ON CONSTRAINT product_unit_allowed ON public."PRODUCT"
IS 'Unit must be one of pc, ea, mtr, pkg, ltr, pcs, pair, can, meter.';
