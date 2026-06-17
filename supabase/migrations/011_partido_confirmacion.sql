alter table public.partido add column resultado_confirmado boolean not null default false;

-- Retroactively confirm all existing finalized matches so they don't show as pending
update public.partido set resultado_confirmado = true where ganador_id is not null;
