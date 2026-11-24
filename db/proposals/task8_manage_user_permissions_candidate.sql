-- TASK 8: RIGHTS MANAGEMENT RPC
-- REVIEW-ONLY CANDIDATE.
-- Do NOT apply to Team Supabase without explicit approval.

CREATE OR REPLACE FUNCTION public.manage_user_permissions(
    p_actor_id UUID,
    p_target_user_id UUID,
    p_right_ids BIGINT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_actor public.app_user%ROWTYPE;
    v_target public.app_user%ROWTYPE;
    v_old public.user_permission%ROWTYPE;
    v_new public.user_permission%ROWTYPE;
    v_right_id BIGINT;
    v_changed_count INTEGER := 0;
BEGIN
    -- Validate request.
    IF p_actor_id IS NULL OR p_target_user_id IS NULL
       OR p_right_ids IS NULL
       OR cardinality(p_right_ids) > 36
    THEN
        RAISE EXCEPTION 'Invalid rights management request'
            USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM unnest(p_right_ids) AS selected(right_id)
        WHERE selected.right_id IS NULL
    ) OR (
        SELECT count(*) <> count(DISTINCT selected.right_id)
        FROM unnest(p_right_ids) AS selected(right_id)
    ) THEN
        RAISE EXCEPTION 'Invalid or duplicate right IDs'
            USING ERRCODE = '22023';
    END IF;

    -- Resolve and validate actor from the server-supplied app_user ID.
    SELECT *
    INTO v_actor
    FROM public.app_user
    WHERE id = p_actor_id
    FOR SHARE;

    IF NOT FOUND
       OR v_actor.status <> 'Active'
       OR v_actor.approval_status <> 'Approved'
       OR v_actor.is_blocked IS DISTINCT FROM FALSE
       OR v_actor.role NOT IN ('Admin', 'Superadmin')
    THEN
        RAISE EXCEPTION 'Actor is not authorized'
            USING ERRCODE = '42501';
    END IF;

    -- Lock target to serialize rights changes for this account.
    SELECT *
    INTO v_target
    FROM public.app_user
    WHERE id = p_target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target account not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_target.status <> 'Active'
       OR v_target.approval_status <> 'Approved'
       OR v_target.is_blocked IS DISTINCT FROM FALSE
    THEN
        RAISE EXCEPTION 'Target account is not eligible'
            USING ERRCODE = '42501';
    END IF;

    -- Approved role hierarchy.
    IF v_target.role = 'Superadmin'
       OR (v_actor.role = 'Admin' AND v_target.role <> 'User')
       OR (v_actor.role = 'Superadmin'
           AND v_target.role NOT IN ('User', 'Admin'))
    THEN
        RAISE EXCEPTION 'Actor cannot manage this target role'
            USING ERRCODE = '42501';
    END IF;

    -- Every selected right must exist in the active catalogue.
    IF EXISTS (
        SELECT 1
        FROM unnest(p_right_ids) AS selected(right_id)
        LEFT JOIN public.rights AS catalogue
          ON catalogue.id = selected.right_id
         AND catalogue.status = 'Active'
        WHERE catalogue.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Selection contains an unavailable right'
            USING ERRCODE = '22023';
    END IF;

    -- Existing audit helpers use app.current_user for the actor label.
    PERFORM pg_catalog.set_config(
        'app.current_user',
        v_actor.email,
        TRUE
    );

    -- Grant new rights or reactivate existing inactive assignments.
    FOREACH v_right_id IN ARRAY p_right_ids
    LOOP
        SELECT *
        INTO v_old
        FROM public.user_permission
        WHERE user_id = p_target_user_id
          AND right_id = v_right_id
        FOR UPDATE;

        IF FOUND THEN
            IF v_old.status = 'Inactive' THEN
                UPDATE public.user_permission
                SET status = 'Active',
                    granted_by = p_actor_id,
                    granted_at = CURRENT_TIMESTAMP,
                    stamp = public.audit_stamp('RESTORED')
                WHERE user_id = p_target_user_id
                  AND right_id = v_right_id
                RETURNING * INTO v_new;

                INSERT INTO public.audit_log (
                    table_name,
                    action,
                    record_key,
                    old_values,
                    new_values,
                    action_by
                )
                VALUES (
                    'user_permission',
                    'RESTORED',
                    p_target_user_id::TEXT || ':' || v_right_id::TEXT,
                    pg_catalog.to_jsonb(v_old),
                    pg_catalog.to_jsonb(v_new),
                    v_actor.email
                );

                v_changed_count := v_changed_count + 1;
            END IF;
        ELSE
            INSERT INTO public.user_permission (
                user_id,
                right_id,
                granted_by,
                granted_at,
                status,
                stamp
            )
            VALUES (
                p_target_user_id,
                v_right_id,
                p_actor_id,
                CURRENT_TIMESTAMP,
                'Active',
                public.audit_stamp('CREATED')
            )
            RETURNING * INTO v_new;

            INSERT INTO public.audit_log (
                table_name,
                action,
                record_key,
                old_values,
                new_values,
                action_by
            )
            VALUES (
                'user_permission',
                'CREATED',
                p_target_user_id::TEXT || ':' || v_right_id::TEXT,
                NULL,
                pg_catalog.to_jsonb(v_new),
                v_actor.email
            );

            v_changed_count := v_changed_count + 1;
        END IF;
    END LOOP;

    -- Revoke unchecked active rights using a soft status update.
    FOR v_old IN
        SELECT *
        FROM public.user_permission
        WHERE user_id = p_target_user_id
          AND status = 'Active'
          AND NOT (right_id = ANY(p_right_ids))
        FOR UPDATE
    LOOP
        UPDATE public.user_permission
        SET status = 'Inactive',
            stamp = public.audit_stamp('DELETED')
        WHERE user_id = p_target_user_id
          AND right_id = v_old.right_id
        RETURNING * INTO v_new;

        INSERT INTO public.audit_log (
            table_name,
            action,
            record_key,
            old_values,
            new_values,
            action_by
        )
        VALUES (
            'user_permission',
            'DELETED',
            p_target_user_id::TEXT || ':' || v_old.right_id::TEXT,
            pg_catalog.to_jsonb(v_old),
            pg_catalog.to_jsonb(v_new),
            v_actor.email
        );

        v_changed_count := v_changed_count + 1;
    END LOOP;

    RETURN v_changed_count;
END;
$function$;

-- Restrict RPC execution to the server-side service role.
REVOKE ALL ON FUNCTION public.manage_user_permissions(UUID, UUID, BIGINT[])
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.manage_user_permissions(UUID, UUID, BIGINT[])
    TO service_role;

-- End of review-only candidate.

