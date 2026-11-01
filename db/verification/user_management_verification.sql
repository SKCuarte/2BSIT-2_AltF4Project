-- Run after all migrations in a clean development/test database.
-- Expected catalogue: 3 roles, 5 modules, 36 rights, and the module counts below.
-- The transaction rolls back its temporary user and permission fixtures.
BEGIN;

SELECT 'role' AS catalogue, 3 AS expected_count, COUNT(*) AS actual_count,
       COUNT(*) = 3 AS passed
FROM public.role
UNION ALL
SELECT 'module', 5, COUNT(*), COUNT(*) = 5 FROM public.module
UNION ALL
SELECT 'rights', 36, COUNT(*), COUNT(*) = 36 FROM public.rights;

SELECT module_name, rights_count AS actual_count, expected_count,
       rights_count = expected_count AS passed
FROM public.v_rights_count_by_module
JOIN (VALUES
    ('Customer', 3),
    ('Product', 6),
    ('Human Resources', 13),
    ('Sales', 7),
    ('Reports', 7)
) AS expected(module_name, expected_count) USING (module_name)
ORDER BY module_name;

DO $$
DECLARE
    user_role_id BIGINT;
    admin_role_id BIGINT;
    superadmin_role_id BIGINT;
    test_right_id BIGINT;
    test_user_id BIGINT;
    test_admin_id BIGINT;
    test_superadmin_id BIGINT;
    stored_email TEXT;
    stored_role TEXT;
    permission_status TEXT;
    permission_stamp TEXT;
    denied BOOLEAN;
    effective_count INTEGER;
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
    IF EXISTS (
        SELECT 1 FROM public.v_rights_count_by_module
        JOIN (VALUES
            ('Customer', 3), ('Product', 6), ('Human Resources', 13),
            ('Sales', 7), ('Reports', 7)
        ) AS expected(module_name, expected_count) USING (module_name)
        WHERE rights_count <> expected_count
    ) THEN
        RAISE EXCEPTION 'Rights-per-module counts do not match the guide';
    END IF;

    SELECT id INTO user_role_id FROM public.role WHERE name = 'User';
    SELECT id INTO admin_role_id FROM public.role WHERE name = 'Admin';
    SELECT id INTO superadmin_role_id FROM public.role WHERE name = 'Superadmin';
    SELECT id INTO test_right_id FROM public.rights WHERE code = 'CUSTOMER_ADD';

    INSERT INTO public.app_user (first_name, last_name, email)
    VALUES ('Verify', 'DefaultRole', 'Verify.User@Example.invalid')
    RETURNING id INTO test_user_id;

    SELECT email, role.name INTO stored_email, stored_role
    FROM public.app_user account
    JOIN public.role role ON role.id = account.role_id
    WHERE account.id = test_user_id;
    IF stored_email <> 'verify.user@example.invalid' OR stored_role <> 'User' THEN
        RAISE EXCEPTION 'Email normalization or default User role failed';
    END IF;

    INSERT INTO public.app_user (first_name, last_name, email, role_id)
    VALUES ('Verify', 'Admin', 'verify.admin@example.invalid', admin_role_id)
    RETURNING id INTO test_admin_id;
    INSERT INTO public.app_user (first_name, last_name, email, role_id)
    VALUES ('Verify', 'Superadmin', 'verify.superadmin@example.invalid', superadmin_role_id)
    RETURNING id INTO test_superadmin_id;

    PERFORM set_config('app.user_id', test_admin_id::TEXT, TRUE);
    INSERT INTO public.user_permission (user_id, right_id, granted_by)
    VALUES (test_user_id, test_right_id, test_admin_id);

    UPDATE public.app_user SET is_blocked = TRUE WHERE id = test_user_id;
    SELECT status, stamp INTO permission_status, permission_stamp
    FROM public.user_permission permission
    WHERE permission.user_id = test_user_id AND permission.right_id = test_right_id;
    IF permission_status <> 'Active' OR NOT permission_stamp LIKE 'CREATED %' THEN
        RAISE EXCEPTION 'Blocking an account must preserve its permission row';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.v_user_effective_rights
        WHERE user_id = test_user_id AND right_code = 'CUSTOMER_ADD'
          AND is_blocked AND granted
    ) THEN
        RAISE EXCEPTION 'Blocked state must remain separate from permission grants';
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
END;
$$;

ROLLBACK;