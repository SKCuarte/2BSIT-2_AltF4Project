-- Fictional demo records for Customer and Product UI integration and QA.
-- Stable IDs and conflict-safe inserts make this seed safe to rerun.

INSERT INTO public."CUSTOMER" (
    customer_id, customer_name, customer_address, terms, status, stamp
)
VALUES
    ('C-006', 'Northwind Supply Co', '100 Commerce Way, Metro City', 'Net 30', 'Active', 'CREATED demo_seed 2026-01-01 9:00 AM'),
    ('C-007', 'Blue Yonder Logistics', '250 Harbor Road, Harbor Town', 'Net 45', 'Active', 'CREATED demo_seed 2026-01-01 9:00 AM'),
    ('C-008', 'Wayne Industrial', '500 Foundry Lane, Gotham', 'COD', 'Active', 'CREATED demo_seed 2026-01-01 9:00 AM'),
    ('C-009', 'Hooli Manufacturing', '75 Innovation Drive, Silicon Valley', 'Prepaid', 'Active', 'CREATED demo_seed 2026-01-01 9:00 AM'),
    ('C-010', 'Pied Piper Components', '18 Byte Boulevard, Metro City', 'Net 15', 'Active', 'CREATED demo_seed 2026-01-01 9:00 AM')
ON CONFLICT (customer_id) DO NOTHING;

INSERT INTO public."PRODUCT" (
    product_id, product_name, unit, status, stamp
)
VALUES
    ('P-006', 'Hex Bolt M8', 'pc', 'Active', 'CREATED demo_seed 2026-01-01 9:00 AM'),
    ('P-007', 'Precision Valve', 'ea', 'Active', 'CREATED demo_seed 2026-01-01 9:00 AM'),
    ('P-008', 'Copper Tubing 12mm', 'mtr', 'Active', 'CREATED demo_seed 2026-01-01 9:00 AM'),
    ('P-009', 'Electrical Cable Kit', 'pkg', 'Active', 'CREATED demo_seed 2026-01-01 9:00 AM'),
    ('P-010', 'Hydraulic Fluid 1L', 'ltr', 'Active', 'CREATED demo_seed 2026-01-01 9:00 AM')
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO public."PRICEHIST" (
    product_id, effective_date, unit_price, status, stamp
)
VALUES
    ('P-006', '2026-01-01', 2.50, 'Active', 'CREATED demo_seed 2026-01-01 9:00 AM'),
    ('P-006', '2026-06-01', 2.75, 'Active', 'EDITED demo_seed 2026-06-01 9:00 AM'),
    ('P-006', '2026-10-01', 3.00, 'Active', 'EDITED demo_seed 2026-10-01 9:00 AM'),
    ('P-007', '2026-01-01', 18.00, 'Active', 'CREATED demo_seed 2026-01-01 9:00 AM'),
    ('P-007', '2026-06-01', 19.50, 'Active', 'EDITED demo_seed 2026-06-01 9:00 AM'),
    ('P-007', '2026-10-01', 21.00, 'Active', 'EDITED demo_seed 2026-10-01 9:00 AM'),
    ('P-008', '2026-01-01', 6.25, 'Active', 'CREATED demo_seed 2026-01-01 9:00 AM'),
    ('P-008', '2026-06-01', 6.75, 'Active', 'EDITED demo_seed 2026-06-01 9:00 AM'),
    ('P-008', '2026-10-01', 7.25, 'Active', 'EDITED demo_seed 2026-10-01 9:00 AM'),
    ('P-009', '2026-01-01', 125.00, 'Active', 'CREATED demo_seed 2026-01-01 9:00 AM'),
    ('P-009', '2026-06-01', 130.00, 'Active', 'EDITED demo_seed 2026-06-01 9:00 AM'),
    ('P-009', '2026-10-01', 135.00, 'Active', 'EDITED demo_seed 2026-10-01 9:00 AM'),
    ('P-010', '2026-01-01', 42.00, 'Active', 'CREATED demo_seed 2026-01-01 9:00 AM'),
    ('P-010', '2026-06-01', 44.00, 'Active', 'EDITED demo_seed 2026-06-01 9:00 AM'),
    ('P-010', '2026-10-01', 46.00, 'Active', 'EDITED demo_seed 2026-10-01 9:00 AM')
ON CONFLICT (product_id, effective_date) DO NOTHING;
