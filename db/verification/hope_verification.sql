-- HOPE migration verification script.
-- Run after the sample-data migration. Expected totals and checks are documented
-- beside each result; every orphan count must be zero.

-- 1) Row counts. Expected counts match the guide's fixtures; PAYMENT is empty
--    because its screen and sample records are not included in the guide.
WITH expected(table_name, expected_count) AS (
  VALUES ('DEPARTMENT', 4), ('JOB', 4), ('EMPLOYEE', 4), ('JOBHISTORY', 2),
       ('CUSTOMER', 5), ('PRODUCT', 5), ('PRICEHIST', 4), ('SALES', 4),
       ('SALESDETAIL', 5), ('PAYMENT', 0)
), actual AS (
  SELECT 'DEPARTMENT' AS table_name, COUNT(*)::INTEGER AS row_count FROM public."DEPARTMENT"
  UNION ALL SELECT 'JOB', COUNT(*)::INTEGER FROM public."JOB"
  UNION ALL SELECT 'EMPLOYEE', COUNT(*)::INTEGER FROM public."EMPLOYEE"
  UNION ALL SELECT 'JOBHISTORY', COUNT(*)::INTEGER FROM public."JOBHISTORY"
  UNION ALL SELECT 'CUSTOMER', COUNT(*)::INTEGER FROM public."CUSTOMER"
  UNION ALL SELECT 'PRODUCT', COUNT(*)::INTEGER FROM public."PRODUCT"
  UNION ALL SELECT 'PRICEHIST', COUNT(*)::INTEGER FROM public."PRICEHIST"
  UNION ALL SELECT 'SALES', COUNT(*)::INTEGER FROM public."SALES"
  UNION ALL SELECT 'SALESDETAIL', COUNT(*)::INTEGER FROM public."SALESDETAIL"
  UNION ALL SELECT 'PAYMENT', COUNT(*)::INTEGER FROM public."PAYMENT"
)
SELECT e.table_name, e.expected_count, a.row_count AS actual_count,
     e.expected_count = a.row_count AS passed
FROM expected e JOIN actual a USING (table_name)
ORDER BY e.table_name;

-- 2) Sale totals. Expected: T-001 = 234.50, T-002 = 140.00,
--    T-003 = 510.00. Lines use the latest active price on or before sale date.
WITH sale_totals AS (
  SELECT s.sale_id,
       ROUND(COALESCE(SUM(sd.quantity * price.unit_price), 0), 2) AS total
  FROM public."SALES" s
  LEFT JOIN public."SALESDETAIL" sd
    ON sd.sale_id = s.sale_id AND sd.status = 'Active'
  LEFT JOIN LATERAL (
    SELECT ph.unit_price
    FROM public."PRICEHIST" ph
        WHERE ph.product_id = sd.product_id
      AND ph.effective_date <= s.sale_date
      AND ph.status = 'Active'
    ORDER BY ph.effective_date DESC
    LIMIT 1
  ) price ON TRUE
  GROUP BY s.sale_id
), expected(sale_id, expected_total) AS (
  VALUES ('T-001', 234.50::NUMERIC),
       ('T-002', 140.00::NUMERIC),
       ('T-003', 510.00::NUMERIC)
)
SELECT e.sale_id,
     e.expected_total,
     st.total AS actual_total,
     st.total = e.expected_total AS passed
FROM expected e
LEFT JOIN sale_totals st USING (sale_id)
ORDER BY e.sale_id;

-- 3) Active sales total. Expected: 884.50.
WITH line_totals AS (
  SELECT s.sale_id,
       s.status AS sale_status,
       sd.status AS line_status,
       sd.quantity * price.unit_price AS line_total
  FROM public."SALES" s
  JOIN public."SALESDETAIL" sd ON sd.sale_id = s.sale_id
  LEFT JOIN LATERAL (
    SELECT ph.unit_price
    FROM public."PRICEHIST" ph
    WHERE ph.product_id = sd.product_id
      AND ph.effective_date <= s.sale_date
      AND ph.status = 'Active'
    ORDER BY ph.effective_date DESC
    LIMIT 1
  ) price ON TRUE
)
SELECT 884.50::NUMERIC(10,2) AS expected_total,
     ROUND(COALESCE(SUM(line_total), 0), 2) AS actual_total,
     ROUND(COALESCE(SUM(line_total), 0), 2) = 884.50 AS passed
FROM line_totals
WHERE sale_status = 'Active' AND line_status = 'Active';

-- 4) Current active price of P-003. Expected: 28.00.
WITH current_price AS (
  SELECT ph.unit_price
  FROM public."PRICEHIST" ph
    WHERE ph.product_id = 'P-003'
      AND ph.status = 'Active'
      AND ph.effective_date <= CURRENT_DATE
  ORDER BY ph.effective_date DESC
  LIMIT 1
)
SELECT 28.00::NUMERIC(10,2) AS expected_price,
     (SELECT unit_price FROM current_price) AS actual_price,
     (SELECT unit_price FROM current_price) = 28.00 AS passed;

