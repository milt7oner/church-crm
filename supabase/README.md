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
