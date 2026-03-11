-- Fix handle_new_user trigger function to be more defensive with type casting
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
