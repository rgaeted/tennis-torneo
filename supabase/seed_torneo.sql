-- Seed: torneo con inscripciones de ejemplo
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de seed_jugadores.sql

do $$
declare
  v_torneo_id uuid := gen_random_uuid();
begin

  -- 1. Crear torneo activo
  insert into public.torneo (id, nombre, edicion, anio, fecha_inicio, fecha_fin, estado, monto_inscripcion)
  values (
    v_torneo_id,
    'Torneo Tenis Puerto Varas',
    1,
    2026,
    '2026-07-01',
    '2026-07-15',
    'activo',
    25000
  );

  -- 2. Primera: 12 jugadores aleatorios
  insert into public.inscripcion (torneo_id, jugador_id, categoria, estado_pago, monto)
  select v_torneo_id, id, 'primera'::categoria_tipo, 'pagado'::estado_pago, 25000
  from public.jugador
  where es_admin = false
  order by random()
  limit 12
  on conflict do nothing;

  -- 3. Segunda: 14 jugadores que no estén ya inscritos
  insert into public.inscripcion (torneo_id, jugador_id, categoria, estado_pago, monto)
  select v_torneo_id, id, 'segunda'::categoria_tipo, 'pagado'::estado_pago, 25000
  from public.jugador
  where es_admin = false
    and id not in (select jugador_id from public.inscripcion where torneo_id = v_torneo_id)
  order by random()
  limit 14
  on conflict do nothing;

  -- 4. Tercera: 10 jugadores restantes
  insert into public.inscripcion (torneo_id, jugador_id, categoria, estado_pago, monto)
  select v_torneo_id, id, 'tercera'::categoria_tipo, 'pagado'::estado_pago, 25000
  from public.jugador
  where es_admin = false
    and id not in (select jugador_id from public.inscripcion where torneo_id = v_torneo_id)
  order by random()
  limit 10
  on conflict do nothing;

  -- 5. Cuarta: 8 jugadores restantes
  insert into public.inscripcion (torneo_id, jugador_id, categoria, estado_pago, monto)
  select v_torneo_id, id, 'cuarta'::categoria_tipo, 'pagado'::estado_pago, 25000
  from public.jugador
  where es_admin = false
    and id not in (select jugador_id from public.inscripcion where torneo_id = v_torneo_id)
  order by random()
  limit 8
  on conflict do nothing;

  -- 6. Damas: 6 jugadores restantes
  insert into public.inscripcion (torneo_id, jugador_id, categoria, estado_pago, monto)
  select v_torneo_id, id, 'damas'::categoria_tipo, 'pagado'::estado_pago, 25000
  from public.jugador
  where es_admin = false
    and id not in (select jugador_id from public.inscripcion where torneo_id = v_torneo_id)
  order by random()
  limit 6
  on conflict do nothing;

  raise notice 'Torneo creado: %', v_torneo_id;
  raise notice 'Inscripciones creadas: %', (select count(*) from public.inscripcion where torneo_id = v_torneo_id);

end;
$$;
