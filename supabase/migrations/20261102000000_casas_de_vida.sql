-- Casas de Vida: home groups, networks, members and weekly reports.
-- Additive migration: it does not modify or drop any existing table.
-- Run it as a whole (it is wrapped in a transaction).

begin;

-- Guard: foreign keys below assume public.iglesias.id is a uuid.
do $$
begin
  if coalesce((
    select data_type from information_schema.columns
    where table_schema = 'public' and table_name = 'iglesias' and column_name = 'id'
  ), '') <> 'uuid' then
    raise exception 'Expected public.iglesias.id to exist and be of type uuid';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.rol_app as enum ('pastor', 'lider_admin', 'lider_red', 'lider_grupo');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.redes (
  id uuid primary key default gen_random_uuid(),
  iglesia_id uuid not null references public.iglesias (id),
  nombre text not null check (length(trim(nombre)) > 0),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- App users (leaders and pastor). Members of a group are NOT users.
-- A network leader is the active profile with rol = 'lider_red' and red_id = <network>.
create table public.perfiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id),
  iglesia_id uuid not null references public.iglesias (id),
  nombre_completo text not null check (length(trim(nombre_completo)) > 0),
  email text,
  telefono text,
  rol public.rol_app not null,
  red_id uuid references public.redes (id),
  activo boolean not null default true,
  created_by uuid references public.perfiles (id),
  created_at timestamptz not null default now(),
  constraint perfiles_red_por_rol check (
    (rol in ('pastor', 'lider_admin') and red_id is null)
    or rol in ('lider_red', 'lider_grupo')
  )
);

-- At most one active leader per network.
create unique index perfiles_un_lider_por_red
  on public.perfiles (red_id)
  where rol = 'lider_red' and activo and red_id is not null;

create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  iglesia_id uuid not null references public.iglesias (id),
  red_id uuid not null references public.redes (id),
  lider_grupo_id uuid references public.perfiles (id),
  nombre text not null check (length(trim(nombre)) > 0),
  direccion text,
  dia_reunion text,
  hora_reunion time,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.miembros (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos (id),
  nombre_completo text not null check (length(trim(nombre_completo)) > 0),
  telefono text,
  direccion text,
  fecha_ingreso date not null default current_date,
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Weekly group report. "semana" is always the Monday of the reported week.
create table public.reportes_grupo (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos (id),
  semana date not null check (extract(isodow from semana) = 1),
  fecha_reunion date,
  tema text,
  novedades text,
  created_by uuid references public.perfiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grupo_id, semana)
);

create table public.reportes_grupo_asistencia (
  reporte_id uuid not null references public.reportes_grupo (id) on delete cascade,
  miembro_id uuid not null references public.miembros (id),
  asistio boolean not null default false,
  primary key (reporte_id, miembro_id)
);

-- Weekly network report: which groups the network leader followed up on.
create table public.reportes_red (
  id uuid primary key default gen_random_uuid(),
  red_id uuid not null references public.redes (id),
  semana date not null check (extract(isodow from semana) = 1),
  novedades text,
  created_by uuid references public.perfiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (red_id, semana)
);

