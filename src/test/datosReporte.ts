import type { DatosReporte } from '@/lib/estadisticas'

/** Small but complete report data set (one network, group, member and report). */
export const DATOS: DatosReporte = {
  semanas: ['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'],
  semanasAnteriores: ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05'],
  redes: [{ id: 'red-1', nombre: 'Norte', tipo: 'jovenes' }],
  grupos: [{ id: 'g1', nombre: 'Casa Ñuñoa', red_id: 'red-1', lider_grupo_id: 'lg1', created_at: '2026-01-01T00:00:00Z' }],
  lideres: [{ id: 'lg1', nombre_completo: 'Ana', rol: 'lider_grupo', red_id: 'red-1' }],
  miembros: [{ id: 'm1', grupo_id: 'g1', nombre_completo: 'José', telefono: '3001234567', fecha_ingreso: '2026-10-20' }],
  reportesGrupo: [
    {
      grupo_id: 'g1',
      semana: '2026-10-26',
      fecha_reunion: '2026-10-28',
      tema: 'Fe',
      novedades: 'Oración por la familia',
      visitantes: 2,
      asistencia: [{ miembro_id: 'm1', asistio: true }],
    },
  ],
  reportesRed: [{ red_id: 'red-1', semana: '2026-10-26', novedades: 'Visité el grupo', grupos: ['g1'] }],
}
