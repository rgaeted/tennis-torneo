-- Replace es_admin boolean with a rol column
alter table public.jugador
  add column rol text not null default 'jugador'
  check (rol in ('admin', 'jugador', 'turno'));

-- Migrate existing admins
update public.jugador set rol = 'admin' where es_admin = true;

-- Drop old column
alter table public.jugador drop column es_admin;

-- Update is_admin() to use rol
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select rol = 'admin' from public.jugador where id = auth.uid()),
    false
  );
$$;

-- is_turno(): true for admin AND turno roles (can update any scoreboard)
create or replace function public.is_turno()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select rol in ('admin', 'turno') from public.jugador where id = auth.uid()),
    false
  );
$$;
