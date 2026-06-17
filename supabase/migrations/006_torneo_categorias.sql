-- Agregar columna categorias al torneo
-- Por defecto incluye todas las categorias para compatibilidad con torneos existentes
alter table public.torneo
  add column categorias categoria_tipo[] not null
  default array['cuarta','tercera','segunda','primera','damas','dobles']::categoria_tipo[];
