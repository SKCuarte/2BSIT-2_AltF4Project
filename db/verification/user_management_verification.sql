-- Run after all migrations in a clean local/test database with auth.users fixtures
-- provisioned separately. CI uses a minimal auth.users stub; never insert test IDs
-- directly into a shared or production Supabase Auth schema.
-- This targets the repository 003/004 baseline (BIGINT application IDs and a
-- UUID Auth ID), not the separately reported UUID-based live application schema.
-- Expected catalogue: 3 roles, 5 modules, 36 rights, and the module counts below.
-- The transaction rolls back its temporary user and permission fixtures.
-- Identity-sequence increments are not rolled back; never use a shared database.
BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM (VALUES
            ('public.app_user', 'id', 'bigint'::regtype),
            ('public.app_user', 'role_id', 'bigint'::regtype),
            ('public.app_user', 'auth_user_id', 'uuid'::regtype),
            ('public.role', 'id', 'bigint'::regtype),
            ('public.module', 'id', 'bigint'::regtype),
            ('public.rights', 'id', 'bigint'::regtype),
            ('public.rights', 'module_id', 'bigint'::regtype),
            ('public.user_permission', 'user_id', 'bigint'::regtype),
            ('public.user_permission', 'right_id', 'bigint'::regtype),
            ('public.user_permission', 'granted_by', 'bigint'::regtype)
        ) AS expected(table_name, column_name, column_type)
        LEFT JOIN pg_attribute actual
            ON actual.attrelid = to_regclass(expected.table_name)
           AND actual.attname = expected.column_name
           AND actual.attnum > 0 AND NOT actual.attisdropped
        WHERE actual.atttypid IS DISTINCT FROM expected.column_type
    ) THEN
        RAISE EXCEPTION 'Verification requires the repository 003/004 ID types; do not run it on the UUID live application schema';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.app_user account
        JOIN public.role account_role ON account_role.id = account.role_id
        WHERE account_role.name = 'Superadmin' AND account_role.status = 'Active'
          AND account.status = 'Active' AND account.approval_status = 'Approved'
          AND NOT account.is_blocked
    ) THEN
        RAISE EXCEPTION 'Verification requires a clean disposable database without existing eligible Superadmins';
    END IF;
END;
$$;

SELECT 'role' AS catalogue, 3 AS expected_count, COUNT(*) AS actual_count,
       COUNT(*) = 3 AS passed
FROM public.role
UNION ALL
SELECT 'module', 5, COUNT(*), COUNT(*) = 5 FROM public.module
UNION ALL
SELECT 'rights', 36, COUNT(*), COUNT(*) = 36 FROM public.rights;

SELECT expected.module_name, actual.rights_count AS actual_count, expected.expected_count,
       actual.rights_count IS NOT DISTINCT FROM expected.expected_count AS passed
FROM (VALUES
    ('Customer', 3),
    ('Product', 6),
    ('Human Resources', 13),
    ('Sales', 7),
    ('Reports', 7)
) AS expected(module_name, expected_count)
LEFT JOIN public.v_rights_count_by_module actual USING (module_name)
ORDER BY expected.module_name;

DO $$
DECLARE
    user_role_id BIGINT;
    admin_role_id BIGINT;
    superadmin_role_id BIGINT;
    test_right_id BIGINT;
    test_module_id BIGINT;
    test_user_id BIGINT;
    test_admin_id BIGINT;
    test_grantor_id BIGINT;
    test_superadmin_id BIGINT;
    stored_email TEXT;
    stored_role TEXT;
    stored_approval_status TEXT;
    permission_status TEXT;
    permission_stamp TEXT;
    denied BOOLEAN;
    effective_count INTEGER;
    public_role TEXT;
    protected_table TEXT;
    privilege_name TEXT;
