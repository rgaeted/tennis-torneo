-- Club table
create table public.club (
  id         uuid        primary key default gen_random_uuid(),
  nombre     text        not null,
  direccion  text,
  num_canchas int        not null default 2,
  created_at timestamptz not null default now()
);

alter table public.club enable row level security;

create policy "Clubes públicos" on public.club
  for select using (true);

create policy "Solo admins modifican clubes" on public.club
  for all using (
    exists (select 1 from public.jugador where id = auth.uid() and rol = 'admin')
  );

-- Link torneo → club; drop num_canchas (now on club)
alter table public.torneo
  add column club_id uuid references public.club(id) on delete set null;

alter table public.torneo drop column num_canchas;
