# HOPE Source Reconciliation

## Confirmed Differences

- The audit SQL uses legacy field names such as `empno`, `deptCode`, `jobCode`, and `transNo`. The migration uses consistent descriptive column names such as `employee_id`, `department_id`, `job_id`, and `sale_id`.
- The audit SQL uses legacy IDs such as `C0001` and narrower fields (`custName VARCHAR(20)`, `address VARCHAR(50)`, `payterm VARCHAR(3)`). The guide uses hyphenated IDs (`C-001`) and wider customer data, including terms such as `Net 30`, `Net 45`, `Prepaid`, and `Net 15`; the migration widens the customer fields and removes the incompatible legacy terms check.
- The audit SQL's product-unit check does not include guide values `pcs`, `pair`, `can`, and `meter`; the migration allows these guide values in addition to the audit SQL's existing unit values. The `JOB` and `DEPARTMENT` legacy code widths are also too short for the guide IDs `J-001` and `D-001`, so they are widened to five characters.
- The audit SQL adds `is_deleted` and audit-generated stamps in its later audit section. This task requires `status` with `Active`/`Inactive` and a `stamp` column on every base table. The migration uses the requested status model and explicit guide stamp values.
- `EMPLOYEE` has no department or job foreign keys in the audit schema. Those relationships are represented by `JOBHISTORY`; the migration preserves that relationship model.
- `JOBHISTORY`, `PRICEHIST`, and `SALESDETAIL` use composite keys. Their migration keys follow the guide ERD: `(employee_id, job_id, effective_date)`, `(product_id, effective_date)`, and `(sale_id, product_id)`. The audit SQL lists the PRICEHIST key columns in the opposite order; the key members are unchanged.
- The audit SQL stores quantity, but not a unit price, on `SALESDETAIL`. Sales totals are therefore verified using the latest applicable `PRICEHIST` value on or before the sale date.
- The audit SQL allows zero quantity and requires `unitPrice > 0`; this task tightens quantity to `> 0` and specifies `unit_price >= 0`.
- The audit SQL's payment fields are receipt number, transaction number, payment date, and amount. The migration maps these to `payment_id`, `sale_id`, `payment_date`, and `payment_amount`; no payment-method column is invented.
- The audit section includes `audit_log`, `audit_user()`, `audit_stamp()`, stamp/audit trigger functions, hard-delete/truncate guards, active views, `is_deleted` alterations, and child-check triggers. These objects are excluded from Tasks 1/2 and reserved for Task 6.

## Guide-Specific Notes

- The guide shows five customers, five products, four employees, four jobs, four departments, two job-history rows for E-001, four sales, and five sales-detail rows. It shows no payment records, so PAYMENT is intentionally empty in this sample migration.
- The guide displays only T-001 detail stamps. The T-002 and T-003 line stamps use the corresponding sale's visible system timestamp because the guide does not show separate line stamps for those transactions; the task owner confirmed the current values are acceptable on 2026-11-01.
- The guide shows current prices for P-001, P-002, and P-005 but not their price-effective dates or PRICEHIST row stamps. The migration uses 2026-10-01, 2026-10-01, and 2026-10-05 respectively so the displayed prices apply to the sample sales; those dates/stamps are inferred, and the task owner confirmed the current values are acceptable on 2026-11-01. P-003's 2026-02-01 effective date and stamp are visible in its price-history screenshot.
- T-002's five P-003 units and T-003's 20 P-001 plus 100 P-005 units are consistent with the guide's per-product report totals and its stated T-002/T-003 totals.