BEGIN
    IF (SELECT COUNT(*) FROM public.role) <> 3 THEN
        RAISE EXCEPTION 'Expected 3 roles';
    END IF;
    IF (SELECT COUNT(*) FROM public.module) <> 5 THEN
        RAISE EXCEPTION 'Expected 5 modules';
    END IF;
    IF (SELECT COUNT(*) FROM public.rights) <> 36 THEN
        RAISE EXCEPTION 'Expected 36 rights';
    END IF;
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.app_user'::regclass)
        OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.user_permission'::regclass) THEN
        RAISE EXCEPTION 'RLS must be enabled for app_user and user_permission';
    END IF;
    FOREACH protected_table IN ARRAY ARRAY['public.app_user', 'public.user_permission'] LOOP
        FOREACH public_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
            FOREACH privilege_name IN ARRAY ARRAY[
                'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
            ] LOOP
                IF has_table_privilege(public_role, protected_table, privilege_name) THEN
                    RAISE EXCEPTION 'Public API role % has % on %', public_role, privilege_name, protected_table;
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
    FOREACH protected_table IN ARRAY ARRAY[
        'public."CUSTOMER"', 'public."PRODUCT"', 'public."PRICEHIST"',
        'public."DEPARTMENT"', 'public."JOB"', 'public."EMPLOYEE"',
        'public."JOBHISTORY"', 'public."SALES"', 'public."SALESDETAIL"',
        'public."PAYMENT"'
    ] LOOP
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = protected_table::regclass) THEN
            RAISE EXCEPTION 'RLS must be enabled for %', protected_table;
        END IF;
        FOREACH public_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
            FOREACH privilege_name IN ARRAY ARRAY[
                'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
            ] LOOP
                IF has_table_privilege(public_role, protected_table, privilege_name) THEN
                    RAISE EXCEPTION 'Public API role % has % on %', public_role, privilege_name, protected_table;
                END IF;
            END LOOP;
        END LOOP;
        IF NOT has_table_privilege('service_role', protected_table, 'SELECT') THEN
            RAISE EXCEPTION 'service_role must be able to read %', protected_table;
        END IF;
    END LOOP;
    FOREACH public_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF has_table_privilege(public_role, 'public.v_user_effective_rights', 'SELECT') THEN
            RAISE EXCEPTION 'Public API role % can read effective rights', public_role;
        END IF;
    END LOOP;
    IF NOT has_table_privilege('service_role', 'public.v_user_effective_rights', 'SELECT') THEN
        RAISE EXCEPTION 'service_role must be able to read effective rights';
    END IF;
    IF NOT has_table_privilege('service_role', 'public.app_user', 'INSERT')
        OR NOT has_table_privilege('service_role', 'public.app_user', 'UPDATE')
        OR NOT has_sequence_privilege('service_role', pg_get_serial_sequence('public.app_user', 'id'), 'USAGE') THEN
        RAISE EXCEPTION 'Server service_role must retain app_user write and identity-sequence access';
    END IF;
    IF EXISTS (
        SELECT 1 FROM (VALUES
            ('Customer', 3), ('Product', 6), ('Human Resources', 13),
            ('Sales', 7), ('Reports', 7)
        ) AS expected(module_name, expected_count)
        LEFT JOIN public.v_rights_count_by_module actual USING (module_name)
        WHERE actual.rights_count IS DISTINCT FROM expected.expected_count
    ) THEN
        RAISE EXCEPTION 'Rights-per-module counts do not match the guide';
    END IF;

    SELECT id INTO user_role_id FROM public.role WHERE name = 'User';
    SELECT id INTO admin_role_id FROM public.role WHERE name = 'Admin';
    SELECT id INTO superadmin_role_id FROM public.role WHERE name = 'Superadmin';
    SELECT id INTO test_right_id FROM public.rights WHERE code = 'CUSTOMER_ADD';
    SELECT module_id INTO test_module_id FROM public.rights WHERE id = test_right_id;

    INSERT INTO public.app_user (first_name, last_name, email, auth_user_id)
    VALUES ('Verify', 'DefaultRole', 'Verify.User@Example.invalid', '00000000-0000-4000-8000-000000000001')
    RETURNING id INTO test_user_id;

    SELECT account.email, role.name, account.approval_status
    INTO stored_email, stored_role, stored_approval_status
    FROM public.app_user account
    JOIN public.role role ON role.id = account.role_id
    WHERE account.id = test_user_id;
    IF stored_email <> 'verify.user@example.invalid'
        OR stored_role <> 'User'
        OR stored_approval_status <> 'Pending' THEN
        RAISE EXCEPTION 'Email normalization, default User role, or Pending approval default failed';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.v_user_effective_rights
        WHERE user_id = test_user_id AND granted
    ) THEN
        RAISE EXCEPTION 'Pending app_user must not receive effective rights';
    END IF;

    INSERT INTO public.app_user (first_name, last_name, email, role_id, auth_user_id, approval_status)
    VALUES ('Verify', 'Admin', 'verify.admin@example.invalid', admin_role_id,
        '00000000-0000-4000-8000-000000000002', 'Approved')
    RETURNING id INTO test_admin_id;
    -- Keep the permission grantor separate from the Admin promoted for the guard test.
    INSERT INTO public.app_user (first_name, last_name, email, role_id, auth_user_id, approval_status)
    VALUES ('Verify', 'Grantor', 'verify.grantor@example.invalid', admin_role_id,
        '00000000-0000-4000-8000-000000000004', 'Approved')
    RETURNING id INTO test_grantor_id;
    INSERT INTO public.app_user (first_name, last_name, email, role_id, auth_user_id, approval_status)
    VALUES ('Verify', 'Superadmin', 'verify.superadmin@example.invalid', superadmin_role_id,
        '00000000-0000-4000-8000-000000000003', 'Approved')
    RETURNING id INTO test_superadmin_id;

    SELECT COUNT(*) INTO effective_count
    FROM public.v_user_effective_rights
    WHERE user_id = test_admin_id AND granted;
    IF effective_count <> 36 OR EXISTS (
        SELECT 1 FROM public.user_permission WHERE user_id = test_admin_id
    ) THEN
        RAISE EXCEPTION 'Approved Admin should receive all 36 rights without explicit grants';
    END IF;

    UPDATE public.app_user SET approval_status = 'Pending' WHERE id = test_admin_id;
    SELECT COUNT(*) INTO effective_count
    FROM public.v_user_effective_rights WHERE user_id = test_admin_id;
    IF effective_count <> 36 OR EXISTS (
        SELECT 1 FROM public.v_user_effective_rights WHERE user_id = test_admin_id AND granted
    ) THEN
        RAISE EXCEPTION 'Pending Admin must not receive effective rights';
    END IF;
    UPDATE public.app_user SET role_id = superadmin_role_id WHERE id = test_admin_id;
    SELECT COUNT(*) INTO effective_count
    FROM public.v_user_effective_rights WHERE user_id = test_admin_id;
    IF effective_count <> 36 OR EXISTS (
        SELECT 1 FROM public.v_user_effective_rights WHERE user_id = test_admin_id AND granted
    ) THEN
        RAISE EXCEPTION 'Pending Superadmin must not receive effective rights';
    END IF;
    UPDATE public.app_user SET role_id = admin_role_id, approval_status = 'Approved'
    WHERE id = test_admin_id;

    denied := FALSE;
    BEGIN
        UPDATE public.app_user SET approval_status = 'Waiting' WHERE id = test_user_id;
    EXCEPTION WHEN check_violation THEN
        denied := TRUE;
    END;
    IF NOT denied THEN
        RAISE EXCEPTION 'Invalid approval_status unexpectedly succeeded';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'app_user'
          AND column_name IN ('password_hash', 'must_set_password')
    ) THEN
        RAISE EXCEPTION 'Supabase-managed password columns remain in app_user';
    END IF;

    PERFORM set_config('app.user_id', test_grantor_id::TEXT, TRUE);
    INSERT INTO public.user_permission (user_id, right_id, granted_by)
    VALUES (test_grantor_id, test_right_id, test_grantor_id);
    UPDATE public.user_permission SET status = 'Inactive'
    WHERE user_id = test_grantor_id AND right_id = test_right_id;
    SELECT COUNT(*) INTO effective_count
    FROM public.v_user_effective_rights WHERE user_id = test_grantor_id AND granted;
    IF effective_count <> 36 THEN
        RAISE EXCEPTION 'Admin rights must remain implicit even with an inactive assignment';
    END IF;

    INSERT INTO public.user_permission (user_id, right_id, granted_by)
    VALUES (test_user_id, test_right_id, test_grantor_id);

    UPDATE public.app_user
    SET is_blocked = TRUE, approval_status = 'Approved'
    WHERE id = test_user_id;
    SELECT status, stamp INTO permission_status, permission_stamp
    FROM public.user_permission permission
    WHERE permission.user_id = test_user_id AND permission.right_id = test_right_id;
    IF permission_status <> 'Active' OR NOT permission_stamp LIKE 'CREATED %' THEN
        RAISE EXCEPTION 'Blocking an account must preserve its permission row';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.v_user_effective_rights
        WHERE user_id = test_user_id AND right_code = 'CUSTOMER_ADD'
                    AND approval_status = 'Approved' AND is_blocked AND granted
    ) THEN
        RAISE EXCEPTION 'Blocked state must remain separate from permission grants';
    END IF;
    SELECT COUNT(*) INTO effective_count
    FROM public.v_user_effective_rights WHERE user_id = test_user_id AND granted;
    IF effective_count <> 1 THEN
        RAISE EXCEPTION 'Approved User should receive only the assigned active right';
    END IF;

    UPDATE public.user_permission SET status = 'Inactive'
        WHERE public.user_permission.user_id = test_user_id
            AND public.user_permission.right_id = test_right_id;
    SELECT status, stamp INTO permission_status, permission_stamp
        FROM public.user_permission permission
        WHERE permission.user_id = test_user_id AND permission.right_id = test_right_id;
    IF permission_status <> 'Inactive' OR NOT permission_stamp LIKE 'DELETED %' THEN
        RAISE EXCEPTION 'Unticking must soft-delete and update the stamp';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.v_user_effective_rights WHERE user_id = test_user_id AND granted
    ) THEN
        RAISE EXCEPTION 'An inactive User grant must not confer effective rights';
    END IF;

    UPDATE public.user_permission SET status = 'Active'
        WHERE public.user_permission.user_id = test_user_id
            AND public.user_permission.right_id = test_right_id;
    SELECT status, stamp INTO permission_status, permission_stamp
        FROM public.user_permission permission
        WHERE permission.user_id = test_user_id AND permission.right_id = test_right_id;
    IF permission_status <> 'Active' OR NOT permission_stamp LIKE 'RESTORED %' THEN
        RAISE EXCEPTION 'Reticking must reactivate the same row and update the stamp';
    END IF;

    PERFORM set_config('app.user_id', test_user_id::TEXT, TRUE);
    denied := FALSE;
    BEGIN
                UPDATE public.user_permission SET status = 'Inactive'
                WHERE public.user_permission.user_id = test_user_id
                    AND public.user_permission.right_id = test_right_id;
    EXCEPTION WHEN raise_exception THEN
        denied := TRUE;
    END;
    IF NOT denied THEN
        RAISE EXCEPTION 'A User account unexpectedly changed permissions';
    END IF;

    PERFORM set_config('app.user_id', test_admin_id::TEXT, TRUE);
    denied := FALSE;
    BEGIN
                DELETE FROM public.user_permission
                WHERE public.user_permission.user_id = test_user_id
                    AND public.user_permission.right_id = test_right_id;
    EXCEPTION WHEN raise_exception THEN
        denied := TRUE;
    END;
    IF NOT denied THEN
        RAISE EXCEPTION 'Physical permission delete unexpectedly succeeded';
    END IF;

    SELECT COUNT(*) INTO effective_count
    FROM public.v_user_effective_rights
    WHERE user_id = test_superadmin_id AND granted;
    IF effective_count <> 36 THEN
        RAISE EXCEPTION 'Superadmin should receive all 36 rights implicitly';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.user_permission
        WHERE public.user_permission.user_id = test_superadmin_id
    ) THEN
        RAISE EXCEPTION 'Superadmin should not need explicit permission rows';
    END IF;

    UPDATE public.app_user SET is_blocked = FALSE, status = 'Inactive'
    WHERE id = test_user_id;
    IF EXISTS (SELECT 1 FROM public.v_user_effective_rights WHERE user_id = test_user_id) THEN
        RAISE EXCEPTION 'Inactive account must have no effective-rights rows';
    END IF;
    UPDATE public.app_user SET status = 'Active', approval_status = 'Rejected'
    WHERE id = test_user_id;
    IF EXISTS (SELECT 1 FROM public.v_user_effective_rights WHERE user_id = test_user_id AND granted) THEN
        RAISE EXCEPTION 'Rejected account must not receive effective rights';
    END IF;
    UPDATE public.app_user SET approval_status = 'Approved' WHERE id = test_user_id;

    UPDATE public.rights SET status = 'Inactive' WHERE id = test_right_id;
    IF EXISTS (
        SELECT 1 FROM public.v_user_effective_rights
        WHERE user_id IN (test_user_id, test_admin_id, test_superadmin_id)
          AND right_code = 'CUSTOMER_ADD'
    ) THEN
        RAISE EXCEPTION 'Inactive right must be absent for every role';
    END IF;
    UPDATE public.rights SET status = 'Active' WHERE id = test_right_id;

    UPDATE public.module SET status = 'Inactive' WHERE id = test_module_id;
    IF EXISTS (
        SELECT 1 FROM public.v_user_effective_rights
        WHERE user_id IN (test_user_id, test_admin_id, test_superadmin_id)
          AND module_code = 'CUSTOMER'
    ) THEN
        RAISE EXCEPTION 'Inactive module must be absent for every role';
    END IF;
    UPDATE public.module SET status = 'Active' WHERE id = test_module_id;
