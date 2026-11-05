-- Read-only checks; run after migrations and `npm run db:seed`. Fails on any mismatch.
BEGIN;

CREATE TEMP TABLE seed_checks (check_name TEXT, expected TEXT, actual TEXT, passed BOOLEAN) ON COMMIT DROP;

INSERT INTO seed_checks
SELECT 'roles', '3', COUNT(*)::TEXT, COUNT(*) = 3 FROM public.role
UNION ALL
SELECT 'modules', '5', COUNT(*)::TEXT, COUNT(*) = 5 FROM public.module
UNION ALL
SELECT 'rights', '36', COUNT(*)::TEXT, COUNT(*) = 36 FROM public.rights
UNION ALL
SELECT 'rights: ' || counts.module_code, expected.total::TEXT, counts.rights_count::TEXT,
       counts.rights_count = expected.total
FROM public.v_rights_count_by_module counts
JOIN (VALUES ('CUSTOMER', 3), ('PRODUCT', 6), ('HR', 13), ('SALES', 7), ('REPORTS', 7))
     AS expected(module_code, total) USING (module_code)
UNION ALL
SELECT 'role names', 'Admin,Superadmin,User', string_agg(name, ',' ORDER BY name),
       string_agg(name, ',' ORDER BY name) = 'Admin,Superadmin,User'
FROM public.role
UNION ALL
SELECT 'Superadmins approved and unblocked', '0 exceptions',
       COUNT(*)::TEXT || ' exceptions', COUNT(*) = 0
FROM public.app_user account
JOIN public.role account_role ON account_role.id = account.role_id
WHERE account_role.name = 'Superadmin'
  AND (account.approval_status <> 'Approved' OR account.is_blocked)
UNION ALL
SELECT 'open set_password tokens per user', 'at most 1',
       COALESCE(MAX(open_tokens), 0)::TEXT, COALESCE(MAX(open_tokens), 0) <= 1
FROM (
    SELECT COUNT(*) AS open_tokens
    FROM public.password_reset_token
    WHERE purpose = 'set_password' AND status = 'Active' AND used_at IS NULL
    GROUP BY user_id
) AS per_user;

SELECT * FROM seed_checks ORDER BY check_name;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM seed_checks WHERE NOT passed) THEN
        RAISE EXCEPTION 'Seed verification failed; see the check list above';
    END IF;
END;
$$;

ROLLBACK;
