-- Number of visitors (people who are not registered members) at each group
-- meeting, so reports can show total attendance and growth. Additive only.
begin;

alter table public.reportes_grupo
  add column visitantes integer not null default 0
  constraint reportes_grupo_visitantes_rango check (visitantes between 0 and 500);

commit;
