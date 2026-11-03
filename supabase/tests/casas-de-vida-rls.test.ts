// Runs the Casas de Vida migration on an in-memory Postgres (PGlite) with a
// minimal stand-in for Supabase's auth schema, then checks the RLS policies
// from the point of view of each role.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

const MIGRATION = fileURLToPath(new URL('../migrations/20261102000000_casas_de_vida.sql', import.meta.url))

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`

const IGLESIA_1 = id(901)
const IGLESIA_2 = id(902)
const RED_1 = id(101)
const RED_2 = id(102)
const GRUPO_1 = id(301)
const GRUPO_2 = id(302)

const USER = {
  pastor: id(1),
  sinPerfil: id(2),
  admin: id(3),
  liderRed1: id(4),
  liderRed2: id(5),
  liderGrupo1: id(6),
  liderGrupo2: id(7),
}

const PERFIL_LIDER_GRUPO_1 = id(206)
const PERFIL_LIDER_GRUPO_2 = id(207)
const MIEMBRO_1 = id(401)
const REPORTE_GRUPO_1 = id(501)
const REPORTE_RED_1 = id(601)

let db: PGlite

async function as<T>(authUserId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec('set role authenticated')
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [authUserId])
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
  }
}

async function rows<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  return (await db.query<T>(sql)).rows
}

async function names(sql: string): Promise<string> {
  return (await rows<{ n: string }>(sql))
    .map((r) => r.n)
    .sort()
    .join(',')
}

async function fails(sql: string): Promise<boolean> {
  try {
    await db.query(sql)
    return false
  } catch {
    return true
  }
}

beforeAll(async () => {
  db = new PGlite()

  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

    create table public.iglesias (id uuid primary key, nombre text);
    create table public.personas (
      id uuid primary key default gen_random_uuid(), nombre_completo text, telefono text,
      iglesia_id uuid, auth_user_id uuid, rol_sistema text
    );

    insert into public.iglesias values ('${IGLESIA_1}', 'Iglesia 1'), ('${IGLESIA_2}', 'Iglesia 2');
    insert into auth.users (id, email) select u, 'user' || row_number() over () || '@test.co'
      from unnest(array['${Object.values(USER).join("','")}', '${id(8)}']::uuid[]) as u;
    insert into public.personas (nombre_completo, iglesia_id, auth_user_id, rol_sistema) values
      ('Pastor', '${IGLESIA_1}', '${USER.pastor}', 'super_admin'),
      ('Old leader', '${IGLESIA_1}', '${USER.sinPerfil}', 'lider');
  `)

  await db.exec(readFileSync(MIGRATION, 'utf8'))

  // Supabase grants table privileges to "authenticated" by default; RLS does the filtering.
  await db.exec(`
    grant usage on schema public, auth to authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
  `)
}, 60_000)

describe('bootstrap', () => {
  it('creates a pastor profile only for previous pastor/super_admin accounts', async () => {
    const perfiles = await rows<{ auth_user_id: string; rol: string; email: string }>(
      'select auth_user_id, rol, email from perfiles'
    )
    expect(perfiles).toHaveLength(1)
    expect(perfiles[0]).toMatchObject({ auth_user_id: USER.pastor, rol: 'pastor' })
    expect(perfiles[0].email).toMatch(/@test\.co$/)
  })
})

