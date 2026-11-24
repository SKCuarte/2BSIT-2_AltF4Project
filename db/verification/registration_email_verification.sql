-- Disposable local test database with the documented auth.users stub only.
-- Never run against hosted Auth or Production. Identity increments are not rolled back.
BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('00000000-0000-4000-8000-000000000201', 'verify.registration@example.invalid', NULL);

DO $$
DECLARE
    test_user BIGINT;
BEGIN
    INSERT INTO public.app_user (first_name, last_name, email, auth_user_id, approval_status)
    VALUES ('Verify', 'Registration', 'verify.registration@example.invalid',
            '00000000-0000-4000-8000-000000000201', 'Pending')
    RETURNING id INTO test_user;

    BEGIN
        UPDATE public.app_user SET approval_status = 'Approved' WHERE id = test_user;
        RAISE EXCEPTION 'Unverified registration was approved';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    UPDATE public.app_user SET email_verified_at = CURRENT_TIMESTAMP WHERE id = test_user;
    BEGIN
        UPDATE public.app_user SET approval_status = 'Approved' WHERE id = test_user;
        RAISE EXCEPTION 'Unconfirmed Auth email was approved';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    UPDATE auth.users SET email_confirmed_at = CURRENT_TIMESTAMP
    WHERE id = '00000000-0000-4000-8000-000000000201';
    UPDATE public.app_user SET email = 'different@example.invalid' WHERE id = test_user;
    IF (SELECT email_verified_at FROM public.app_user WHERE id = test_user) IS NOT NULL THEN
        RAISE EXCEPTION 'Changing the email did not clear verification';
    END IF;
    UPDATE public.app_user SET email_verified_at = CURRENT_TIMESTAMP WHERE id = test_user;
    BEGIN
        UPDATE public.app_user SET approval_status = 'Approved' WHERE id = test_user;
        RAISE EXCEPTION 'Mismatched Auth email was approved';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    UPDATE public.app_user SET email = 'verify.registration@example.invalid' WHERE id = test_user;
    UPDATE public.app_user SET email_verified_at = CURRENT_TIMESTAMP WHERE id = test_user;
    UPDATE public.app_user SET approval_status = 'Approved' WHERE id = test_user;
    IF (SELECT approval_status FROM public.app_user WHERE id = test_user) <> 'Approved' THEN
        RAISE EXCEPTION 'Verified registration was not approved';
    END IF;
END;
$$;

ROLLBACK;
