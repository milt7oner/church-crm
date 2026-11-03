-- Networks: audience type (for future reports) and a free-text description
-- of the neighborhoods or zones each network covers. Additive only.
begin;

create type public.tipo_red as enum ('adultos', 'jovenes', 'ninos');

alter table public.redes
  add column tipo public.tipo_red not null default 'adultos',
  add column descripcion text;

create index redes_tipo_idx on public.redes (iglesia_id, tipo);

commit;