describe('RLS', () => {
  beforeAll(async () => {
    await db.exec(`
      insert into redes (id, iglesia_id, nombre) values
        ('${RED_1}', '${IGLESIA_1}', 'Red 1'),
        ('${RED_2}', '${IGLESIA_1}', 'Red 2'),
        ('${id(103)}', '${IGLESIA_2}', 'Red otra iglesia');
      insert into perfiles (id, auth_user_id, iglesia_id, nombre_completo, rol, red_id) values
        ('${id(203)}', '${USER.admin}', '${IGLESIA_1}', 'Admin', 'lider_admin', null),
        ('${id(204)}', '${USER.liderRed1}', '${IGLESIA_1}', 'RL1', 'lider_red', '${RED_1}'),
        ('${id(205)}', '${USER.liderRed2}', '${IGLESIA_1}', 'RL2', 'lider_red', '${RED_2}'),
        ('${PERFIL_LIDER_GRUPO_1}', '${USER.liderGrupo1}', '${IGLESIA_1}', 'G1', 'lider_grupo', '${RED_1}'),
        ('${PERFIL_LIDER_GRUPO_2}', '${USER.liderGrupo2}', '${IGLESIA_1}', 'G2', 'lider_grupo', '${RED_2}'),
        ('${id(208)}', '${id(8)}', '${IGLESIA_2}', 'Pastor 2', 'pastor', null);
      insert into grupos (id, iglesia_id, red_id, lider_grupo_id, nombre) values
        ('${GRUPO_1}', '${IGLESIA_1}', '${RED_1}', '${PERFIL_LIDER_GRUPO_1}', 'g1'),
        ('${GRUPO_2}', '${IGLESIA_1}', '${RED_2}', '${PERFIL_LIDER_GRUPO_2}', 'g2'),
        ('${id(303)}', '${IGLESIA_2}', '${id(103)}', null, 'g otra iglesia');
      insert into miembros (id, grupo_id, nombre_completo) values
        ('${MIEMBRO_1}', '${GRUPO_1}', 'm1'),
        ('${id(402)}', '${GRUPO_2}', 'm2');
    `)
  })

  describe('group leader', () => {
    it('sees only their own groups, members, network and network leader', () =>
      as(USER.liderGrupo1, async () => {
        expect(await names('select nombre as n from grupos')).toBe('g1')
        expect(await names('select nombre_completo as n from miembros')).toBe('m1')
        expect(await names('select nombre_completo as n from perfiles')).toBe('G1,RL1')
        expect(await names('select nombre as n from redes')).toBe('Red 1')
      }))

    it('manages members and reports of their own group only', () =>
      as(USER.liderGrupo1, async () => {
        expect(await fails(`insert into miembros (grupo_id, nombre_completo) values ('${GRUPO_1}', 'new')`)).toBe(false)
        expect(await fails(`insert into miembros (grupo_id, nombre_completo) values ('${GRUPO_2}', 'x')`)).toBe(true)
        expect(
          await fails(
            `insert into reportes_grupo (id, grupo_id, semana, tema) values ('${REPORTE_GRUPO_1}', '${GRUPO_1}', '2026-11-02', 'Fe')`
          )
        ).toBe(false)
        expect(
          await fails(`insert into reportes_grupo_asistencia values ('${REPORTE_GRUPO_1}', '${MIEMBRO_1}', true)`)
        ).toBe(false)
        expect(await fails(`insert into reportes_grupo (grupo_id, semana) values ('${GRUPO_2}', '2026-11-02')`)).toBe(true)
      }))

    it('can edit group details but not reassign or move the group', () =>
      as(USER.liderGrupo1, async () => {
        expect(await fails(`update grupos set direccion = 'Calle 1' where id = '${GRUPO_1}'`)).toBe(false)
        expect(await fails(`update grupos set lider_grupo_id = '${PERFIL_LIDER_GRUPO_2}' where id = '${GRUPO_1}'`)).toBe(true)
        expect(await fails(`update grupos set red_id = '${RED_2}' where id = '${GRUPO_1}'`)).toBe(true)
      }))

    it('cannot create groups, networks or network reports', () =>
      as(USER.liderGrupo1, async () => {
        expect(
          await fails(`insert into grupos (iglesia_id, red_id, nombre) values ('${IGLESIA_1}', '${RED_1}', 'x')`)
        ).toBe(true)
        expect(await fails(`insert into redes (iglesia_id, nombre) values ('${IGLESIA_1}', 'x')`)).toBe(true)
        expect(await fails(`insert into reportes_red (red_id, semana) values ('${RED_1}', '2026-11-02')`)).toBe(true)
      }))
  })

  describe('network leader', () => {
    it('sees only their network', () =>
      as(USER.liderRed1, async () => {
        expect(await names('select nombre as n from grupos')).toBe('g1')
        expect(await names('select nombre_completo as n from perfiles')).toBe('G1,RL1')
        expect(await rows('select * from reportes_grupo')).toHaveLength(1)
      }))

    it('creates groups only in their network', () =>
      as(USER.liderRed1, async () => {
        expect(
          await fails(
            `insert into grupos (iglesia_id, red_id, lider_grupo_id, nombre) values ('${IGLESIA_1}', '${RED_1}', '${PERFIL_LIDER_GRUPO_1}', 'g1b')`
          )
        ).toBe(false)
        expect(
          await fails(`insert into grupos (iglesia_id, red_id, nombre) values ('${IGLESIA_1}', '${RED_2}', 'x')`)
        ).toBe(true)
      }))

    it('files the weekly report of their own network only', () =>
      as(USER.liderRed1, async () => {
        expect(
          await fails(
            `insert into reportes_red (id, red_id, semana) values ('${REPORTE_RED_1}', '${RED_1}', '2026-11-02')`
          )
        ).toBe(false)
        expect(await fails(`insert into reportes_red_grupos values ('${REPORTE_RED_1}', '${GRUPO_1}')`)).toBe(false)
        expect(await fails(`insert into reportes_red (red_id, semana) values ('${RED_2}', '2026-11-02')`)).toBe(true)
      }))

    it('rejects weeks that do not start on Monday', () =>
      as(USER.liderRed1, async () => {
        expect(await fails(`insert into reportes_red (red_id, semana) values ('${RED_1}', '2026-11-03')`)).toBe(true)
      }))

    it('does not see other networks data', () =>
      as(USER.liderRed2, async () => {
        const miembros = await rows<{ grupo_id: string }>('select grupo_id from miembros')
        expect(miembros.every((m) => m.grupo_id === GRUPO_2)).toBe(true)
        expect(await rows('select * from reportes_red')).toHaveLength(0)
      }))
  })

  describe('admin leader', () => {
    it('sees everything in their church', () =>
      as(USER.admin, async () => {
        expect(await names('select nombre as n from grupos')).toBe('g1,g1b,g2')
        expect(await rows('select * from reportes_red')).toHaveLength(1)
      }))

    it('manages networks of their own church and can move groups', () =>
      as(USER.admin, async () => {
        expect(await fails(`insert into redes (iglesia_id, nombre) values ('${IGLESIA_1}', 'Red 3')`)).toBe(false)
        expect(await fails(`insert into redes (iglesia_id, nombre) values ('${IGLESIA_2}', 'x')`)).toBe(true)
        expect(await fails(`update grupos set red_id = '${RED_2}' where nombre = 'g1b'`)).toBe(false)
      }))

    it('does not file network reports', () =>
      as(USER.admin, async () => {
        expect(await fails(`insert into reportes_red (red_id, semana) values ('${RED_2}', '2026-11-09')`)).toBe(true)
      }))
  })

  describe('church isolation and missing profiles', () => {
    it('keeps the pastor inside their church', () =>
      as(USER.pastor, async () => {
        expect(await names('select nombre as n from redes')).not.toContain('otra')
        const perfiles = await rows<{ iglesia_id: string }>('select iglesia_id from perfiles')
        expect(perfiles.every((p) => p.iglesia_id === IGLESIA_1)).toBe(true)
      }))

    it('shows nothing to a user without a profile', () =>
      as(USER.sinPerfil, async () => {
        expect(await rows('select * from grupos')).toHaveLength(0)
        expect(await rows('select * from perfiles')).toHaveLength(0)
      }))
  })

  describe('constraints', () => {
    it('allows a single active leader per network', async () => {
      expect(
        await fails(
          `insert into perfiles (auth_user_id, iglesia_id, nombre_completo, rol, red_id) values ('${USER.sinPerfil}', '${IGLESIA_1}', 'dup', 'lider_red', '${RED_1}')`
        )
      ).toBe(true)
    })

    it('rejects admin profiles attached to a network', async () => {
      expect(
        await fails(
          `insert into perfiles (auth_user_id, iglesia_id, nombre_completo, rol, red_id) values ('${USER.sinPerfil}', '${IGLESIA_1}', 'x', 'lider_admin', '${RED_1}')`
        )
      ).toBe(true)
    })
  })
})
