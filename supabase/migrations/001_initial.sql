-- Extensiones
create extension if not exists "uuid-ossp";

-- Enum tipos
create type estado_torneo as enum ('borrador', 'activo', 'cerrado');
create type categoria_tipo as enum ('cuarta', 'tercera', 'segunda', 'primera', 'damas', 'dobles');
create type estado_pago as enum ('pendiente', 'pagado', 'rechazado');
create type ronda_tipo as enum ('primera_ronda', 'segunda_ronda', 'cuartos', 'semis', 'final');
create type tamano_bracket as enum ('16', '32');

-- Tabla: perfil de jugador (extiende auth.users)
create table public.jugador (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  apellido text not null,
  telefono text,
  categoria_habitual categoria_tipo,
  es_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Tabla: torneo
create table public.torneo (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  edicion int not null check (edicion between 1 and 4),
  anio int not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  estado estado_torneo not null default 'borrador',
  monto_inscripcion numeric(10,2) not null,
  created_at timestamptz not null default now()
);

-- Tabla: inscripcion
create table public.inscripcion (
  id uuid primary key default uuid_generate_v4(),
  torneo_id uuid not null references public.torneo(id) on delete cascade,
  jugador_id uuid not null references public.jugador(id) on delete cascade,
  categoria categoria_tipo not null,
  es_doble boolean not null default false,
  companero_id uuid references public.jugador(id),
  estado_pago estado_pago not null default 'pendiente',
  monto numeric(10,2) not null,
  mercadopago_payment_id text,
  mercadopago_preference_id text,
  created_at timestamptz not null default now(),
  unique (torneo_id, jugador_id, categoria)
);

-- Tabla: cuadro
create table public.cuadro (
  id uuid primary key default uuid_generate_v4(),
  torneo_id uuid not null references public.torneo(id) on delete cascade,
  categoria categoria_tipo not null,
  tamano tamano_bracket not null default '16',
  generado_en timestamptz not null default now(),
  unique (torneo_id, categoria)
);

-- Tabla: partido
create table public.partido (
  id uuid primary key default uuid_generate_v4(),
  cuadro_id uuid not null references public.cuadro(id) on delete cascade,
  ronda ronda_tipo not null,
  posicion int not null,
  jugador1_id uuid references public.jugador(id),
  jugador2_id uuid references public.jugador(id),
  ganador_id uuid references public.jugador(id),
  resultado jsonb,
  cancha text,
  hora_inicio timestamptz,
  created_at timestamptz not null default now()
);

-- RLS: habilitar en todas las tablas
alter table public.jugador enable row level security;
alter table public.torneo enable row level security;
alter table public.inscripcion enable row level security;
alter table public.cuadro enable row level security;
alter table public.partido enable row level security;

-- Políticas: jugador
create policy "Jugador puede ver su propio perfil"
  on public.jugador for select using (auth.uid() = id);
create policy "Jugador puede actualizar su propio perfil"
  on public.jugador for update using (auth.uid() = id);
create policy "Insert al registrarse"
  on public.jugador for insert with check (auth.uid() = id);
create policy "Admin puede ver todos los jugadores"
  on public.jugador for select
  using (public.is_admin());

-- Políticas: torneo (lectura pública, escritura solo admin)
create policy "Torneos son públicos"
  on public.torneo for select using (true);
create policy "Solo admin puede crear/editar torneos"
  on public.torneo for all
  using (exists (select 1 from public.jugador j where j.id = auth.uid() and j.es_admin = true));

-- Políticas: inscripcion
create policy "Jugador ve sus inscripciones"
  on public.inscripcion for select using (auth.uid() = jugador_id);
create policy "Jugador puede inscribirse"
  on public.inscripcion for insert with check (auth.uid() = jugador_id);
create policy "Admin ve todas las inscripciones"
  on public.inscripcion for select
  using (exists (select 1 from public.jugador j where j.id = auth.uid() and j.es_admin = true));
create policy "Admin puede actualizar inscripciones"
  on public.inscripcion for update
  using (exists (select 1 from public.jugador j where j.id = auth.uid() and j.es_admin = true));
create policy "Webhook puede actualizar estado pago"
  on public.inscripcion for update
  using (auth.role() = 'service_role');

-- Políticas: cuadro y partido (lectura pública)
create policy "Cuadros son públicos"
  on public.cuadro for select using (true);
create policy "Solo admin gestiona cuadros"
  on public.cuadro for all
  using (exists (select 1 from public.jugador j where j.id = auth.uid() and j.es_admin = true));
create policy "Partidos son públicos"
  on public.partido for select using (true);
create policy "Solo admin gestiona partidos"
  on public.partido for all
  using (exists (select 1 from public.jugador j where j.id = auth.uid() and j.es_admin = true));

-- Función helper para verificar admin (SECURITY DEFINER evita recursión RLS en tabla jugador)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select es_admin from public.jugador where id = auth.uid()),
    false
  );
$$;

-- Función: trigger para crear perfil al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.jugador (id, nombre, apellido)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
