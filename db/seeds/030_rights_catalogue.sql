INSERT INTO public.rights (code, module_id, action, label, sort_order)
SELECT seed.code, module.id, seed.action, seed.label, seed.sort_order
FROM (VALUES
    ('CUSTOMER_ADD', 'CUSTOMER', 'ADD', 'Add Customer', 1),
    ('CUSTOMER_EDIT', 'CUSTOMER', 'EDIT', 'Edit Customer', 2),
    ('CUSTOMER_DELETE', 'CUSTOMER', 'DELETE', 'Delete Customer', 3),
    ('PRODUCT_ADD', 'PRODUCT', 'ADD', 'Add Product', 1),
    ('PRODUCT_EDIT', 'PRODUCT', 'EDIT', 'Edit Product', 2),
    ('PRODUCT_DELETE', 'PRODUCT', 'DELETE', 'Delete Product', 3),
    ('PRICE_ADD', 'PRODUCT', 'ADD_PRICE', 'Add Price', 4),
    ('PRICE_EDIT', 'PRODUCT', 'EDIT_PRICE', 'Edit Price', 5),
    ('PRICE_DELETE', 'PRODUCT', 'DELETE_PRICE', 'Delete Price', 6),
    ('JOB_ADD', 'HR', 'ADD_JOB', 'Add Job', 1),
    ('JOB_EDIT', 'HR', 'EDIT_JOB', 'Edit Job', 2),
    ('JOB_DELETE', 'HR', 'DELETE_JOB', 'Delete Job', 3),
    ('DEPARTMENT_ADD', 'HR', 'ADD_DEPARTMENT', 'Add Department', 4),
    ('DEPARTMENT_EDIT', 'HR', 'EDIT_DEPARTMENT', 'Edit Department', 5),
    ('DEPARTMENT_DELETE', 'HR', 'DELETE_DEPARTMENT', 'Delete Department', 6),
    ('EMPLOYEE_ADD', 'HR', 'ADD_EMPLOYEE', 'Add Employee', 7),
    ('EMPLOYEE_EDIT', 'HR', 'EDIT_EMPLOYEE', 'Edit Employee', 8),
    ('EMPLOYEE_DELETE', 'HR', 'DELETE_EMPLOYEE', 'Delete Employee', 9),
    ('JOBHISTORY_VIEW', 'HR', 'VIEW_JOB_HISTORY', 'View Job History', 10),
    ('JOBHISTORY_ADD', 'HR', 'ADD_JOB_HISTORY', 'Add Job History', 11),
    ('JOBHISTORY_EDIT', 'HR', 'EDIT_JOB_HISTORY', 'Edit Job History', 12),
    ('JOBHISTORY_DELETE', 'HR', 'DELETE_JOB_HISTORY', 'Delete Job History', 13),
    ('SALES_ADD', 'SALES', 'ADD_SALE', 'Add Sale', 1),
    ('SALES_EDIT', 'SALES', 'EDIT_SALE', 'Edit Sale', 2),
    ('SALES_DELETE', 'SALES', 'DELETE_SALE', 'Delete Sale', 3),
    ('SALESDETAIL_VIEW', 'SALES', 'VIEW_SALE_DETAIL', 'View Sale Details', 4),
    ('SALESDETAIL_ADD', 'SALES', 'ADD_SALE_DETAIL', 'Add Sale Detail', 5),
    ('SALESDETAIL_EDIT', 'SALES', 'EDIT_SALE_DETAIL', 'Edit Sale Detail', 6),
    ('SALESDETAIL_DELETE', 'SALES', 'DELETE_SALE_DETAIL', 'Delete Sale Detail', 7),
    ('REPORT_TOP_CUSTOMERS', 'REPORTS', 'TOP_CUSTOMERS', 'Top Customers', 1),
    ('REPORT_PRODUCT_MASTER_LIST', 'REPORTS', 'PRODUCT_MASTER_LIST', 'Product Master List', 2),
    ('REPORT_TOP_PRODUCTS', 'REPORTS', 'TOP_PRODUCTS', 'Top Products', 3),
    ('REPORT_ACTIVE_EMPLOYEES', 'REPORTS', 'ACTIVE_EMPLOYEES', 'Active Employees', 4),
    ('REPORT_ALL_EMPLOYEES', 'REPORTS', 'ALL_EMPLOYEES', 'All Employees', 5),
    ('REPORT_EMPLOYEE_JOB_HISTORY', 'REPORTS', 'EMPLOYEE_JOB_HISTORY', 'Employee Job History', 6),
    ('REPORT_TOP_SALES', 'REPORTS', 'TOP_SALES', 'Top Sales', 7)
) AS seed(code, module_code, action, label, sort_order)
JOIN public.module module ON module.code = seed.module_code
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
    mismatch TEXT;
BEGIN
    IF (SELECT COUNT(*) FROM public.role) <> 3
        OR (SELECT COUNT(*) FROM public.module) <> 5
        OR (SELECT COUNT(*) FROM public.rights) <> 36 THEN
        RAISE EXCEPTION 'Seed catalogue must contain exactly 3 roles, 5 modules, and 36 rights';
    END IF;

    SELECT string_agg(module_code || '=' || rights_count, ', ')
    INTO mismatch
    FROM public.v_rights_count_by_module
    WHERE (module_code, rights_count) NOT IN (
        ('CUSTOMER', 3), ('PRODUCT', 6), ('HR', 13), ('SALES', 7), ('REPORTS', 7)
    );
    IF mismatch IS NOT NULL THEN
        RAISE EXCEPTION 'Rights per module do not match the guide: %', mismatch;
    END IF;
END;
$$;
