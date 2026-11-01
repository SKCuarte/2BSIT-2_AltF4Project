# Migrations

Add forward-only PostgreSQL migrations here as `NNN_description.sql` (for example, `001_create_users.sql`). Files are applied in lexical filename order and each file plus its tracking row commits in one transaction. `001_hope_base_structure.sql` creates the ten HOPE base tables, `002_hope_sample_data.sql` loads the guide's screen fixtures, and `003_user_management.sql` creates the role/rights catalogue and user-permission schema.

Never change or remove an applied migration. Add a new numbered migration instead. Do not put `BEGIN` or `COMMIT` inside migration files; the runner owns the transaction. Audit logging objects are excluded here and reserved for Task 6.