-- Eliminar dinámicamente cualquier check constraint sobre la columna rol,
-- sin importar el nombre que Postgres le haya asignado automáticamente.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.jugador'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%rol%'
  LOOP
    EXECUTE format('ALTER TABLE public.jugador DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- Agregar constraint actualizado que incluye 'organizador'
ALTER TABLE public.jugador
  ADD CONSTRAINT jugador_rol_check
  CHECK (rol IN ('admin', 'jugador', 'turno', 'organizador'));
