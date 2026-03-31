-- B12: Fix handle_new_user trigger — add SECURITY DEFINER to bypass RLS
-- and add EXCEPTION block so auth signup never fails even if profile insert has issues.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.user_role := 'student';
  _name text := '';
BEGIN
  -- Safely extract metadata
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    _name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    BEGIN
      _role := (NEW.raw_user_meta_data->>'role')::public.user_role;
    EXCEPTION WHEN OTHERS THEN
      _role := 'student';
    END;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, _name, _role);

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists (e.g. pre-created) — not an error
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log but don't block user creation
    RAISE LOG 'handle_new_user error for %: % [%]', NEW.email, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
