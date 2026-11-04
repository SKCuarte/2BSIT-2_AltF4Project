-- Run with: psql -v ON_ERROR_STOP=1 -f db/verification/audit_user_verification.sql
-- Disposable test database only (inserts into the auth.users stub). Every case is rolled back,
-- so no data or audit rows remain. Run as the migration owner, with service_role present.
\set ON_ERROR_STOP on
\echo Audit verification

-- Cases 1-3: CREATED, EDITED, DELETED, RESTORED with the logged-in user and a matching stamp.
BEGIN;
SELECT set_config('app.current_user', 'lisa@hope.com', true);
INSERT INTO public.module (code, name, sort_order) VALUES ('ZZAUDIT', 'Audit Probe', 9001);
SELECT EXISTS (
    SELECT 1
    FROM public.audit_log l
    JOIN public.module m ON l.record_key = m.id::TEXT
    WHERE l.table_name = 'module' AND m.code = 'ZZAUDIT'
      AND l.action = 'CREATED' AND l.app_user = 'lisa@hope.com'
      AND l.db_user = session_user::TEXT
      AND m.stamp = 'CREATED lisa@hope.com '
          || to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD FMHH12:MI AM')
) AS pass \gset t1_

SELECT set_config('app.current_user', 'raj@hope.com', true);
UPDATE public.module SET name = 'Audit Probe 2' WHERE code = 'ZZAUDIT';
SELECT EXISTS (
    SELECT 1
    FROM public.audit_log l
    JOIN public.module m ON l.record_key = m.id::TEXT
    WHERE l.table_name = 'module' AND m.code = 'ZZAUDIT'
      AND l.action = 'EDITED' AND l.app_user = 'raj@hope.com'
      AND m.stamp LIKE 'EDITED raj@hope.com %'
) AS pass \gset t2_

UPDATE public.module SET status = 'Inactive' WHERE code = 'ZZAUDIT';
SELECT EXISTS (
    SELECT 1
    FROM public.audit_log l
    JOIN public.module m ON l.record_key = m.id::TEXT
    WHERE l.table_name = 'module' AND m.code = 'ZZAUDIT'
      AND l.action = 'DELETED' AND l.app_user = 'raj@hope.com'
      AND l.old_values ->> 'status' = 'Active' AND l.new_values ->> 'status' = 'Inactive'
      AND m.stamp LIKE 'DELETED raj@hope.com %'
) AS pass \gset t3a_

UPDATE public.module SET status = 'Active' WHERE code = 'ZZAUDIT';
SELECT EXISTS (
    SELECT 1
    FROM public.audit_log l
    JOIN public.module m ON l.record_key = m.id::TEXT
    WHERE l.table_name = 'module' AND m.code = 'ZZAUDIT'
      AND l.action = 'RESTORED' AND l.app_user = 'raj@hope.com'
      AND l.old_values ->> 'status' = 'Inactive' AND l.new_values ->> 'status' = 'Active'
      AND m.stamp LIKE 'RESTORED raj@hope.com %'
) AS pass \gset t3b_
ROLLBACK;

-- Case 4: no user set (or blank) records system and the write still succeeds.
BEGIN;
INSERT INTO public.module (code, name, sort_order) VALUES ('ZZNOUSER', 'No User Probe', 9002);
SELECT EXISTS (
    SELECT 1
    FROM public.audit_log l
    JOIN public.module m ON l.record_key = m.id::TEXT
    WHERE l.table_name = 'module' AND m.code = 'ZZNOUSER'
      AND l.action = 'CREATED' AND l.app_user = 'system'
      AND m.stamp LIKE 'CREATED system %'
) AS pass \gset t4a_

SELECT set_config('app.current_user', '   ', true);
INSERT INTO public.module (code, name, sort_order) VALUES ('ZZBLANK', 'Blank User Probe', 9003);
SELECT EXISTS (
    SELECT 1
    FROM public.audit_log l
    JOIN public.module m ON l.record_key = m.id::TEXT
    WHERE l.table_name = 'module' AND m.code = 'ZZBLANK' AND l.app_user = 'system'
) AS pass \gset t4b_
ROLLBACK;

-- Case 5: a user set in a committed transaction is not inherited by the next transaction.
BEGIN;
SELECT set_config('app.current_user', 'leaky@hope.com', true);
COMMIT;
BEGIN;
SELECT public.audit_user() = 'system' AS pass_a \gset t5_
INSERT INTO public.module (code, name, sort_order) VALUES ('ZZLEAK', 'Leak Probe', 9004);
SELECT EXISTS (
    SELECT 1
    FROM public.audit_log l
    JOIN public.module m ON l.record_key = m.id::TEXT
    WHERE l.table_name = 'module' AND m.code = 'ZZLEAK' AND l.app_user = 'system'
) AS pass_b \gset t5_
ROLLBACK;

