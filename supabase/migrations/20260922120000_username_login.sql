CREATE OR REPLACE FUNCTION public.get_auth_email_by_username(lookup_username TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.email
  FROM auth.users AS u
  JOIN public.profiles AS p ON p.id = u.id
  WHERE lower(p.username) = lower(trim(lookup_username))
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_auth_email_by_username(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_email_by_username(TEXT) TO anon, authenticated;