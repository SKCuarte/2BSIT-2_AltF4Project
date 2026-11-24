-- Task 7: Rights Management - Save Rights RPC
-- Team Supabase version
-- Target environment: Team Supabase
-- Review-only proposal. Do not apply until approved.

CREATE OR REPLACE FUNCTION public.manage_user_permissions(
    p_actor_id UUID,
    p_target_user_id UUID,
    p_right_ids BIGINT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_actor_role TEXT;
    v_target_role TEXT;
    v_valid_count BIGINT;
    v_unique_count BIGINT;
    v_changed_count BIGINT := 0;
    v_rows BIGINT;
BEGIN
    -- 1. Validate required IDs and selection.
    IF p_actor_id IS NULL
       OR p_target_user_id IS NULL
       OR p_right_ids IS NULL THEN
        RAISE EXCEPTION 'Invalid permission request'
            USING ERRCODE = '22023';
    END IF;

    IF cardinality(p_right_ids) > 36
       OR array_ndims(p_right_ids) > 1 THEN
        RAISE EXCEPTION 'Invalid permission selection size'
            USING ERRCODE = '22023';
    END IF;

    IF array_position(p_right_ids, NULL::BIGINT) IS NOT NULL THEN
        RAISE EXCEPTION 'Permission IDs cannot contain NULL'
            USING ERRCODE = '22023';
    END IF;

    SELECT
        COUNT(*),
        COUNT(DISTINCT requested.right_id)
    INTO v_valid_count, v_unique_count
    FROM unnest(p_right_ids) AS requested(right_id);

    IF v_valid_count <> v_unique_count THEN
        RAISE EXCEPTION 'Duplicate permission IDs are not allowed'
            USING ERRCODE = '22023';
    END IF;

    -- 2. Verify the actor independently of the application route.
    SELECT r.name
    INTO v_actor_role
    FROM public.app_user AS account
    JOIN public.role AS r
      ON r.id = account.role_id
    WHERE account.id = p_actor_id
      AND account.status = 'Active'
      AND account.approval_status = 'Approved'
      AND account.is_blocked = FALSE
      AND r.status = 'Active';

    IF NOT FOUND OR v_actor_role NOT IN ('Admin', 'Superadmin') THEN
        RAISE EXCEPTION
            'Only an active, approved, unblocked Admin or Superadmin may manage permissions'
            USING ERRCODE = '42501';
    END IF;

    -- 3. Verify and lock the target account.
    SELECT r.name
    INTO v_target_role
    FROM public.app_user AS account
    JOIN public.role AS r
      ON r.id = account.role_id
    WHERE account.id = p_target_user_id
      AND r.status = 'Active'
    FOR UPDATE OF account;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user or active role was not found'
            USING ERRCODE = 'P0002';
    END IF;

    -- 4. Enforce role-management policy.
    IF v_target_role = 'Superadmin' THEN
        RAISE EXCEPTION 'Superadmin permissions are protected'
            USING ERRCODE = '42501';
    END IF;

    IF NOT (
        (v_actor_role = 'Admin' AND v_target_role = 'User')
        OR
        (v_actor_role = 'Superadmin'
            AND v_target_role IN ('User', 'Admin'))
    ) THEN
        RAISE EXCEPTION
            'Actor is not allowed to manage this target role'
            USING ERRCODE = '42501';
    END IF;

    -- 5. Validate selected rights and their modules.
    SELECT COUNT(*)
    INTO v_valid_count
    FROM unnest(p_right_ids) AS requested(right_id)
    JOIN public.rights AS r
      ON r.id = requested.right_id
     AND r.status = 'Active'
    JOIN public.module AS m
      ON m.id = r.module_id
     AND m.status = 'Active';

    IF v_valid_count <> cardinality(p_right_ids) THEN
        RAISE EXCEPTION
            'Selection contains an invalid or inactive right'
            USING ERRCODE = '22023';
    END IF;

    -- 6. Deactivate unchecked active permissions.
    -- Physical DELETE is never used.
    UPDATE public.user_permission AS permission
    SET status = 'Inactive'
    WHERE permission.user_id = p_target_user_id
      AND permission.status = 'Active'
      AND EXISTS (
          SELECT 1
          FROM public.rights AS r
          JOIN public.module AS m
            ON m.id = r.module_id
          WHERE r.id = permission.right_id
            AND r.status = 'Active'
            AND m.status = 'Active'
      )
      AND NOT (
          permission.right_id = ANY (p_right_ids)
      );

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_changed_count := v_changed_count + v_rows;

    -- 7. Restore selected inactive permissions.
    -- Record the actor and time of the new grant.
    UPDATE public.user_permission AS permission
    SET
        status = 'Active',
        granted_by = p_actor_id,
        granted_at = CURRENT_TIMESTAMP
    WHERE permission.user_id = p_target_user_id
      AND permission.status = 'Inactive'
      AND permission.right_id = ANY (p_right_ids);

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_changed_count := v_changed_count + v_rows;

    -- 8. Insert selected permissions that do not exist.
    -- Team's stamp DEFAULT supplies the initial stamp value.
    INSERT INTO public.user_permission (
        user_id,
        right_id,
        granted_by,
        granted_at,
        status
    )
    SELECT
        p_target_user_id,
        requested.right_id,
        p_actor_id,
        CURRENT_TIMESTAMP,
        'Active'
    FROM unnest(p_right_ids) AS requested(right_id)
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.user_permission AS existing
        WHERE existing.user_id = p_target_user_id
          AND existing.right_id = requested.right_id
    );

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_changed_count := v_changed_count + v_rows;

    RETURN v_changed_count;
END;
$$;

-- 9. Restrict execution to the server-side service role.
REVOKE ALL ON FUNCTION public.manage_user_permissions(
    UUID, UUID, BIGINT[]
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.manage_user_permissions(
    UUID, UUID, BIGINT[]
) TO service_role;