-- Case 6: two separate connections each record their own user.
SELECT pg_backend_pid() AS pid \gset s1_
BEGIN;
SELECT set_config('app.current_user', 'alice@hope.com', true);
INSERT INTO public.module (code, name, sort_order) VALUES ('ZZSESSION1', 'Session 1 Probe', 9005);
SELECT EXISTS (
    SELECT 1
    FROM public.audit_log l
    JOIN public.module m ON l.record_key = m.id::TEXT
    WHERE l.table_name = 'module' AND m.code = 'ZZSESSION1' AND l.app_user = 'alice@hope.com'
) AS pass \gset t6a_
ROLLBACK;

\connect
SELECT pg_backend_pid() AS pid \gset s2_
BEGIN;
SELECT set_config('app.current_user', 'bob@hope.com', true);
INSERT INTO public.module (code, name, sort_order) VALUES ('ZZSESSION2', 'Session 2 Probe', 9006);
SELECT EXISTS (
    SELECT 1
    FROM public.audit_log l
    JOIN public.module m ON l.record_key = m.id::TEXT
    WHERE l.table_name = 'module' AND m.code = 'ZZSESSION2' AND l.app_user = 'bob@hope.com'
) AS pass \gset t6b_
ROLLBACK;
SELECT :s1_pid <> :s2_pid AS pass \gset t6c_

-- Case 7: permission tick/untick are audited; hash columns never reach audit_log.
BEGIN;
INSERT INTO auth.users (id) VALUES
    ('00000000-0000-4000-8000-0000000000a1'),
    ('00000000-0000-4000-8000-0000000000a2');
INSERT INTO public.app_user (first_name, last_name, email, role_id, auth_user_id, approval_status)
SELECT 'Audit', 'Admin', 'audit.admin@hope.invalid', r.id, '00000000-0000-4000-8000-0000000000a1', 'Approved'
FROM public.role r WHERE r.name = 'Admin';
INSERT INTO public.app_user (first_name, last_name, email, auth_user_id)
VALUES ('Audit', 'Target', 'audit.target@hope.invalid', '00000000-0000-4000-8000-0000000000a2');
SELECT set_config('app.user_id', (SELECT id::TEXT FROM public.app_user WHERE email = 'audit.admin@hope.invalid'), true);
SELECT set_config('app.current_user', 'audit.admin@hope.invalid', true);
INSERT INTO public.user_permission (user_id, right_id, granted_by)
SELECT tgt.id, right_row.id, adm.id
FROM public.app_user tgt, public.app_user adm, public.rights right_row
WHERE tgt.email = 'audit.target@hope.invalid'
  AND adm.email = 'audit.admin@hope.invalid'
  AND right_row.code = 'CUSTOMER_ADD';
UPDATE public.user_permission SET status = 'Inactive'
WHERE user_id = (SELECT id FROM public.app_user WHERE email = 'audit.target@hope.invalid');
UPDATE public.user_permission SET status = 'Active'
WHERE user_id = (SELECT id FROM public.app_user WHERE email = 'audit.target@hope.invalid');
SELECT (
    SELECT array_agg(l.action::TEXT ORDER BY l.id)
    FROM public.audit_log l
    WHERE l.table_name = 'user_permission' AND l.app_user = 'audit.admin@hope.invalid'
) = ARRAY['CREATED', 'DELETED', 'RESTORED']::TEXT[] AS pass \gset t7a_

INSERT INTO public.password_reset_token (user_id, token_hash, purpose, expires_at)
SELECT id, decode(repeat('ab', 32), 'hex'), 'set_password', CURRENT_TIMESTAMP + INTERVAL '1 hour'
FROM public.app_user WHERE email = 'audit.target@hope.invalid';
CREATE TABLE public.zz_audit_probe (
    id INTEGER PRIMARY KEY,
    status VARCHAR(8) NOT NULL DEFAULT 'Active',
    stamp VARCHAR(80) NOT NULL DEFAULT '',
    password_hash TEXT,
    token_hash BYTEA
);
SELECT public.enable_audit('public.zz_audit_probe'::REGCLASS);
INSERT INTO public.zz_audit_probe (id, password_hash, token_hash)
VALUES (1, 'zz-secret-hash-value', decode('abababab', 'hex'));
UPDATE public.zz_audit_probe SET password_hash = 'zz-secret-hash-value-2' WHERE id = 1;
SELECT (
    EXISTS (SELECT 1 FROM public.audit_log WHERE table_name = 'zz_audit_probe' AND action = 'CREATED')
    AND EXISTS (SELECT 1 FROM public.audit_log WHERE table_name = 'password_reset_token' AND action = 'CREATED')
    AND NOT EXISTS (
        SELECT 1 FROM public.audit_log l
        WHERE l.old_values ?| ARRAY['password_hash', 'token_hash', 'encrypted_password']
           OR l.new_values ?| ARRAY['password_hash', 'token_hash', 'encrypted_password']
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.audit_log l
        WHERE l.old_values::TEXT LIKE '%zz-secret-hash%'
           OR l.new_values::TEXT LIKE '%zz-secret-hash%'
           OR l.new_values::TEXT LIKE '%abababab%'
    )
) AS pass \gset t7b_
ROLLBACK;