-- 5) P-004 has no current active price. Expected: has_current_price = false.
SELECT EXISTS (
  SELECT 1
  FROM public."PRICEHIST"
  WHERE product_id = 'P-004' AND status = 'Active' AND effective_date <= CURRENT_DATE
) AS has_current_price,
NOT EXISTS (
  SELECT 1
  FROM public."PRICEHIST"
  WHERE product_id = 'P-004' AND status = 'Active' AND effective_date <= CURRENT_DATE
) AS passed;

-- 6) Check for orphan foreign keys. Expected: every orphan_count = 0.
SELECT 'JOBHISTORY -> EMPLOYEE' AS check_name, COUNT(*) AS orphan_count
FROM public."JOBHISTORY" h
LEFT JOIN public."EMPLOYEE" e ON e.employee_id = h.employee_id
WHERE e.employee_id IS NULL
UNION ALL
SELECT 'JOBHISTORY -> JOB', COUNT(*)
FROM public."JOBHISTORY" h
LEFT JOIN public."JOB" j ON j.job_id = h.job_id
WHERE j.job_id IS NULL
UNION ALL
SELECT 'JOBHISTORY -> DEPARTMENT', COUNT(*)
FROM public."JOBHISTORY" h
LEFT JOIN public."DEPARTMENT" d ON d.department_id = h.department_id
WHERE h.department_id IS NOT NULL AND d.department_id IS NULL
UNION ALL
SELECT 'SALES -> CUSTOMER', COUNT(*)
FROM public."SALES" s
LEFT JOIN public."CUSTOMER" c ON c.customer_id = s.customer_id
WHERE s.customer_id IS NOT NULL AND c.customer_id IS NULL
UNION ALL
SELECT 'SALES -> EMPLOYEE', COUNT(*)
FROM public."SALES" s
LEFT JOIN public."EMPLOYEE" e ON e.employee_id = s.employee_id
WHERE s.employee_id IS NOT NULL AND e.employee_id IS NULL
UNION ALL
SELECT 'SALESDETAIL -> SALES', COUNT(*)
FROM public."SALESDETAIL" sd
LEFT JOIN public."SALES" s ON s.sale_id = sd.sale_id
WHERE s.sale_id IS NULL
UNION ALL
SELECT 'SALESDETAIL -> PRODUCT', COUNT(*)
FROM public."SALESDETAIL" sd
LEFT JOIN public."PRODUCT" p ON p.product_id = sd.product_id
WHERE p.product_id IS NULL
UNION ALL
SELECT 'PAYMENT -> SALES', COUNT(*)
FROM public."PAYMENT" p
LEFT JOIN public."SALES" s ON s.sale_id = p.sale_id
WHERE p.sale_id IS NOT NULL AND s.sale_id IS NULL
UNION ALL
SELECT 'PRICEHIST -> PRODUCT', COUNT(*)
FROM public."PRICEHIST" ph
LEFT JOIN public."PRODUCT" p ON p.product_id = ph.product_id
WHERE p.product_id IS NULL;

-- 7) Fail the script if any expected count or business rule is not met.
DO $$
DECLARE
  expected RECORD;
  actual_count BIGINT;
  actual_total NUMERIC(12,2);
  orphan RECORD;
