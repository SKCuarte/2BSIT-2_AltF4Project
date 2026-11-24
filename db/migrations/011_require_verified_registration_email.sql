
-- Require verified ownership of the registration email before approval.
-- Existing pending registrations are deliberately not backfilled.

ALTER TABLE public.app_user
    ADD COLUMN email_verified_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.enforce_registration_email_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    verified_identity BOOLEAN := FALSE;
    must_validate_approval BOOLEAN := FALSE;
BEGIN
    -- Changing the account identity invalidates its previous verification.
    IF TG_OP = 'UPDATE'
       AND (
           NEW.email IS DISTINCT FROM OLD.email
           OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
       )
    THEN
        NEW.email_verified_at := NULL;
    END IF;

    -- Verify the Auth identity whenever a verification timestamp is supplied.
    IF NEW.email_verified_at IS NOT NULL
       OR NEW.approval_status = 'Approved'
    THEN
        SELECT EXISTS (
            SELECT 1
            FROM auth.users AS auth_user
            WHERE auth_user.id = NEW.auth_user_id
              AND auth_user.email_confirmed_at IS NOT NULL
              AND lower(auth_user.email) = lower(NEW.email)
        )
        INTO verified_identity;
    END IF;

    -- A verification timestamp must never be accepted for an unverified
    -- or mismatched Auth identity.
    IF NEW.email_verified_at IS NOT NULL
       AND verified_identity IS NOT TRUE
    THEN
        RAISE EXCEPTION 'Registration email verification is invalid'
            USING ERRCODE = 'check_violation';
    END IF;

    -- Validate new Approved records and changes that affect an existing
    -- Approved record's identity or verification state.
    IF TG_OP = 'INSERT' THEN
        must_validate_approval := NEW.approval_status = 'Approved';
    ELSIF TG_OP = 'UPDATE' THEN
        must_validate_approval :=
            NEW.approval_status = 'Approved'
            AND (
                OLD.approval_status IS DISTINCT FROM 'Approved'
                OR OLD.email IS DISTINCT FROM NEW.email
                OR OLD.auth_user_id IS DISTINCT FROM NEW.auth_user_id
                OR OLD.email_verified_at IS DISTINCT FROM NEW.email_verified_at
            );
    END IF;

    IF must_validate_approval THEN
        IF NEW.email_verified_at IS NULL
           OR verified_identity IS NOT TRUE
        THEN
            RAISE EXCEPTION 'Registration email must be verified before approval'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_registration_email_verification()
    FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_app_user_verified_registration_email
    ON public.app_user;

CREATE TRIGGER trg_app_user_verified_registration_email
BEFORE INSERT OR UPDATE ON public.app_user
FOR EACH ROW
EXECUTE FUNCTION public.enforce_registration_email_verification();
