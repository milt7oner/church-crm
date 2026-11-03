# Casas de Vida — Centro Cristiano Casa del Rey Popayán

Web app (PWA) to follow up on home groups ("Casas de Vida"): networks, groups, members and weekly reports.

## Roles

| Role | Sees | Manages | Weekly report |
|---|---|---|---|
| Pastor | Everything in the church | Admin leaders, networks, network/group leaders, groups, members | — |
| Líder admin | Everything in the church | Networks, network/group leaders, groups, members | — |
| Líder de red | Their network | Group leaders and groups of their network | Groups followed up + notes |
| Líder de grupo | Their groups | Members and meeting details of their groups | Attendance, topic, notes |

Group members are records only; they do not log in. Leader accounts are created by whoever adds them.
Deleting is a soft delete (`activo = false`) so attendance history is kept.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Auth + Postgres with RLS) · pnpm.

## Setup

1. `pnpm install`
2. Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
3. Apply the SQL migrations in `supabase/migrations` (see `supabase/README.md`).
4. `pnpm dev` and open http://localhost:3000

## Scripts

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint`
- `pnpm test` — unit tests plus RLS tests that run the migration on an in-memory Postgres (PGlite)

## Code map

- `src/app/(app)/` — authenticated screens: `inicio`, `redes`, `grupos`, `lideres`, report forms
- `src/app/actions/` — server actions (each checks permissions before writing)
- `src/lib/permisos.ts` — permission rules, mirrored by the RLS policies in the migration
- `src/lib/semana.ts` — report weeks (Monday-based, America/Bogota)
- `src/proxy.ts` — session check for every app route
- `supabase/` — migrations, how to apply them, and RLS tests