END;
$$;

-- Last active Superadmin guard (migration 008). Every failing change must be rejected.
DO $$
DECLARE
    sa_id BIGINT;
    second_id BIGINT;
    sa_role BIGINT;
    admin_role BIGINT;
    attempt TEXT;
    denied BOOLEAN;
BEGIN
    SELECT id INTO sa_role FROM public.role WHERE name = 'Superadmin';
    SELECT id INTO admin_role FROM public.role WHERE name = 'Admin';
    SELECT id INTO sa_id FROM public.app_user WHERE email = 'verify.superadmin@example.invalid';

    FOREACH attempt IN ARRAY ARRAY[
        'demote', 'block', 'inactivate', 'reject', 'delete', 'truncate', 'deactivate_role'
    ] LOOP
        denied := FALSE;
        BEGIN
            IF attempt = 'demote' THEN
                UPDATE public.app_user SET role_id = admin_role WHERE id = sa_id;
            ELSIF attempt = 'block' THEN
                UPDATE public.app_user SET is_blocked = TRUE WHERE id = sa_id;
            ELSIF attempt = 'inactivate' THEN
                UPDATE public.app_user SET status = 'Inactive' WHERE id = sa_id;
            ELSIF attempt = 'reject' THEN
                UPDATE public.app_user SET approval_status = 'Rejected' WHERE id = sa_id;
            ELSIF attempt = 'delete' THEN
                DELETE FROM public.app_user WHERE id = sa_id;
            ELSIF attempt = 'truncate' THEN
                TRUNCATE public.app_user CASCADE;
            ELSE
                UPDATE public.role SET status = 'Inactive' WHERE id = sa_role;
            END IF;
        EXCEPTION WHEN restrict_violation THEN
            denied := TRUE;
        END;
        IF NOT denied THEN
            RAISE EXCEPTION 'Last Superadmin guard did not block: %', attempt;
        END IF;
    END LOOP;

    -- With a second eligible Superadmin, the first can be demoted, blocked, or deleted.
    UPDATE public.app_user SET role_id = sa_role
    WHERE email = 'verify.admin@example.invalid'
    RETURNING id INTO second_id;

    UPDATE public.app_user SET role_id = admin_role WHERE id = sa_id;
    UPDATE public.app_user SET role_id = sa_role WHERE id = sa_id;
    UPDATE public.app_user SET is_blocked = TRUE WHERE id = sa_id;
    DELETE FROM public.app_user WHERE id = sa_id;

    -- The remaining Superadmin is now the last one and is protected again.
    denied := FALSE;
    BEGIN
        DELETE FROM public.app_user WHERE id = second_id;
    EXCEPTION WHEN restrict_violation THEN
        denied := TRUE;
    END;
    IF NOT denied THEN
        RAISE EXCEPTION 'Last Superadmin guard did not protect the remaining Superadmin';
    END IF;
END;
$$;

ROLLBACK;