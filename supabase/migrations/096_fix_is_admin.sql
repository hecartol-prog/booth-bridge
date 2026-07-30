CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce(lower((auth.jwt() -> 'app_metadata' ->> 'role')), '')
    IN ('admin', 'superadmin', 'systemadmin', 'supportadmin');
$$;
