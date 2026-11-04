# Database migrations

SQL files in `migrations/` are applied manually in the Supabase dashboard, in filename order.

## Applying `20261102000000_casas_de_vida.sql`

The migration is additive: it creates new tables (`perfiles`, `redes`, `grupos`, `miembros`,
`reportes_grupo`, `reportes_grupo_asistencia`, `reportes_red`, `reportes_red_grupos`) and does not
modify or drop the previous ones (`personas`, `seguimiento_etapas`, ...). It runs in a single
transaction, so if any statement fails nothing is applied.

1. **Back up first.** Project → Database → Backups and confirm there is a recent backup, or run:
   ```bash
   pg_dump "<connection string>" --no-owner -Fc -f backup-before-casas-de-vida.dump
   ```
2. Open SQL Editor → New query, paste the whole file and run it.
3. Check that the pastor account was carried over:
   ```sql
   select nombre_completo, email, rol from public.perfiles;
   ```
   It should list the accounts that had `rol_sistema` = `pastor` or `super_admin` in `personas`.
   Every other previous user has no profile and will see a "no access" screen when logging in.

## Rolling back

Because nothing existing is touched, rolling back only removes the new objects:

```sql
begin;
drop table if exists public.reportes_red_grupos, public.reportes_red,
  public.reportes_grupo_asistencia, public.reportes_grupo, public.miembros,
  public.grupos, public.perfiles, public.redes cascade;
drop function if exists public.app_perfil_id(), public.app_rol(), public.app_red_id(),
  public.app_iglesia_id(), public.app_es_admin(), public.puede_gestionar_grupo(uuid),
  public.puede_reportar_red(uuid), public.puede_ver_reporte_red(uuid),
  public.grupos_proteger_red();
drop type if exists public.rol_app;
commit;
```

## `20261103000000_redes_tipo_descripcion.sql`

Adds `redes.tipo` (`adultos` | `jovenes` | `ninos`, default `adultos`) and `redes.descripcion`
(neighborhoods or zones the network covers). Apply it the same way. To roll it back:

```sql
begin;
alter table public.redes drop column if exists tipo, drop column if exists descripcion;
drop type if exists public.tipo_red;
commit;
```

## `20261104000000_reportes_solo_autor.sql`

Only the group's own leader can file or edit its weekly report; network leaders, admins and the
pastor get read-only access. To roll it back (restores the previous policies):

```sql
begin;
drop policy reportes_grupo_insert on public.reportes_grupo;
drop policy reportes_grupo_update on public.reportes_grupo;
drop policy reportes_grupo_asistencia_select on public.reportes_grupo_asistencia;
drop policy reportes_grupo_asistencia_write on public.reportes_grupo_asistencia;
create policy reportes_grupo_insert on public.reportes_grupo for insert to authenticated
  with check (public.puede_gestionar_grupo(grupo_id));
create policy reportes_grupo_update on public.reportes_grupo for update to authenticated
  using (public.puede_gestionar_grupo(grupo_id)) with check (public.puede_gestionar_grupo(grupo_id));
create policy reportes_grupo_asistencia_all on public.reportes_grupo_asistencia for all to authenticated
  using (exists (select 1 from public.reportes_grupo r where r.id = reporte_id and public.puede_gestionar_grupo(r.grupo_id)))
  with check (exists (select 1 from public.reportes_grupo r where r.id = reporte_id and public.puede_gestionar_grupo(r.grupo_id)));
drop function public.puede_reportar_grupo(uuid);
commit;
```
