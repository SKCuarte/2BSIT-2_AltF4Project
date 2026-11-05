-- An eligible Superadmin is an Active, unblocked, Approved app_user whose role is the Active Superadmin role.
-- The guard raises restrict_violation (SQLSTATE 23001) when a change would leave none while one existed.
-- Triggers also fire for service_role, which bypasses RLS. Concurrent changes are serialized with a shared
-- transaction advisory lock; the count relies on READ COMMITTED snapshots (the PostgreSQL default).

CREATE OR REPLACE FUNCTION public.app_user_is_active_superadmin(account public.app_user)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT account.status = 'Active'
        AND NOT account.is_blocked
        AND account.approval_status = 'Approved'
        AND EXISTS (
            SELECT 1
            FROM public.role superadmin_role
            WHERE superadmin_role.id = account.role_id
              AND superadmin_role.name = 'Superadmin'
              AND superadmin_role.status = 'Active'
        );
$$;

CREATE OR REPLACE FUNCTION public.protect_last_active_superadmin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF TG_TABLE_NAME = 'app_user' THEN
        IF NOT public.app_user_is_active_superadmin(OLD) THEN
            RETURN NULL;
        END IF;
        IF TG_OP = 'UPDATE' AND public.app_user_is_active_superadmin(NEW) THEN
            RETURN NULL;
        END IF;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('public.protect_last_active_superadmin', 0));

    IF NOT EXISTS (
        SELECT 1
        FROM public.app_user account
        WHERE public.app_user_is_active_superadmin(account)
    ) THEN
        RAISE EXCEPTION 'At least one active, unblocked, approved Superadmin must remain'
            USING ERRCODE = 'restrict_violation',
                  HINT = 'Create or approve another Superadmin before demoting, blocking, disabling, rejecting, or deleting this one.';
    END IF;

    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_app_user_truncate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.app_user account
        WHERE public.app_user_is_active_superadmin(account)
    ) THEN
        RAISE EXCEPTION 'Cannot truncate app_user while an active Superadmin exists'
            USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.app_user_is_active_superadmin(public.app_user) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_last_active_superadmin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_app_user_truncate() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_app_user_protect_last_superadmin ON public.app_user;
CREATE TRIGGER trg_app_user_protect_last_superadmin
AFTER UPDATE OR DELETE ON public.app_user
FOR EACH ROW EXECUTE FUNCTION public.protect_last_active_superadmin();

DROP TRIGGER IF EXISTS trg_app_user_protect_truncate ON public.app_user;
CREATE TRIGGER trg_app_user_protect_truncate
BEFORE TRUNCATE ON public.app_user
FOR EACH STATEMENT EXECUTE FUNCTION public.protect_app_user_truncate();

DROP TRIGGER IF EXISTS trg_role_protect_last_superadmin ON public.role;
CREATE TRIGGER trg_role_protect_last_superadmin
AFTER UPDATE OF name, status ON public.role
FOR EACH ROW
WHEN (
    OLD.name = 'Superadmin'
    AND OLD.status = 'Active'
    AND (NEW.name IS DISTINCT FROM OLD.name OR NEW.status IS DISTINCT FROM OLD.status)
)
EXECUTE FUNCTION public.protect_last_active_superadmin();

COMMENT ON FUNCTION public.protect_last_active_superadmin() IS 'Rejects any change that would leave no active, unblocked, approved Superadmin. Serialized by an advisory transaction lock; applies to service_role.';
