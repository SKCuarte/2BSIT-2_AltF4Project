INSERT INTO public.role (name, description)
VALUES
    ('Superadmin', 'All active rights are implicit; no user_permission rows are required.'),
    ('Admin', 'May manage users and grant permissions.'),
    ('User', 'Receives only explicitly granted permissions.')
ON CONFLICT (name) DO NOTHING;
