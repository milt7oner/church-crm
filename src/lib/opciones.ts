import { createClient } from '@/lib/supabase/server'
import type { OpcionLider, OpcionRed, Perfil } from '@/lib/types'

/** Select options for the group form, already scoped by RLS to what the user can see. */
export async function cargarOpcionesGrupo(perfil: Pick<Perfil, 'rol' | 'red_id'>) {
  const supabase = await createClient()
  const [{ data: redes }, { data: lideres }] = await Promise.all([
    supabase.from('redes').select('id, nombre').eq('activo', true).order('nombre'),
    supabase
      .from('perfiles')
      .select('id, nombre_completo, red_id')
      .eq('rol', 'lider_grupo')
      .eq('activo', true)
      .order('nombre_completo'),
  ])

  return {
    redes: (redes ?? []) as OpcionRed[],
    lideres: (lideres ?? []) as OpcionLider[],
    redFija: perfil.rol === 'lider_red' ? perfil.red_id : null,
  }
}
