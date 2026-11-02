DO $$
DECLARE
    existing_users BIGINT;
BEGIN
    IF to_regclass('auth.users') IS NULL THEN
        RAISE EXCEPTION 'Supabase Auth schema auth.users is required before linking app_user';
    END IF;

    SELECT COUNT(*) INTO existing_users FROM public.app_user;
    IF existing_users <> 0 THEN
        RAISE EXCEPTION 'Cannot apply Supabase Auth profile migration: public.app_user must be empty; reconcile % existing rows with auth.users before retrying', existing_users;
    END IF;
END;
$$;

ALTER TABLE public.app_user
    ADD COLUMN auth_user_id UUID NOT NULL UNIQUE
        REFERENCES auth.users(id) ON DELETE RESTRICT,
    ADD COLUMN approval_status VARCHAR(12) NOT NULL DEFAULT 'Pending'
        CONSTRAINT app_user_approval_status_check
        CHECK (approval_status IN ('Pending', 'Approved', 'Rejected'));

ALTER TABLE public.app_user
    DROP CONSTRAINT IF EXISTS app_user_check,
    DROP COLUMN password_hash,
    DROP COLUMN must_set_password;

COMMENT ON TABLE public.app_user IS 'Application profile linked to Supabase Auth. Authentication credentials and password lifecycle are managed by auth.users.';
COMMENT ON COLUMN public.app_user.auth_user_id IS 'Required unique link to the Supabase Auth identity; app_user.id remains the application primary key.';
COMMENT ON COLUMN public.app_user.approval_status IS 'Application approval state, independent of Supabase authentication. The server must deny application access while Pending or Rejected.';
COMMENT ON COLUMN public.app_user.failed_login_count IS 'Application-level counter only; Supabase Auth remains responsible for credential validation and auth rate limiting.';
COMMENT ON COLUMN public.app_user.locked_until IS 'Optional application-level lockout time; Supabase Auth remains responsible for authentication.';