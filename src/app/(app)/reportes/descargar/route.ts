import writeXlsxFile from 'write-excel-file/node'
import { getPerfilActual } from '@/lib/auth/perfil'
import { construirResumen, periodoDesdeParam } from '@/lib/estadisticas'
import { esTipoRed } from '@/lib/redes'
import { cargarDatosReporte } from '@/lib/reportes/datos'
import { hojasExcel, nombreArchivo } from '@/lib/reportes/excel'
import { esAdmin } from '@/lib/roles'
import { semanaActual } from '@/lib/semana'
import { createClient } from '@/lib/supabase/server'

/** Excel download of the church report (pastor and admin leaders only). Same filters as /reportes. */
export async function GET(request: Request) {
  const perfil = await getPerfilActual()
  if (!perfil || !esAdmin(perfil.rol)) {
    return new Response('Solo el pastor o un líder admin pueden descargar reportes.', { status: 403 })
  }

  const params = new URL(request.url).searchParams
  const periodo = periodoDesdeParam(params.get('periodo') ?? undefined)
  const tipoParam = params.get('tipo')
  const tipo = esTipoRed(tipoParam) ? tipoParam : null
  const redId = params.get('red') || null
  const semana = semanaActual()

  const supabase = await createClient()
  const datos = await cargarDatosReporte(supabase, { periodo, semanaActual: semana, tipo, redId })
  const resumen = construirResumen(datos, semana)
  const redNombre = redId ? (datos.redes.find((r) => r.id === redId)?.nombre ?? null) : null

  const buffer = await writeXlsxFile(hojasExcel(resumen, datos, { tipo, redNombre })).toBuffer()

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombreArchivo(resumen)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
