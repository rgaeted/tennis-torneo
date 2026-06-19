-- Trigger que crea el registro jugador al registrarse, compatible con email Y OAuth (Google/Apple)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_nombre  text;
  v_apellido text;
  v_full    text;
BEGIN
  v_full := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    ''
  );

  v_nombre := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'nombre'), ''),
    NULLIF(TRIM(new.raw_user_meta_data->>'given_name'), ''),
    NULLIF(TRIM(split_part(v_full, ' ', 1)), ''),
    'Usuario'
  );

  v_apellido := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'apellido'), ''),
    NULLIF(TRIM(new.raw_user_meta_data->>'family_name'), ''),
    NULLIF(TRIM(substring(v_full FROM position(' ' IN v_full) + 1)), ''),
    v_nombre
  );

  INSERT INTO public.jugador (id, nombre, apellido)
  VALUES (new.id, v_nombre, v_apellido)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
