-- Add photo URL column to jugador
alter table public.jugador add column foto_url text;

-- Jugador can update their own foto_url (already covered by existing update policy)

-- Storage bucket for avatars (run this too)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Avatar publico para lectura"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Jugador puede subir su avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Jugador puede actualizar su avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Jugador puede eliminar su avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
