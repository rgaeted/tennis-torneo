-- Allow admin to insert and delete inscriptions on behalf of players
create policy "Admin puede insertar inscripciones"
  on public.inscripcion for insert
  with check (public.is_admin());

create policy "Admin puede eliminar inscripciones"
  on public.inscripcion for delete
  using (public.is_admin());
