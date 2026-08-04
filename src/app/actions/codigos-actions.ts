// app/actions/codigos-actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function generarCodigoRegistro(horasVigencia: number = 6) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: adminPersona } = await supabase
    .from('personas')
    .select('id, iglesia_id, rol_sistema')
    .eq('auth_user_id', user.id)
    .single()

  if (!adminPersona || !['super_admin', 'pastor', 'encargado'].includes(adminPersona.rol_sistema)) {
    return { error: 'Sin permisos' }
  }

  const codigo = `VA-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
  const expiraEn = new Date(Date.now() + horasVigencia * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('codigos_registro')
    .insert({
      codigo,
      iglesia_id: adminPersona.iglesia_id,
      creado_por: adminPersona.id,
      expira_en: expiraEn,
    })
    .select('codigo, expira_en')
    .single()

  if (error) return { error: error.message }
  return { success: true, codigo: data.codigo, expiraEn: data.expira_en }
}

// 🎯 NUEVA FUNCIÓN: Obtener el código vigente más reciente
export async function obtenerCodigoActivo() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: adminPersona } = await supabase
    .from('personas')
    .select('iglesia_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!adminPersona) return null

  // Busca el último código creado para esta iglesia cuya expiración sea mayor a la hora actual
  const { data } = await supabase
    .from('codigos_registro')
    .select('codigo, expira_en')
    .eq('iglesia_id', adminPersona.iglesia_id)
    .gt('expira_en', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ? { codigo: data.codigo, expiraEn: data.expira_en } : null
}