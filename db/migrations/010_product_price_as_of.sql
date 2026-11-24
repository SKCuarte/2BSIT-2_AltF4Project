CREATE OR REPLACE FUNCTION public.get_product_price_as_of(
    p_product_id VARCHAR,
    p_target_date DATE
)
RETURNS NUMERIC(10,2)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
    SELECT ph.unit_price
    FROM public."PRICEHIST" ph
    WHERE ph.product_id = p_product_id
      AND ph.status = 'Active'
      AND ph.effective_date <= p_target_date
    ORDER BY ph.effective_date DESC
    LIMIT 1
$$;

COMMENT ON FUNCTION public.get_product_price_as_of(VARCHAR, DATE)
IS 'Returns the latest active unit price effective on or before p_target_date, or NULL when no prior price exists.';

CREATE INDEX IF NOT EXISTS idx_pricehist_product_effective_active
    ON public."PRICEHIST"(product_id, effective_date DESC)
    WHERE status = 'Active';

REVOKE ALL ON FUNCTION public.get_product_price_as_of(VARCHAR, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_price_as_of(VARCHAR, DATE)
    TO anon, authenticated, service_role;
