DO $$
BEGIN
    IF to_regrole('anon') IS NULL
        OR to_regrole('authenticated') IS NULL
        OR to_regrole('service_role') IS NULL THEN
        RAISE EXCEPTION 'Supabase anon, authenticated, and service_role roles are required';
    END IF;
END;
$$;

CREATE TABLE public.audit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_key TEXT NOT NULL,
    action VARCHAR(8) NOT NULL CHECK (action IN ('CREATED', 'EDITED', 'DELETED', 'RESTORED')),
    app_user TEXT NOT NULL,
    db_user TEXT NOT NULL DEFAULT session_user::TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    old_values JSONB,
    new_values JSONB
);

CREATE INDEX idx_audit_log_table_record ON public.audit_log (table_name, record_key, occurred_at DESC);
CREATE INDEX idx_audit_log_app_user ON public.audit_log (app_user, occurred_at DESC);

COMMENT ON TABLE public.audit_log IS 'Append-only change history. app_user is the logged-in application user; db_user is the connection user kept for forensics.';
COMMENT ON COLUMN public.audit_log.app_user IS 'Value of app.current_user for the transaction, or system when unset.';
COMMENT ON COLUMN public.audit_log.old_values IS 'Row before the change. password_hash, token_hash, and encrypted_password are never stored.';

CREATE FUNCTION public.audit_user()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
    SELECT COALESCE(NULLIF(btrim(current_setting('app.current_user', TRUE)), ''), 'system')
$$;

CREATE FUNCTION public.audit_action(op TEXT, old_status TEXT, new_status TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
    SELECT CASE
        WHEN op = 'INSERT' THEN 'CREATED'
        WHEN op = 'DELETE' THEN 'DELETED'
        WHEN old_status = 'Active' AND new_status = 'Inactive' THEN 'DELETED'
        WHEN old_status = 'Inactive' AND new_status = 'Active' THEN 'RESTORED'
        ELSE 'EDITED'
    END
$$;

CREATE FUNCTION public.audit_stamp_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_action TEXT;
    v_prefix TEXT;
    v_suffix TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        v_action := public.audit_action('UPDATE', OLD.status, NEW.status);
    ELSE
        v_action := 'CREATED';
    END IF;

    v_prefix := v_action || ' ';
    v_suffix := ' ' || to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD FMHH12:MI AM');
    NEW.stamp := v_prefix || left(public.audit_user(), 80 - length(v_prefix) - length(v_suffix)) || v_suffix;
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_excluded CONSTANT TEXT[] := ARRAY['password_hash', 'token_hash', 'encrypted_password'];
    v_old JSONB;
    v_new JSONB;
    v_key TEXT;
    v_action TEXT;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_old := to_jsonb(OLD) - v_excluded;
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_new := to_jsonb(NEW) - v_excluded;
    END IF;

    SELECT string_agg(COALESCE(v_new, v_old) ->> a.attname::TEXT, '|' ORDER BY array_position(i.indkey::SMALLINT[], a.attnum))
    INTO v_key
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey::SMALLINT[])
    WHERE i.indrelid = TG_RELID AND i.indisprimary;

    IF TG_OP = 'UPDATE' THEN
        v_action := public.audit_action('UPDATE', OLD.status, NEW.status);
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETED';
    ELSE
        v_action := 'CREATED';
    END IF;

    INSERT INTO public.audit_log (table_name, record_key, action, app_user, old_values, new_values)
    VALUES (TG_TABLE_NAME, COALESCE(v_key, '(no primary key)'), v_action, public.audit_user(), v_old, v_new);
    RETURN NULL;
END;
$$;

CREATE FUNCTION public.audit_log_block_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only: % is not allowed', TG_OP;
END;
$$;

CREATE TRIGGER trg_audit_log_append_only
BEFORE UPDATE OR DELETE ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.audit_log_block_change();

CREATE TRIGGER trg_audit_log_no_truncate
BEFORE TRUNCATE ON public.audit_log
FOR EACH STATEMENT EXECUTE FUNCTION public.audit_log_block_change();

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.audit_log FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.audit_log TO service_role;

CREATE FUNCTION public.enable_audit(target REGCLASS)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE format('DROP TRIGGER IF EXISTS trg_zz_audit_stamp ON %s', target);
    EXECUTE format(
        'CREATE TRIGGER trg_zz_audit_stamp BEFORE INSERT OR UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION public.audit_stamp_trigger()',
        target
    );
    EXECUTE format('DROP TRIGGER IF EXISTS trg_zz_audit_log ON %s', target);
    EXECUTE format(
        'CREATE TRIGGER trg_zz_audit_log AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger()',
        target
    );
END;
$$;

REVOKE ALL ON FUNCTION public.enable_audit(REGCLASS) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.enable_audit(REGCLASS) IS 'Attach the audit stamp and audit_log triggers to a table that has status and stamp columns. The zz trigger names make them fire after other BEFORE triggers.';

DO $$
DECLARE
    audited RECORD;
BEGIN
    FOR audited IN
        SELECT c.oid::REGCLASS AS relation
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relname <> 'audit_log'
          AND EXISTS (
              SELECT 1 FROM pg_attribute a
              WHERE a.attrelid = c.oid AND a.attname = 'status'
                AND a.attnum > 0 AND NOT a.attisdropped
          )
          AND EXISTS (
              SELECT 1 FROM pg_attribute a
              WHERE a.attrelid = c.oid AND a.attname = 'stamp'
                AND a.attnum > 0 AND NOT a.attisdropped
          )
    LOOP
        PERFORM public.enable_audit(audited.relation);
    END LOOP;
END;
$$;
