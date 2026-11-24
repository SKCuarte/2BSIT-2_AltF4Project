
-- Password setup spans PostgreSQL and Supabase Auth.
-- Reservations do not expire. An uncertain Auth request must be
-- investigated before a privileged operator removes its reservation.

CREATE TABLE public.password_setup_reservation (
    auth_user_id UUID PRIMARY KEY,
    reservation_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.password_setup_reservation
    ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.password_setup_reservation
    FROM PUBLIC, anon, authenticated, service_role;


CREATE FUNCTION public.reserve_password_setup(
    p_auth_user_id UUID,
    p_reservation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    eligible BOOLEAN;
BEGIN
    IF current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION 'Password setup reservation requires READ COMMITTED isolation';
    END IF;

    SELECT
        status = 'Active'
        AND approval_status = 'Approved'
        AND is_blocked = false
    INTO eligible
    FROM public.app_user
    WHERE auth_user_id = p_auth_user_id
    FOR UPDATE;

    IF eligible IS DISTINCT FROM true THEN
        RETURN false;
    END IF;

    INSERT INTO public.password_setup_reservation (
        auth_user_id,
        reservation_id
    )
    VALUES (
        p_auth_user_id,
        p_reservation_id
    )
    ON CONFLICT (auth_user_id) DO NOTHING;

    RETURN FOUND;
END;
$$;


CREATE FUNCTION public.release_password_setup(
    p_auth_user_id UUID,
    p_reservation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    DELETE FROM public.password_setup_reservation
    WHERE auth_user_id = p_auth_user_id
      AND reservation_id = p_reservation_id;

    RETURN FOUND;
END;
$$;


CREATE FUNCTION public.guard_password_setup_eligibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    -- TRUNCATE is a statement-level trigger and has no OLD or NEW row.
    IF TG_OP = 'TRUNCATE' THEN
        IF EXISTS (
            SELECT 1
            FROM public.password_setup_reservation
        ) THEN
            RAISE EXCEPTION
                'Password setup reservation prevents truncating app_user';
        END IF;

        RETURN NULL;
    END IF;

    IF TG_OP = 'UPDATE' THEN

        -- Unrelated profile changes do not affect password eligibility.
        IF NEW.auth_user_id IS NOT DISTINCT FROM OLD.auth_user_id
           AND NEW.status IS NOT DISTINCT FROM OLD.status
           AND NEW.approval_status IS NOT DISTINCT FROM OLD.approval_status
           AND NEW.is_blocked IS NOT DISTINCT FROM OLD.is_blocked
        THEN
            RETURN NEW;
        END IF;

        -- Protect both the old and new Auth identities.
        IF EXISTS (
            SELECT 1
            FROM public.password_setup_reservation AS reservation
            WHERE reservation.auth_user_id = OLD.auth_user_id
               OR reservation.auth_user_id = NEW.auth_user_id
        ) THEN
            RAISE EXCEPTION
                'Password setup reservation prevents changing account eligibility';
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF EXISTS (
            SELECT 1
            FROM public.password_setup_reservation AS reservation
            WHERE reservation.auth_user_id = OLD.auth_user_id
        ) THEN
            RAISE EXCEPTION
                'Password setup reservation prevents deleting the account';
        END IF;

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;


REVOKE ALL ON FUNCTION
    public.reserve_password_setup(UUID, UUID)
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
    public.release_password_setup(UUID, UUID)
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
    public.guard_password_setup_eligibility()
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
    public.reserve_password_setup(UUID, UUID)
    TO service_role;

GRANT EXECUTE ON FUNCTION
    public.release_password_setup(UUID, UUID)
    TO service_role;


CREATE TRIGGER trg_app_user_password_setup_eligibility
BEFORE UPDATE OR DELETE ON public.app_user
FOR EACH ROW
EXECUTE FUNCTION public.guard_password_setup_eligibility();


CREATE TRIGGER trg_app_user_password_setup_truncate
BEFORE TRUNCATE ON public.app_user
FOR EACH STATEMENT
EXECUTE FUNCTION public.guard_password_setup_eligibility();
