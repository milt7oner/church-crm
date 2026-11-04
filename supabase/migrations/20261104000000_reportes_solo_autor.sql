-- Only the group's own leader files or edits its weekly report. Network
-- leaders, admins and the pastor keep read-only access, so a report always
-- reflects what its author wrote. (Network reports were already writable only
-- by the network's own leader.)
begin;

create function public.puede_reportar_grupo(p_grupo_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.grupos g
    where g.id = p_grupo_id
      and g.iglesia_id = public.app_iglesia_id()
      and g.lider_grupo_id = public.app_perfil_id()
  )
$$;

revoke execute on function public.puede_reportar_grupo(uuid) from public, anon;
grant execute on function public.puede_reportar_grupo(uuid) to authenticated;

drop policy reportes_grupo_insert on public.reportes_grupo;
drop policy reportes_grupo_update on public.reportes_grupo;

create policy reportes_grupo_insert on public.reportes_grupo for insert to authenticated
  with check (public.puede_reportar_grupo(grupo_id));
create policy reportes_grupo_update on public.reportes_grupo for update to authenticated
  using (public.puede_reportar_grupo(grupo_id))
  with check (public.puede_reportar_grupo(grupo_id));

drop policy reportes_grupo_asistencia_all on public.reportes_grupo_asistencia;

create policy reportes_grupo_asistencia_select on public.reportes_grupo_asistencia for select to authenticated
  using (exists (
    select 1 from public.reportes_grupo r
    where r.id = reporte_id and public.puede_gestionar_grupo(r.grupo_id)
  ));
create policy reportes_grupo_asistencia_write on public.reportes_grupo_asistencia for all to authenticated
  using (exists (
    select 1 from public.reportes_grupo r
    where r.id = reporte_id and public.puede_reportar_grupo(r.grupo_id)
  ))
  with check (exists (
    select 1 from public.reportes_grupo r
    where r.id = reporte_id and public.puede_reportar_grupo(r.grupo_id)
  ));

commit;
