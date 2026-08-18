-- Seed: 50 jugadores de ejemplo para Tenis Puerto Varas
-- Ejecutar en el SQL Editor de Supabase (requiere permisos de admin)

create extension if not exists pgcrypto;

do $$
declare
  nombres_m text[] := array[
    'Sebastian','Matias','Nicolas','Rodrigo','Felipe','Ignacio','Cristobal',
    'Alejandro','Andres','Pablo','Diego','Francisco','Javier','Luis',
    'Ricardo','Tomas','Gabriel','Eduardo','Claudio','Marcelo',
    'Hernan','Patricio','Gustavo','Roberto','Jorge','Mario','Alberto',
    'Carlos','Daniel','Sergio','Raul','Pedro','Manuel','Oscar','Ivan'
  ];
  nombres_f text[] := array[
    'Valentina','Camila','Daniela','Sofia','Fernanda','Javiera','Francisca',
    'Constanza','Catalina','Isadora','Antonia','Paula','Andrea','Carolina','Natalia'
  ];
  apellidos text[] := array[
    'Gonzalez','Munoz','Rodriguez','Lopez','Martinez','Perez','Soto',
    'Contreras','Silva','Rojas','Morales','Torres','Castro','Ramos',
    'Vargas','Flores','Fernandez','Ramirez','Reyes','Navarro',
    'Diaz','Herrera','Medina','Aguilar','Vega','Castillo','Romero',
    'Gutierrez','Rios','Alvarez'
  ];
  categorias categoria_tipo[] := array[
    'primera','primera',
    'segunda','segunda','segunda',
    'tercera','tercera','tercera',
    'cuarta','cuarta'
  ]::categoria_tipo[];
  i int;
  uid uuid;
  nom text;
  ape text;
  email_addr text;
begin
  for i in 1..50 loop
    uid := gen_random_uuid();

    if i <= 35 then
      nom := nombres_m[1 + floor(random() * array_length(nombres_m, 1))::int];
    else
      nom := nombres_f[1 + floor(random() * array_length(nombres_f, 1))::int];
    end if;

    ape := apellidos[1 + floor(random() * array_length(apellidos, 1))::int];
    email_addr := lower(nom) || '.' || lower(ape) || i || '@tenis-puertovaras.cl';

    insert into auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      created_at, updated_at,
      raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) values (
      uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      email_addr,
      crypt('Tenis2026!', gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('nombre', nom, 'apellido', ape),
      false, '', '', '', ''
    );

    -- El trigger on_auth_user_created crea el registro en public.jugador
    -- Solo actualizamos los campos extra
    update public.jugador
    set
      categoria_habitual = categorias[1 + floor(random() * array_length(categorias, 1))::int],
      telefono = '+569' || (10000000 + floor(random() * 89999999)::int)::text
    where id = uid;

  end loop;
end;
$$;
