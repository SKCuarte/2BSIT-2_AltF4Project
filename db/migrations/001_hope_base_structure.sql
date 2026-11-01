-- HOPE base schema migration
-- Intentionally excluded from this file: audit_log, audit_user(), trigger functions,
-- and related audit objects. Those are handled in Task 6.

CREATE TABLE IF NOT EXISTS public."DEPARTMENT" (
    department_id VARCHAR(5) PRIMARY KEY,
    department_name VARCHAR(20),
    status VARCHAR(8) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    stamp VARCHAR(80) NOT NULL
);
COMMENT ON TABLE public."DEPARTMENT" IS 'Department catalogue for the HOPE ERP system.';
COMMENT ON COLUMN public."DEPARTMENT".department_name IS 'Department or branch name.';
COMMENT ON COLUMN public."DEPARTMENT".status IS 'Soft-delete flag. Inactive means the record is logically deleted; it is not a physical delete.';
COMMENT ON COLUMN public."DEPARTMENT".stamp IS 'Latest action summary in the form: EDITED username yyyy-mm-dd h:mm AM/PM.';

CREATE TABLE IF NOT EXISTS public."JOB" (
    job_id VARCHAR(5) PRIMARY KEY,
    job_title VARCHAR(20),
    status VARCHAR(8) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    stamp VARCHAR(80) NOT NULL
);
COMMENT ON TABLE public."JOB" IS 'Defined job titles and roles used by employee records.';
COMMENT ON COLUMN public."JOB".job_title IS 'Role name used in assignment and reporting.';
COMMENT ON COLUMN public."JOB".status IS 'Soft-delete flag; active jobs remain in use, inactive jobs are retired.';
COMMENT ON COLUMN public."JOB".stamp IS 'Latest action summary for this job code.';

CREATE TABLE IF NOT EXISTS public."EMPLOYEE" (
    employee_id VARCHAR(5) PRIMARY KEY,
    first_name VARCHAR(15),
    last_name VARCHAR(15),
    gender CHAR(1) CHECK (gender IN ('M', 'F')),
    birth_date DATE,
    hire_date DATE NOT NULL,
    sep_date DATE,
    status VARCHAR(8) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    stamp VARCHAR(80) NOT NULL,
    CHECK (sep_date IS NULL OR sep_date >= hire_date)
);
COMMENT ON TABLE public."EMPLOYEE" IS 'Personnel master file for HOPE operations.';
COMMENT ON COLUMN public."EMPLOYEE".sep_date IS 'Date the employee left the company; this is distinct from status, which marks the record as logically deleted.';
COMMENT ON COLUMN public."EMPLOYEE".status IS 'Logical deletion state. Use Active/Inactive instead of physical delete.';
COMMENT ON COLUMN public."EMPLOYEE".stamp IS 'Latest action summary, including who performed the change and when.';

CREATE TABLE IF NOT EXISTS public."JOBHISTORY" (
    employee_id VARCHAR(5) NOT NULL,
    job_id VARCHAR(5) NOT NULL,
    effective_date DATE NOT NULL,
    salary NUMERIC(10,2) CHECK (salary >= 0),
    department_id VARCHAR(5),
    status VARCHAR(8) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    stamp VARCHAR(80) NOT NULL,
    PRIMARY KEY (employee_id, job_id, effective_date),
    FOREIGN KEY (employee_id) REFERENCES public."EMPLOYEE"(employee_id) ON DELETE RESTRICT,
    FOREIGN KEY (job_id) REFERENCES public."JOB"(job_id) ON DELETE RESTRICT,
    FOREIGN KEY (department_id) REFERENCES public."DEPARTMENT"(department_id) ON DELETE RESTRICT
);
COMMENT ON TABLE public."JOBHISTORY" IS 'History of employee job assignments, including salary changes over time.';
COMMENT ON COLUMN public."JOBHISTORY".effective_date IS 'Effective date of the employee job assignment.';
COMMENT ON COLUMN public."JOBHISTORY".status IS 'Logical state of the assignment record.';
COMMENT ON COLUMN public."JOBHISTORY".stamp IS 'Last change metadata for the assignment row.';

CREATE TABLE IF NOT EXISTS public."CUSTOMER" (
    customer_id VARCHAR(10) PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_address VARCHAR(200),
    terms VARCHAR(20),
    status VARCHAR(8) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    stamp VARCHAR(80) NOT NULL
);
COMMENT ON TABLE public."CUSTOMER" IS 'Customer master list with credit terms and logical deletion state.';
COMMENT ON COLUMN public."CUSTOMER".customer_name IS 'Customer or company name.';
COMMENT ON COLUMN public."CUSTOMER".terms IS 'Payment terms such as Net 30, Net 45, COD, Prepaid, or Net 15.';
COMMENT ON COLUMN public."CUSTOMER".status IS 'Soft-delete indicator; inactive customers are not physically removed.';

CREATE TABLE IF NOT EXISTS public."PRODUCT" (
    product_id VARCHAR(6) PRIMARY KEY,
    product_name VARCHAR(30),
    unit VARCHAR(10) CHECK (unit IN ('pc', 'ea', 'mtr', 'pkg', 'ltr', 'pcs', 'pair', 'can', 'meter')),
    status VARCHAR(8) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    stamp VARCHAR(80) NOT NULL
);
COMMENT ON TABLE public."PRODUCT" IS 'Inventory or sales item catalog.';
COMMENT ON COLUMN public."PRODUCT".unit IS 'Inventory unit of measure used in the quantity check.';
COMMENT ON COLUMN public."PRODUCT".status IS 'Logical delete flag; do not physically remove products.';

