create type public.nivel_patrocinador as enum ('oro', 'plata');

create table public.patrocinador_torneo (
  id          uuid primary key default gen_random_uuid(),
  torneo_id   uuid not null references public.torneo(id) on delete cascade,
  nombre      text not null,
  logo_url    text,
  nivel       public.nivel_patrocinador not null default 'plata',
  orden       int not null default 0,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index patrocinador_torneo_torneo_idx
  on public.patrocinador_torneo (torneo_id, nivel, orden);

alter table public.patrocinador_torneo enable row level security;

create policy "read_patrocinador_torneo"
  on public.patrocinador_torneo for select
  to authenticated
  using (true);

create policy "write_patrocinador_torneo"
  on public.patrocinador_torneo for all
  to authenticated
  using (
    (select rol from public.jugador where id = auth.uid()) = 'admin'
    or (
      (select rol from public.jugador where id = auth.uid()) = 'organizador'
      and exists (
        select 1
        from public.torneo t
        join public.jugador j on j.id = auth.uid()
        where t.id = patrocinador_torneo.torneo_id
          and t.organizacion_id is not null
          and t.organizacion_id = j.organizacion_id
      )
    )
  )
  with check (
    (select rol from public.jugador where id = auth.uid()) = 'admin'
    or (
      (select rol from public.jugador where id = auth.uid()) = 'organizador'
      and exists (
        select 1
        from public.torneo t
        join public.jugador j on j.id = auth.uid()
        where t.id = patrocinador_torneo.torneo_id
          and t.organizacion_id is not null
          and t.organizacion_id = j.organizacion_id
      )
    )
  );
