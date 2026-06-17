insert into storage.buckets (id, name, public)
values ('torneos', 'torneos', true)
on conflict (id) do nothing;

create policy "Imagen torneo publica para lectura"
  on storage.objects for select
  using (bucket_id = 'torneos');

create policy "Solo admins pueden subir imagenes de torneo"
  on storage.objects for insert
  with check (
    bucket_id = 'torneos'
    and exists (select 1 from public.jugador where id = auth.uid() and rol = 'admin')
  );

create policy "Solo admins pueden actualizar imagenes de torneo"
  on storage.objects for update
  using (
    bucket_id = 'torneos'
    and exists (select 1 from public.jugador where id = auth.uid() and rol = 'admin')
  );

create policy "Solo admins pueden eliminar imagenes de torneo"
  on storage.objects for delete
  using (
    bucket_id = 'torneos'
    and exists (select 1 from public.jugador where id = auth.uid() and rol = 'admin')
  );
