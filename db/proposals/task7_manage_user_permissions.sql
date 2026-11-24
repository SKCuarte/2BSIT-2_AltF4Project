-- TASK 7: SAVE USER RIGHTS
-- REVIEW-ONLY PROPOSAL. Do not apply without approval.

CREATE OR REPLACE FUNCTION public.manage_user_permissions(
    p_actor_id BIGINT,
    p_target_user_id BIGINT,
    p_right_ids BIGINT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_actor_role TEXT;
    v_target_role TEXT;
    v_rows INTEGER := 0;
    v_changed_count INTEGER := 0;
BEGIN
    -- 1. Validate request.
    IF p_actor_id IS NULL
       OR p_actor_id <= 0
       OR p_target_user_id IS NULL
       OR p_target_user_id <= 0
       OR p_right_ids IS NULL
       OR cardinality(p_right_ids) > 36
       OR (
           array_ndims(p_right_ids) IS NOT NULL
           AND array_ndims(p_right_ids) <> 1
       )
    THEN
        RAISE EXCEPTION 'Invalid rights management request'
            USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM unnest(p_right_ids) AS selected(right_id)
        WHERE selected.right_id IS NULL
           OR selected.right_id <= 0
    ) OR (
        SELECT COUNT(*) <> COUNT(DISTINCT selected.right_id)
        FROM unnest(p_right_ids) AS selected(right_id)
    ) THEN
        RAISE EXCEPTION 'Invalid or duplicate right IDs'
            USING ERRCODE = '22023';
    END IF;

    -- 2. Validate actor.
    SELECT actor_role.name
    INTO v_actor_role
    FROM public.app_user AS account
    JOIN public.role AS actor_role
      ON actor_role.id = account.role_id
    WHERE account.id = p_actor_id
      AND account.status = 'Active'
      AND account.approval_status = 'Approved'
      AND account.is_blocked IS FALSE
      AND actor_role.status = 'Active'
      AND actor_role.name IN ('Admin', 'Superadmin')
    FOR SHARE OF account, actor_role;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Actor is not authorized'
            USING ERRCODE = '42501';
    END IF;

    -- 3. Lock target account to serialize rights changes.
    SELECT target_role.name
    INTO v_target_role
    FROM public.app_user AS account
    JOIN public.role AS target_role
      ON target_role.id = account.role_id
    WHERE account.id = p_target_user_id
      AND target_role.status = 'Active'
    FOR UPDATE OF account;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target account or active role not found'
            USING ERRCODE = 'P0002';
    END IF;

    -- 4. Enforce role hierarchy.
    IF v_target_role = 'Superadmin'
       OR (
           v_actor_role = 'Admin'
           AND v_target_role <> 'User'
       )
       OR (
           v_actor_role = 'Superadmin'
           AND v_target_role NOT IN ('User', 'Admin')
       )
    THEN
        RAISE EXCEPTION 'Actor cannot manage this target role'
            USING ERRCODE = '42501';
    END IF;

    -- 5. Every selected right and its module must be active.
    IF EXISTS (
        SELECT 1
        FROM unnest(p_right_ids) AS selected(right_id)
        LEFT JOIN public.rights AS r
          ON r.id = selected.right_id
         AND r.status = 'Active'
        LEFT JOIN public.module AS m
          ON m.id = r.module_id
         AND m.status = 'Active'
        WHERE r.id IS NULL
           OR m.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Selection contains an inactive or unavailable right'
            USING ERRCODE = '22023';
    END IF;

    -- 6. Set actor context required by the existing permission trigger.
    PERFORM pg_catalog.set_config(
        'app.user_id',
        p_actor_id::TEXT,
        TRUE
    );

    -- 7. Revoke unchecked assignments only when their right and module
    -- are still active. Do not revoke hidden/inactive catalogue entries.
    UPDATE public.user_permission AS permission
    SET status = 'Inactive'
    WHERE permission.user_id = p_target_user_id
      AND permission.status = 'Active'
      AND NOT (permission.right_id = ANY (p_right_ids))
      AND EXISTS (
          SELECT 1
          FROM public.rights AS r
          JOIN public.module AS m
            ON m.id = r.module_id
          WHERE r.id = permission.right_id
            AND r.status = 'Active'
            AND m.status = 'Active'
      );

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_changed_count := v_changed_count + v_rows;

    -- 8. Restore previously inactive selected assignments,
    -- but only if their right and module are still active.
    UPDATE public.user_permission AS permission
    SET status = 'Active'
    WHERE permission.user_id = p_target_user_id
      AND permission.status = 'Inactive'
      AND permission.right_id = ANY (p_right_ids)
      AND EXISTS (
          SELECT 1
          FROM public.rights AS r
          JOIN public.module AS m
            ON m.id = r.module_id
          WHERE r.id = permission.right_id
            AND r.status = 'Active'
            AND m.status = 'Active'
      );

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_changed_count := v_changed_count + v_rows;

    -- 9. Insert selected assignments that do not yet exist.
    -- The existing BEFORE trigger supplies grant audit fields.
    INSERT INTO public.user_permission (
        user_id,
        right_id,
        status
    )
    SELECT
        p_target_user_id,
        selected.right_id,
        'Active'
    FROM unnest(p_right_ids) AS selected(right_id)
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.user_permission AS existing
        WHERE existing.user_id = p_target_user_id
          AND existing.right_id = selected.right_id
    );

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_changed_count := v_changed_count + v_rows;

    RETURN v_changed_count;
END;
$function$;

-- Allow execution only through the server-side service role.
REVOKE ALL ON FUNCTION public.manage_user_permissions(BIGINT, BIGINT, BIGINT[])
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.manage_user_permissions(BIGINT, BIGINT, BIGINT[])
    TO service_role;

-- End of Task 7 review proposal.