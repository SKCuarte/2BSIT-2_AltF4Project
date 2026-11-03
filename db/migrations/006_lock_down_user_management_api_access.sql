DO $$
BEGIN
    IF to_regrole('anon') IS NULL
        OR to_regrole('authenticated') IS NULL
        OR to_regrole('service_role') IS NULL THEN
        RAISE EXCEPTION 'Supabase anon, authenticated, and service_role roles are required';
    END IF;
END;
$$;

ALTER TABLE public.app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.app_user, public.user_permission
    FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.app_user, public.user_permission TO service_role;

DO $$
DECLARE
    app_user_sequence TEXT;
BEGIN
    app_user_sequence := pg_get_serial_sequence('public.app_user', 'id');
    IF app_user_sequence IS NULL THEN
        RAISE EXCEPTION 'The app_user identity sequence is required';
    END IF;

    EXECUTE format(
        'REVOKE ALL PRIVILEGES ON SEQUENCE %s FROM PUBLIC, anon, authenticated',
        app_user_sequence
    );
    EXECUTE format(
        'GRANT USAGE, SELECT ON SEQUENCE %s TO service_role',
        app_user_sequence
    );
END;
$$;

COMMENT ON TABLE public.app_user IS 'Direct API access is disabled. Use server-side Supabase Auth routes with the secret key.';
COMMENT ON TABLE public.user_permission IS 'Direct API access is disabled. Permission changes must pass through authorized server code.';