create table public.reportes_red_grupos (
  reporte_id uuid not null references public.reportes_red (id) on delete cascade,
  grupo_id uuid not null references public.grupos (id),
  primary key (reporte_id, grupo_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index perfiles_iglesia_idx on public.perfiles (iglesia_id);
create index perfiles_red_idx on public.perfiles (red_id);
create index redes_iglesia_idx on public.redes (iglesia_id);
create index grupos_iglesia_idx on public.grupos (iglesia_id);
create index grupos_red_idx on public.grupos (red_id);
create index grupos_lider_idx on public.grupos (lider_grupo_id);
create index miembros_grupo_idx on public.miembros (grupo_id);
create index reportes_grupo_semana_idx on public.reportes_grupo (semana);
create index reportes_red_semana_idx on public.reportes_red (semana);
create index reportes_grupo_asistencia_miembro_idx on public.reportes_grupo_asistencia (miembro_id);
create index reportes_red_grupos_grupo_idx on public.reportes_red_grupos (grupo_id);

-- ---------------------------------------------------------------------------
-- Helper functions for RLS (security definer: they bypass RLS on perfiles,
-- which avoids policy recursion)
-- ---------------------------------------------------------------------------

create function public.app_perfil_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.perfiles where auth_user_id = auth.uid() and activo
$$;

create function public.app_rol() returns public.rol_app
language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where auth_user_id = auth.uid() and activo
$$;

create function public.app_red_id() returns uuid
language sql stable security definer set search_path = public as $$
  select red_id from public.perfiles where auth_user_id = auth.uid() and activo
$$;

create function public.app_iglesia_id() returns uuid
language sql stable security definer set search_path = public as $$
  select iglesia_id from public.perfiles where auth_user_id = auth.uid() and activo
$$;

create function public.app_es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_rol() in ('pastor', 'lider_admin'), false)
$$;

-- Pastor/admin, the network leader of the group's network, or the group's own leader.
create function public.puede_gestionar_grupo(p_grupo_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.grupos g
    where g.id = p_grupo_id
      and g.iglesia_id = public.app_iglesia_id()
      and (
        public.app_es_admin()
        or (public.app_rol() = 'lider_red' and g.red_id = public.app_red_id())
        or g.lider_grupo_id = public.app_perfil_id()
      )
  )
$$;

create function public.puede_reportar_red(p_red_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.app_rol() = 'lider_red' and p_red_id = public.app_red_id()
$$;

create function public.puede_ver_reporte_red(p_red_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.redes r
    where r.id = p_red_id
      and r.iglesia_id = public.app_iglesia_id()
      and (public.app_es_admin() or public.puede_reportar_red(r.id))
  )
$$;

-- Only pastor/admin may move a group to another network (RLS alone would let a
-- group leader change red_id on their own group). Service role calls have no auth.uid().
create function public.grupos_proteger_red() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and new.red_id is distinct from old.red_id
     and not public.app_es_admin() then
    raise exception 'Only pastor or admin can move a group to another network';
  end if;
  return new;
end
$$;

create trigger grupos_proteger_red
  before update on public.grupos
  for each row execute function public.grupos_proteger_red();

revoke execute on function
  public.app_perfil_id(), public.app_rol(), public.app_red_id(), public.app_iglesia_id(),
  public.app_es_admin(), public.puede_gestionar_grupo(uuid), public.puede_reportar_red(uuid),
  public.puede_ver_reporte_red(uuid)
from public, anon;

grant execute on function
  public.app_perfil_id(), public.app_rol(), public.app_red_id(), public.app_iglesia_id(),
  public.app_es_admin(), public.puede_gestionar_grupo(uuid), public.puede_reportar_red(uuid),
  public.puede_ver_reporte_red(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Deletes are soft (activo = false), so most tables have no DELETE policy.
-- perfiles is written only through the service role from server actions.
-- ---------------------------------------------------------------------------

alter table public.perfiles enable row level security;
alter table public.redes enable row level security;
alter table public.grupos enable row level security;
alter table public.miembros enable row level security;
alter table public.reportes_grupo enable row level security;
alter table public.reportes_grupo_asistencia enable row level security;
alter table public.reportes_red enable row level security;
alter table public.reportes_red_grupos enable row level security;

-- perfiles
create policy perfiles_select on public.perfiles for select to authenticated using (
  iglesia_id = public.app_iglesia_id()
  and (
    public.app_es_admin()
    or auth_user_id = auth.uid()
    or (public.app_rol() = 'lider_red' and red_id = public.app_red_id())
    or (public.app_rol() = 'lider_grupo' and rol = 'lider_red' and red_id = public.app_red_id())
  )
);

-- redes
create policy redes_select on public.redes for select to authenticated using (
  iglesia_id = public.app_iglesia_id()
  and (public.app_es_admin() or id = public.app_red_id())
);
create policy redes_insert on public.redes for insert to authenticated with check (
  public.app_es_admin() and iglesia_id = public.app_iglesia_id()
);
create policy redes_update on public.redes for update to authenticated
  using (public.app_es_admin() and iglesia_id = public.app_iglesia_id())
  with check (public.app_es_admin() and iglesia_id = public.app_iglesia_id());

-- grupos (inline checks so INSERT does not depend on the row already existing)
create policy grupos_select on public.grupos for select to authenticated using (
  iglesia_id = public.app_iglesia_id()
  and (
    public.app_es_admin()
    or (public.app_rol() = 'lider_red' and red_id = public.app_red_id())
    or lider_grupo_id = public.app_perfil_id()
  )
);
create policy grupos_insert on public.grupos for insert to authenticated with check (
  iglesia_id = public.app_iglesia_id()
  and (
    public.app_es_admin()
    or (public.app_rol() = 'lider_red' and red_id = public.app_red_id())
  )
);
create policy grupos_update on public.grupos for update to authenticated
  using (
    iglesia_id = public.app_iglesia_id()
    and (
      public.app_es_admin()
      or (public.app_rol() = 'lider_red' and red_id = public.app_red_id())
      or lider_grupo_id = public.app_perfil_id()
    )
  )
  with check (
    iglesia_id = public.app_iglesia_id()
    and (
      public.app_es_admin()
      or (public.app_rol() = 'lider_red' and red_id = public.app_red_id())
      or lider_grupo_id = public.app_perfil_id()
    )
  );

-- miembros
create policy miembros_select on public.miembros for select to authenticated
  using (public.puede_gestionar_grupo(grupo_id));
create policy miembros_insert on public.miembros for insert to authenticated
  with check (public.puede_gestionar_grupo(grupo_id));
create policy miembros_update on public.miembros for update to authenticated
  using (public.puede_gestionar_grupo(grupo_id))
  with check (public.puede_gestionar_grupo(grupo_id));

-- reportes_grupo
create policy reportes_grupo_select on public.reportes_grupo for select to authenticated
  using (public.puede_gestionar_grupo(grupo_id));
create policy reportes_grupo_insert on public.reportes_grupo for insert to authenticated
  with check (public.puede_gestionar_grupo(grupo_id));
create policy reportes_grupo_update on public.reportes_grupo for update to authenticated
  using (public.puede_gestionar_grupo(grupo_id))
  with check (public.puede_gestionar_grupo(grupo_id));

-- reportes_grupo_asistencia
create policy reportes_grupo_asistencia_all on public.reportes_grupo_asistencia for all to authenticated
  using (exists (
    select 1 from public.reportes_grupo r
    where r.id = reporte_id and public.puede_gestionar_grupo(r.grupo_id)
  ))
  with check (exists (
    select 1 from public.reportes_grupo r
    where r.id = reporte_id and public.puede_gestionar_grupo(r.grupo_id)
  ));

-- reportes_red
create policy reportes_red_select on public.reportes_red for select to authenticated
  using (public.puede_ver_reporte_red(red_id));
create policy reportes_red_insert on public.reportes_red for insert to authenticated
  with check (public.puede_reportar_red(red_id));
create policy reportes_red_update on public.reportes_red for update to authenticated
  using (public.puede_reportar_red(red_id))
  with check (public.puede_reportar_red(red_id));

-- reportes_red_grupos
create policy reportes_red_grupos_select on public.reportes_red_grupos for select to authenticated
  using (exists (
    select 1 from public.reportes_red r
    where r.id = reporte_id and public.puede_ver_reporte_red(r.red_id)
  ));
create policy reportes_red_grupos_write on public.reportes_red_grupos for all to authenticated
  using (exists (
    select 1 from public.reportes_red r
    where r.id = reporte_id and public.puede_reportar_red(r.red_id)
  ))
  with check (exists (
    select 1 from public.reportes_red r
    where r.id = reporte_id and public.puede_reportar_red(r.red_id)
  ));

-- ---------------------------------------------------------------------------
-- Bootstrap: keep only the pastor account(s) from the previous system
-- ---------------------------------------------------------------------------

insert into public.perfiles (auth_user_id, iglesia_id, nombre_completo, email, telefono, rol)
select p.auth_user_id, p.iglesia_id, p.nombre_completo, u.email, p.telefono, 'pastor'
from public.personas p
join auth.users u on u.id = p.auth_user_id
where p.rol_sistema::text in ('pastor', 'super_admin')
  and p.iglesia_id is not null
on conflict (auth_user_id) do nothing;

commit;
