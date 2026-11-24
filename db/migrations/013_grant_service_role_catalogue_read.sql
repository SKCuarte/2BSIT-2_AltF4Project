BEGIN;

GRANT SELECT ON TABLE
    public.role,
    public.module,
    public.rights
TO service_role;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLE
    public.role,
    public.module,
    public.rights
FROM service_role;

REVOKE ALL ON TABLE
    public.role,
    public.module,
    public.rights
FROM anon, authenticated;

COMMIT;