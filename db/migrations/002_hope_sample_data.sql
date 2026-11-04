-- HOPE sample records transcribed from the October 2026 student guide.
-- Audit logging objects are excluded and reserved for Task 6.

INSERT INTO public."DEPARTMENT" (department_id, department_name, status, stamp)
VALUES
    ('D-001', 'Engineering', 'Active', 'CREATED system 2026-01-01 9:00 AM'),
    ('D-002', 'Sales', 'Active', 'CREATED system 2026-01-01 9:00 AM'),
    ('D-003', 'Human Resources', 'Active', 'CREATED system 2026-01-01 9:00 AM'),
    ('D-004', 'Finance', 'Inactive', 'DELETED user2 2026-10-13 1:01 PM')
ON CONFLICT (department_id) DO NOTHING;

INSERT INTO public."JOB" (job_id, job_title, status, stamp)
VALUES
    ('J-001', 'Software Engineer', 'Active', 'CREATED system 2026-01-01 9:00 AM'),
    ('J-002', 'Sales Manager', 'Active', 'CREATED system 2026-01-01 9:00 AM'),
    ('J-003', 'HR Specialist', 'Active', 'EDITED user1 2026-10-13 1:01 PM'),
    ('J-004', 'Accountant', 'Inactive', 'DELETED user2 2026-10-13 1:01 PM')
ON CONFLICT (job_id) DO NOTHING;

INSERT INTO public."EMPLOYEE" (
    employee_id, last_name, first_name, gender, birth_date, hire_date, sep_date, status, stamp
)
VALUES
    ('E-001', 'Santos', 'Maria', 'F', '1990-05-12', '2020-03-01', NULL, 'Active', 'CREATED system 2026-01-15 10:00 AM'),
    ('E-002', 'Reyes', 'Juan', 'M', '1988-11-03', '2019-07-15', NULL, 'Active', 'EDITED user1 2026-10-13 1:01 PM'),
    ('E-003', 'Cruz', 'Ana', 'F', '1995-02-20', '2021-01-10', NULL, 'Active', 'CREATED system 2026-02-01 9:00 AM'),
    ('E-004', 'Garcia', 'Pedro', 'M', '1985-08-30', '2018-05-01', '2025-12-31', 'Inactive', 'DELETED user2 2026-10-13 1:01 PM')
ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO public."JOBHISTORY" (
    employee_id, job_id, effective_date, salary, department_id, status, stamp
)
VALUES
    ('E-001', 'J-001', '2020-03-01', 45000.00, 'D-001', 'Active', 'CREATED system 2020-03-01 9:00 AM'),
    ('E-001', 'J-001', '2023-01-01', 52000.00, 'D-001', 'Active', 'EDITED user1 2026-10-13 1:01 PM')
ON CONFLICT (employee_id, job_id, effective_date) DO NOTHING;

INSERT INTO public."CUSTOMER" (customer_id, customer_name, customer_address, terms, status, stamp)
VALUES
    ('C-001', 'Acme Corporation', '123 Main St, Metro City', 'Net 30', 'Active', 'CREATED system 2026-10-01 9:00 AM'),
    ('C-002', 'Globex Industries', '456 Oak Ave, Harbor Town', 'Net 45', 'Active', 'CREATED system 2026-10-02 10:15 AM'),
    ('C-003', 'Initech LLC', '789 Pine Rd, Silicon Valley', 'COD', 'Active', 'EDITED user1 2026-10-13 1:01 PM'),
    ('C-004', 'Umbrella Corp', '1 Raccoon City Blvd', 'Prepaid', 'Inactive', 'DELETED user2 2026-10-13 1:01 PM'),
    ('C-005', 'Stark Enterprises', '200 Park Avenue, New York', 'Net 15', 'Active', 'EDITED user1 2026-10-13 1:01 PM')
ON CONFLICT (customer_id) DO NOTHING;

INSERT INTO public."PRODUCT" (product_id, product_name, unit, status, stamp)
VALUES
    ('P-001', 'Industrial Widget A', 'pcs', 'Active', 'CREATED system 2026-10-01 9:00 AM'),
    ('P-002', 'Steel Bracket Heavy', 'pcs', 'Active', 'CREATED system 2026-10-02 10:00 AM'),
    ('P-003', 'Lubricant Oil 5L', 'can', 'Active', 'EDITED user1 2026-10-13 1:01 PM'),
    ('P-004', 'Safety Gloves XL', 'pair', 'Inactive', 'DELETED user2 2026-10-13 1:01 PM'),
    ('P-005', 'Copper Wire 2.5mm', 'meter', 'Active', 'EDITED user1 2026-10-05 3:00 PM')
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO public."PRICEHIST" (product_id, effective_date, unit_price, status, stamp)
VALUES
    ('P-001', '2026-10-01', 13.75, 'Active', 'CREATED system 2026-10-01 9:00 AM'),
    ('P-002', '2026-10-01', 48.50, 'Active', 'CREATED system 2026-10-02 10:00 AM'),
    ('P-003', '2026-02-01', 28.00, 'Active', 'CREATED system 2026-02-01 10:00 AM'),
    ('P-005', '2026-10-05', 2.35, 'Active', 'EDITED user1 2026-10-05 3:00 PM')
ON CONFLICT (product_id, effective_date) DO NOTHING;

INSERT INTO public."SALES" (sale_id, sale_date, customer_id, employee_id, status, stamp)
VALUES
    ('T-001', '2026-10-01', 'C-001', 'E-002', 'Active', 'CREATED system 2026-10-01 10:00 AM'),
    ('T-002', '2026-10-05', 'C-002', 'E-001', 'Active', 'EDITED user1 2026-10-13 1:01 PM'),
    ('T-003', '2026-10-08', 'C-003', 'E-002', 'Active', 'CREATED system 2026-10-08 2:00 PM'),
    ('T-004', '2026-09-20', 'C-005', 'E-003', 'Inactive', 'DELETED user2 2026-10-13 1:01 PM')
ON CONFLICT (sale_id) DO NOTHING;

INSERT INTO public."SALESDETAIL" (sale_id, product_id, quantity, status, stamp)
VALUES
    ('T-001', 'P-001', 10, 'Active', 'CREATED system 2026-10-01 10:00 AM'),
    ('T-001', 'P-002', 2, 'Active', 'CREATED system 2026-10-01 10:00 AM'),
    ('T-002', 'P-003', 5, 'Active', 'CREATED system 2026-10-05 10:00 AM'),
    ('T-003', 'P-001', 20, 'Active', 'CREATED system 2026-10-08 2:00 PM'),
    ('T-003', 'P-005', 100, 'Active', 'CREATED system 2026-10-08 2:00 PM')
ON CONFLICT (sale_id, product_id) DO NOTHING;