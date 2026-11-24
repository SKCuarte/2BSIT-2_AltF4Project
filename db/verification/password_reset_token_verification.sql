-- Run only against the disposable local/test database with the auth.users stub.
-- All fixture users and tokens are rolled back; never run against hosted Auth.
BEGIN;

INSERT INTO auth.users (id) VALUES
    ('00000000-0000-4000-8000-000000000101'),
    ('00000000-0000-4000-8000-000000000102'),
    ('00000000-0000-4000-8000-000000000103'),
    ('00000000-0000-4000-8000-000000000104'),
    ('00000000-0000-4000-8000-000000000105'),
    ('00000000-0000-4000-8000-000000000106'),
    ('00000000-0000-4000-8000-000000000107');

CREATE TEMP TABLE password_reset_test_users (
    case_name TEXT PRIMARY KEY,
    user_id BIGINT NOT NULL
) ON COMMIT DROP;

WITH inserted_users AS (
    INSERT INTO public.app_user (
        first_name, last_name, email, auth_user_id, status, approval_status, is_blocked
    )
    VALUES
        ('Verify', 'TokenValid', 'verify.token.valid@example.invalid', '00000000-0000-4000-8000-000000000101', 'Active', 'Approved', FALSE),
        ('Verify', 'TokenExpired', 'verify.token.expired@example.invalid', '00000000-0000-4000-8000-000000000102', 'Active', 'Approved', FALSE),
        ('Verify', 'TokenUsed', 'verify.token.used@example.invalid', '00000000-0000-4000-8000-000000000103', 'Active', 'Approved', FALSE),
        ('Verify', 'TokenBlocked', 'verify.token.blocked@example.invalid', '00000000-0000-4000-8000-000000000104', 'Active', 'Approved', TRUE),
        ('Verify', 'TokenInactive', 'verify.token.inactive@example.invalid', '00000000-0000-4000-8000-000000000105', 'Inactive', 'Approved', FALSE),
        ('Verify', 'TokenPending', 'verify.token.pending@example.invalid', '00000000-0000-4000-8000-000000000106', 'Active', 'Pending', FALSE),
        ('Verify', 'TokenRejected', 'verify.token.rejected@example.invalid', '00000000-0000-4000-8000-000000000107', 'Active', 'Rejected', FALSE)
    RETURNING id, email
)
INSERT INTO password_reset_test_users (case_name, user_id)
SELECT CASE
           WHEN email = 'verify.token.valid@example.invalid' THEN 'valid'
           WHEN email = 'verify.token.expired@example.invalid' THEN 'expired'
           WHEN email = 'verify.token.used@example.invalid' THEN 'used'
           WHEN email = 'verify.token.inactive@example.invalid' THEN 'inactive'
           WHEN email = 'verify.token.pending@example.invalid' THEN 'pending'
           WHEN email = 'verify.token.rejected@example.invalid' THEN 'rejected'
           ELSE 'blocked'
       END,
       id
FROM inserted_users;

INSERT INTO public.password_reset_token (
    user_id, token_hash, purpose, created_at, expires_at, used_at
)
SELECT test_user.user_id,
       decode(repeat(test_case.hash_byte, 32), 'hex'),
       test_case.purpose,
       CASE WHEN test_case.case_name = 'expired'
            THEN CURRENT_TIMESTAMP - INTERVAL '2 hours'
            ELSE CURRENT_TIMESTAMP END,
       CASE WHEN test_case.case_name = 'expired'
            THEN CURRENT_TIMESTAMP - INTERVAL '1 hour'
            ELSE CURRENT_TIMESTAMP + INTERVAL '1 hour' END,
       CASE WHEN test_case.case_name = 'used' THEN CURRENT_TIMESTAMP END
FROM (VALUES
    ('valid', '01', 'set_password'),
    ('expired', '02', 'reset_password'),
    ('used', '03', 'set_password'),
    ('blocked', '04', 'reset_password'),
    ('inactive', '05', 'reset_password'),
    ('pending', '06', 'reset_password'),
    ('rejected', '07', 'reset_password')
) AS test_case(case_name, hash_byte, purpose)
JOIN password_reset_test_users AS test_user USING (case_name);

CREATE TEMP TABLE password_reset_token_verification_result ON COMMIT DROP AS
WITH test_hashes(case_name, token_hash, purpose) AS (
    VALUES
        ('valid', decode(repeat('01', 32), 'hex'), 'set_password'),
        ('expired', decode(repeat('02', 32), 'hex'), 'reset_password'),
        ('used', decode(repeat('03', 32), 'hex'), 'set_password'),
        ('blocked', decode(repeat('04', 32), 'hex'), 'reset_password'),
        ('inactive', decode(repeat('05', 32), 'hex'), 'reset_password'),
        ('pending', decode(repeat('06', 32), 'hex'), 'reset_password'),
        ('rejected', decode(repeat('07', 32), 'hex'), 'reset_password')
)
SELECT test_hashes.case_name,
       EXISTS (
           SELECT 1
           FROM public.password_reset_token AS token
           JOIN public.app_user AS account ON account.id = token.user_id
           WHERE token.token_hash = test_hashes.token_hash
             AND token.purpose = test_hashes.purpose
             AND token.used_at IS NULL
             AND token.expires_at > CURRENT_TIMESTAMP
             AND token.status = 'Active'
             AND account.status = 'Active'
             AND account.approval_status = 'Approved'
             AND account.is_blocked = FALSE
       ) AS is_valid
FROM test_hashes;

SELECT case_name, is_valid,
       is_valid = (case_name = 'valid') AS passed
FROM password_reset_token_verification_result
ORDER BY case_name;

DO $$
DECLARE
    public_role TEXT;
    privilege_name TEXT;
BEGIN
    IF (
        SELECT COUNT(DISTINCT test_user.case_name)
        FROM password_reset_test_users AS test_user
        JOIN public.password_reset_token AS token ON token.user_id = test_user.user_id
        WHERE test_user.case_name IN ('inactive', 'pending', 'rejected')
    ) <> 3 OR (
        SELECT COUNT(*)
        FROM password_reset_token_verification_result
        WHERE case_name IN ('inactive', 'pending', 'rejected') AND is_valid = FALSE
    ) <> 3 THEN
        RAISE EXCEPTION 'Inactive, pending, and rejected account tokens must be present and invalid';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM password_reset_token_verification_result
        WHERE is_valid IS DISTINCT FROM (case_name = 'valid')
    ) THEN
        RAISE EXCEPTION 'Password reset token validity cases did not match expectations';
    END IF;

    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.password_reset_token'::regclass) THEN
        RAISE EXCEPTION 'RLS must be enabled for password_reset_token';
    END IF;

    FOREACH public_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        FOREACH privilege_name IN ARRAY ARRAY[
            'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
        ] LOOP
            IF has_table_privilege(public_role, 'public.password_reset_token', privilege_name) THEN
                RAISE EXCEPTION 'Public API role % has % on password_reset_token', public_role, privilege_name;
            END IF;
        END LOOP;
    END LOOP;

    FOREACH privilege_name IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] LOOP
        IF NOT has_table_privilege('service_role', 'public.password_reset_token', privilege_name) THEN
            RAISE EXCEPTION 'service_role requires % on password_reset_token', privilege_name;
        END IF;
    END LOOP;

    IF NOT has_sequence_privilege(
            'service_role',
            pg_get_serial_sequence('public.password_reset_token', 'id'),
            'USAGE'
        ) THEN
        RAISE EXCEPTION 'service_role must retain token identity-sequence access';
    END IF;
END;
$$;

ROLLBACK;