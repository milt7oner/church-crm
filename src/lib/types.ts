import type { TipoRed } from './redes'
import type { Rol } from './roles'

// Row shapes of the Casas de Vida tables (see supabase/migrations).

export type Perfil = {
  id: string
  auth_user_id: string
  iglesia_id: string
  nombre_completo: string
  email: string | null
  telefono: string | null
  rol: Rol
  red_id: string | null
  activo: boolean
}

export type Red = {
  id: string
  iglesia_id: string
  nombre: string
  tipo: TipoRed
  descripcion: string | null
  activo: boolean
}

export type Grupo = {
  id: string
  iglesia_id: string
  red_id: string
  lider_grupo_id: string | null
  nombre: string
  direccion: string | null
  dia_reunion: string | null
  hora_reunion: string | null
  activo: boolean
}

export type Miembro = {
  id: string
  grupo_id: string
  nombre_completo: string
  telefono: string | null
  direccion: string | null
  fecha_ingreso: string
  notas: string | null
  activo: boolean
}

export type ReporteGrupo = {
  id: string
  grupo_id: string
  semana: string
  fecha_reunion: string | null
  tema: string | null
  novedades: string | null
  updated_at: string
}

export type ReporteRed = {
  id: string
  red_id: string
  semana: string
  novedades: string | null
  updated_at: string
}

/** Standard result returned by every server action. */
export type ActionResult = { error: string } | { success: true }

export type OpcionRed = { id: string; nombre: string }
export type OpcionLider = { id: string; nombre_completo: string; red_id: string | null }
