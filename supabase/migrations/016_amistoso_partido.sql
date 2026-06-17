-- Allow partido without a bracket (friendly matches)
alter table public.partido alter column cuadro_id drop not null;

-- Link friendly match to its live partido once started
alter table public.partido_amistoso add column partido_id uuid references public.partido(id) on delete set null;
