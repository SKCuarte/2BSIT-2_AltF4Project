CREATE OR REPLACE VIEW public.v_user_effective_rights AS
SELECT account.id AS user_id,
       account.email AS user_email,
       account.is_blocked,
       module.code AS module_code,
       module.name AS module_name,
       permission_right.code AS right_code,
       CASE
           WHEN account.approval_status <> 'Approved' THEN FALSE
           WHEN account_role.name = 'Superadmin' THEN TRUE
           ELSE COALESCE(user_permission.status = 'Active', FALSE)
       END AS granted,
       account.approval_status
FROM public.app_user account
JOIN public.role account_role
    ON account_role.id = account.role_id AND account_role.status = 'Active'
CROSS JOIN public.module module
JOIN public.rights permission_right
    ON permission_right.module_id = module.id AND permission_right.status = 'Active'
LEFT JOIN public.user_permission
    ON user_permission.user_id = account.id
   AND user_permission.right_id = permission_right.id
WHERE account.status = 'Active' AND module.status = 'Active';

COMMENT ON VIEW public.v_user_effective_rights IS 'Query after Supabase authentication. granted is false until application approval is Approved; is_blocked remains a separate sign-in gate and does not revoke permission rows.';