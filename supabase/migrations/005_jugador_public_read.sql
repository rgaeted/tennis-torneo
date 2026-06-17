-- Jugadores son visibles públicamente (nombres aparecen en brackets, live, etc.)
create policy "Jugadores son públicos"
  on public.jugador for select using (true);