CREATE TABLE IF NOT EXISTS public."PRICEHIST" (
    effective_date DATE NOT NULL,
    product_id VARCHAR(6) NOT NULL,
    unit_price NUMERIC(10,2) CHECK (unit_price >= 0),
    status VARCHAR(8) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    stamp VARCHAR(80) NOT NULL,
    PRIMARY KEY (product_id, effective_date),
    FOREIGN KEY (product_id) REFERENCES public."PRODUCT"(product_id) ON DELETE RESTRICT
);
COMMENT ON TABLE public."PRICEHIST" IS 'Price history by product and effective date; the latest active row is the current price.';
COMMENT ON COLUMN public."PRICEHIST".unit_price IS 'Unit selling price as of the effective_date.';
COMMENT ON COLUMN public."PRICEHIST".status IS 'Active rows are current in pricing; inactive rows are historical or disabled.';

CREATE TABLE IF NOT EXISTS public."SALES" (
    sale_id VARCHAR(8) PRIMARY KEY,
    sale_date DATE,
    customer_id VARCHAR(10) REFERENCES public."CUSTOMER"(customer_id) ON DELETE RESTRICT,
    employee_id VARCHAR(5) REFERENCES public."EMPLOYEE"(employee_id) ON DELETE RESTRICT,
    status VARCHAR(8) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    stamp VARCHAR(80) NOT NULL
);
COMMENT ON TABLE public."SALES" IS 'Sales transactions. Totals are not stored; they are derived from SALESDETAIL rows.';
COMMENT ON COLUMN public."SALES".status IS 'Logical state of the sales document. Inactive indicates soft delete.';

CREATE TABLE IF NOT EXISTS public."SALESDETAIL" (
    sale_id VARCHAR(8) NOT NULL,
    product_id VARCHAR(6) NOT NULL,
    quantity NUMERIC(10,2) CHECK (quantity > 0),
    status VARCHAR(8) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    stamp VARCHAR(80) NOT NULL,
    PRIMARY KEY (sale_id, product_id),
    FOREIGN KEY (sale_id) REFERENCES public."SALES"(sale_id) ON DELETE RESTRICT,
    FOREIGN KEY (product_id) REFERENCES public."PRODUCT"(product_id) ON DELETE RESTRICT
);
COMMENT ON TABLE public."SALESDETAIL" IS 'Line items for each sales transaction; totals are derived from quantity and the applicable price history.';
COMMENT ON COLUMN public."SALESDETAIL".quantity IS 'Positive quantity ordered or sold.';
COMMENT ON COLUMN public."SALESDETAIL".status IS 'Logical state of the sales line.';

CREATE TABLE IF NOT EXISTS public."PAYMENT" (
    payment_id VARCHAR(8) PRIMARY KEY,
    sale_id VARCHAR(8) REFERENCES public."SALES"(sale_id) ON DELETE RESTRICT,
    payment_date DATE,
    payment_amount NUMERIC(10,2) CHECK (payment_amount > 0),
    status VARCHAR(8) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    stamp VARCHAR(80) NOT NULL
);
COMMENT ON TABLE public."PAYMENT" IS 'Payments applied against a sales transaction.';
COMMENT ON COLUMN public."PAYMENT".payment_amount IS 'Amount received for the sale; must be positive.';
COMMENT ON COLUMN public."PAYMENT".status IS 'Logical state of the payment record.';

CREATE INDEX IF NOT EXISTS idx_employee_status ON public."EMPLOYEE"(status);
CREATE INDEX IF NOT EXISTS idx_department_status ON public."DEPARTMENT"(status);
CREATE INDEX IF NOT EXISTS idx_job_status ON public."JOB"(status);
CREATE INDEX IF NOT EXISTS idx_jobhistory_employee ON public."JOBHISTORY"(employee_id);
CREATE INDEX IF NOT EXISTS idx_jobhistory_job ON public."JOBHISTORY"(job_id);
CREATE INDEX IF NOT EXISTS idx_jobhistory_department ON public."JOBHISTORY"(department_id);
CREATE INDEX IF NOT EXISTS idx_jobhistory_status ON public."JOBHISTORY"(status);
CREATE INDEX IF NOT EXISTS idx_customer_status ON public."CUSTOMER"(status);
CREATE INDEX IF NOT EXISTS idx_product_status ON public."PRODUCT"(status);
CREATE INDEX IF NOT EXISTS idx_pricehist_status ON public."PRICEHIST"(status);
CREATE INDEX IF NOT EXISTS idx_pricehist_product ON public."PRICEHIST"(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public."SALES"(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_employee ON public."SALES"(employee_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public."SALES"(status);
CREATE INDEX IF NOT EXISTS idx_salesdetail_sale ON public."SALESDETAIL"(sale_id);
CREATE INDEX IF NOT EXISTS idx_salesdetail_product ON public."SALESDETAIL"(product_id);
CREATE INDEX IF NOT EXISTS idx_salesdetail_status ON public."SALESDETAIL"(status);
CREATE INDEX IF NOT EXISTS idx_payment_sale ON public."PAYMENT"(sale_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON public."PAYMENT"(status);
