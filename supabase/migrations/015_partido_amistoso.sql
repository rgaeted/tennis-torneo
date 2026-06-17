create table public.partido_amistoso (
  id uuid primary key default gen_random_uuid(),
  retador_id uuid not null references public.jugador(id) on delete cascade,
  rival_id uuid not null references public.jugador(id) on delete cascade,
  club_id uuid references public.club(id) on delete set null,
  cancha text,
  fecha_hora timestamptz,
  estado text not null default 'pendiente',
  created_at timestamptz not null default now()
);

alter table public.partido_amistoso enable row level security;

create policy "Jugadores ven sus amistosos"
  on public.partido_amistoso for select
  using (auth.uid() = retador_id or auth.uid() = rival_id);

create policy "Jugadores crean amistosos"
  on public.partido_amistoso for insert
  with check (auth.uid() = retador_id);

create policy "Partes pueden cancelar amistosos"
  on public.partido_amistoso for update
  using (auth.uid() = retador_id or auth.uid() = rival_id);
