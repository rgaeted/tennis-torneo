-- Insertar admin de prueba (ejecutar DESPUÉS de crear el usuario en Supabase Auth)
-- Reemplazar UUID con el id real del usuario creado
-- update public.jugador set es_admin = true, nombre = 'Admin', apellido = 'Torneo'
-- where id = '<UUID-del-admin>';

-- Torneo de prueba
insert into public.torneo (nombre, edicion, anio, fecha_inicio, fecha_fin, estado, monto_inscripcion)
values ('Torneo Ciudad 2026', 1, 2026, '2026-07-01', '2026-07-15', 'borrador', 5000.00);