BEGIN
  FOR expected IN
    SELECT * FROM (VALUES
      ('DEPARTMENT', 4), ('JOB', 4), ('EMPLOYEE', 4), ('JOBHISTORY', 2),
      ('CUSTOMER', 5), ('PRODUCT', 5), ('PRICEHIST', 4), ('SALES', 4),
      ('SALESDETAIL', 5), ('PAYMENT', 0)
    ) AS counts(table_name, expected_count)
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM public.%I', expected.table_name)
    INTO actual_count;
    IF actual_count <> expected.expected_count THEN
      RAISE EXCEPTION '% row count: expected %, got %',
        expected.table_name, expected.expected_count, actual_count;
    END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('T-001', 234.50::NUMERIC),
      ('T-002', 140.00::NUMERIC),
      ('T-003', 510.00::NUMERIC)
    ) AS totals(sale_id, expected_total)
  LOOP
    SELECT ROUND(COALESCE(SUM(sd.quantity * price.unit_price), 0), 2)
    INTO actual_total
    FROM public."SALES" s
    JOIN public."SALESDETAIL" sd
      ON sd.sale_id = s.sale_id AND sd.status = 'Active'
    LEFT JOIN LATERAL (
      SELECT ph.unit_price
      FROM public."PRICEHIST" ph
      WHERE ph.product_id = sd.product_id
        AND ph.effective_date <= s.sale_date
        AND ph.status = 'Active'
      ORDER BY ph.effective_date DESC
      LIMIT 1
    ) price ON TRUE
    WHERE s.sale_id = expected.sale_id AND s.status = 'Active';

    IF actual_total IS DISTINCT FROM expected.expected_total THEN
      RAISE EXCEPTION '% total: expected %, got %',
        expected.sale_id, expected.expected_total, actual_total;
    END IF;
  END LOOP;

  SELECT ROUND(COALESCE(SUM(sd.quantity * price.unit_price), 0), 2)
  INTO actual_total
  FROM public."SALES" s
  JOIN public."SALESDETAIL" sd
    ON sd.sale_id = s.sale_id AND sd.status = 'Active'
  LEFT JOIN LATERAL (
    SELECT ph.unit_price
    FROM public."PRICEHIST" ph
    WHERE ph.product_id = sd.product_id
      AND ph.effective_date <= s.sale_date
      AND ph.status = 'Active'
    ORDER BY ph.effective_date DESC
    LIMIT 1
  ) price ON TRUE
  WHERE s.status = 'Active';
  IF actual_total IS DISTINCT FROM 884.50::NUMERIC THEN
    RAISE EXCEPTION 'Active sales total: expected 884.50, got %', actual_total;
  END IF;

  SELECT ph.unit_price INTO actual_total
  FROM public."PRICEHIST" ph
  WHERE ph.product_id = 'P-003'
    AND ph.status = 'Active'
    AND ph.effective_date <= CURRENT_DATE
  ORDER BY ph.effective_date DESC
  LIMIT 1;
  IF actual_total IS DISTINCT FROM 28.00::NUMERIC THEN
    RAISE EXCEPTION 'P-003 current price: expected 28.00, got %', actual_total;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public."PRICEHIST"
    WHERE product_id = 'P-004'
      AND status = 'Active'
      AND effective_date <= CURRENT_DATE
  ) THEN
    RAISE EXCEPTION 'P-004 unexpectedly has a current active price';
  END IF;

  FOR orphan IN
    SELECT 'JOBHISTORY -> EMPLOYEE' AS check_name, COUNT(*) AS orphan_count
    FROM public."JOBHISTORY" h LEFT JOIN public."EMPLOYEE" e ON e.employee_id = h.employee_id
    WHERE e.employee_id IS NULL
    UNION ALL
    SELECT 'JOBHISTORY -> JOB', COUNT(*)
    FROM public."JOBHISTORY" h LEFT JOIN public."JOB" j ON j.job_id = h.job_id
    WHERE j.job_id IS NULL
    UNION ALL
    SELECT 'JOBHISTORY -> DEPARTMENT', COUNT(*)
    FROM public."JOBHISTORY" h LEFT JOIN public."DEPARTMENT" d ON d.department_id = h.department_id
    WHERE h.department_id IS NOT NULL AND d.department_id IS NULL
    UNION ALL
    SELECT 'SALES -> CUSTOMER', COUNT(*)
    FROM public."SALES" s LEFT JOIN public."CUSTOMER" c ON c.customer_id = s.customer_id
    WHERE s.customer_id IS NOT NULL AND c.customer_id IS NULL
    UNION ALL
    SELECT 'SALES -> EMPLOYEE', COUNT(*)
    FROM public."SALES" s LEFT JOIN public."EMPLOYEE" e ON e.employee_id = s.employee_id
    WHERE s.employee_id IS NOT NULL AND e.employee_id IS NULL
    UNION ALL
    SELECT 'SALESDETAIL -> SALES', COUNT(*)
    FROM public."SALESDETAIL" sd LEFT JOIN public."SALES" s ON s.sale_id = sd.sale_id
    WHERE s.sale_id IS NULL
    UNION ALL
    SELECT 'SALESDETAIL -> PRODUCT', COUNT(*)
    FROM public."SALESDETAIL" sd LEFT JOIN public."PRODUCT" p ON p.product_id = sd.product_id
    WHERE p.product_id IS NULL
    UNION ALL
    SELECT 'PAYMENT -> SALES', COUNT(*)
    FROM public."PAYMENT" p LEFT JOIN public."SALES" s ON s.sale_id = p.sale_id
    WHERE p.sale_id IS NOT NULL AND s.sale_id IS NULL
    UNION ALL
    SELECT 'PRICEHIST -> PRODUCT', COUNT(*)
    FROM public."PRICEHIST" ph LEFT JOIN public."PRODUCT" p ON p.product_id = ph.product_id
    WHERE p.product_id IS NULL
  LOOP
    IF orphan.orphan_count <> 0 THEN
      RAISE EXCEPTION '% has % orphan row(s)', orphan.check_name, orphan.orphan_count;
    END IF;
  END LOOP;
END;
$$;