-- Case 8: audit_log cannot be updated, deleted, or truncated.
BEGIN;
SELECT set_config('app.current_user', 'tamper.test@hope.com', true);
INSERT INTO public.module (code, name, sort_order) VALUES ('ZZAPPEND', 'Append Probe', 9007);
DO $$
DECLARE
    v_role_update BOOLEAN := FALSE;
    v_role_delete BOOLEAN := FALSE;
    v_trigger_update BOOLEAN := FALSE;
    v_trigger_delete BOOLEAN := FALSE;
    v_trigger_truncate BOOLEAN := FALSE;
BEGIN
    BEGIN
        SET LOCAL ROLE service_role;
        UPDATE public.audit_log SET app_user = 'tampered' WHERE table_name = 'module';
    EXCEPTION WHEN insufficient_privilege THEN
        v_role_update := TRUE;
    END;
    RESET ROLE;
    BEGIN
        SET LOCAL ROLE service_role;
        DELETE FROM public.audit_log WHERE table_name = 'module';
    EXCEPTION WHEN insufficient_privilege THEN
        v_role_delete := TRUE;
    END;
    RESET ROLE;
    BEGIN
        UPDATE public.audit_log SET app_user = 'tampered' WHERE table_name = 'module';
    EXCEPTION WHEN raise_exception THEN
        v_trigger_update := TRUE;
    END;
    BEGIN
        DELETE FROM public.audit_log WHERE table_name = 'module';
    EXCEPTION WHEN raise_exception THEN
        v_trigger_delete := TRUE;
    END;
    BEGIN
        TRUNCATE public.audit_log;
    EXCEPTION WHEN raise_exception THEN
        v_trigger_truncate := TRUE;
    END;
    PERFORM set_config(
        'audit_test.t8',
        (v_role_update AND v_role_delete AND v_trigger_update AND v_trigger_delete AND v_trigger_truncate)::TEXT,
        true
    );
END;
$$;
SELECT current_setting('audit_test.t8')::BOOLEAN AS pass \gset t8_
ROLLBACK;

-- Case 9: a rolled-back write leaves no audit row.
BEGIN;
SELECT set_config('app.current_user', 'rollback.user@hope.com', true);
INSERT INTO public.module (code, name, sort_order) VALUES ('ZZROLLBACK', 'Rollback Probe', 9008);
ROLLBACK;
SELECT (
    NOT EXISTS (SELECT 1 FROM public.audit_log WHERE app_user = 'rollback.user@hope.com')
    AND NOT EXISTS (SELECT 1 FROM public.module WHERE code = 'ZZROLLBACK')
) AS pass \gset t9_

SELECT n AS "#", name AS "case", CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result
FROM (VALUES
    (1, 'INSERT gives CREATED, the logged-in user, and a matching stamp', :'t1_pass'::BOOLEAN),
    (2, 'UPDATE by a second user gives EDITED with that user', :'t2_pass'::BOOLEAN),
    (3, 'Soft delete gives DELETED; reactivation gives RESTORED', (:'t3a_pass'::BOOLEAN AND :'t3b_pass'::BOOLEAN)),
    (4, 'No or blank user gives system and the write succeeds', (:'t4a_pass'::BOOLEAN AND :'t4b_pass'::BOOLEAN)),
    (5, 'Next transaction does not inherit the previous user', (:'t5_pass_a'::BOOLEAN AND :'t5_pass_b'::BOOLEAN)),
    (6, 'Two sessions record their own users', (:'t6a_pass'::BOOLEAN AND :'t6b_pass'::BOOLEAN AND :'t6c_pass'::BOOLEAN)),
    (7, 'Permission tick/untick audited; no hash columns in audit_log', (:'t7a_pass'::BOOLEAN AND :'t7b_pass'::BOOLEAN)),
    (8, 'UPDATE, DELETE, and TRUNCATE on audit_log are blocked', :'t8_pass'::BOOLEAN),
    (9, 'A rollback leaves no audit row', :'t9_pass'::BOOLEAN)
) AS r(n, name, passed)
ORDER BY n;

SELECT (
    :'t1_pass'::BOOLEAN AND :'t2_pass'::BOOLEAN AND :'t3a_pass'::BOOLEAN AND :'t3b_pass'::BOOLEAN
    AND :'t4a_pass'::BOOLEAN AND :'t4b_pass'::BOOLEAN AND :'t5_pass_a'::BOOLEAN AND :'t5_pass_b'::BOOLEAN
    AND :'t6a_pass'::BOOLEAN AND :'t6b_pass'::BOOLEAN AND :'t6c_pass'::BOOLEAN
    AND :'t7a_pass'::BOOLEAN AND :'t7b_pass'::BOOLEAN AND :'t8_pass'::BOOLEAN AND :'t9_pass'::BOOLEAN
) AS all_ok \gset

\if :all_ok
    \echo All audit cases passed.
\else
    \echo One or more audit cases FAILED.
    DO $$ BEGIN RAISE EXCEPTION 'Audit verification failed'; END $$;
\endif
