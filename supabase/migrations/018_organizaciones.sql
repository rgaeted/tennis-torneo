-- Tabla de organizaciones
create table public.organizacion (
  id          uuid        primary key default gen_random_uuid(),
  nombre      text        not null,
  created_at  timestamptz not null default now()
);

alter table public.organizacion enable row level security;

-- Cualquier autenticado puede leer organizaciones
create policy "read_organizacion"
  on public.organizacion for select
  to authenticated
  using (true);

-- Solo admin puede crear/editar/eliminar
create policy "admin_write_organizacion"
  on public.organizacion for all
  to authenticated
  using   ((select rol from public.jugador where id = auth.uid()) = 'admin')
  with check ((select rol from public.jugador where id = auth.uid()) = 'admin');

-- Agregar organizacion_id a jugador
alter table public.jugador
  add column if not exists organizacion_id uuid references public.organizacion(id) on delete set null;

-- Agregar organizacion_id a torneo
alter table public.torneo
  add column if not exists organizacion_id uuid references public.organizacion(id) on delete set null;
