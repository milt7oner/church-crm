'use client'

import { useState } from 'react'
import { actualizarGrupo, crearGrupo, desactivarGrupo } from '@/app/actions/grupos-actions'
import ConfirmButton from '@/components/ui/ConfirmButton'
import Modal from '@/components/ui/Modal'
import { useActionForm } from '@/components/ui/useActionForm'
import { DIAS_SEMANA } from '@/lib/semana'
import type { OpcionLider, OpcionRed } from '@/lib/types'
import { alertError, btnLink, btnPrimary, btnSecondary, input, label } from '@/lib/ui'

export type GrupoEditable = {
  id: string
  nombre: string
  red_id: string
  lider_grupo_id: string | null
  direccion: string | null
  dia_reunion: string | null
  hora_reunion: string | null
}

type Opciones = {
  redes: OpcionRed[]
  lideres: OpcionLider[]
  /** Set for network leaders: groups always belong to their network. */
  redFija: string | null
}

type GrupoFormModalProps = Opciones & {
  grupo?: GrupoEditable
  /** Group leaders only edit the meeting details. */
  soloDetalles?: boolean
  onCerrar: () => void
}

function GrupoFormModal({ grupo, redes, lideres, redFija, soloDetalles = false, onCerrar }: GrupoFormModalProps) {
  const [form, setForm] = useState({
    nombre: grupo?.nombre ?? '',
    redId: grupo?.red_id ?? redFija ?? '',
    liderGrupoId: grupo?.lider_grupo_id ?? '',
    direccion: grupo?.direccion ?? '',
    diaReunion: grupo?.dia_reunion ?? '',
    horaReunion: grupo?.hora_reunion?.slice(0, 5) ?? '',
  })
  const { pending, error, run } = useActionForm(onCerrar)

  const set = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value
    // Changing the network clears a leader that belongs to another network
    setForm((prev) => ({ ...prev, [campo]: value, ...(campo === 'redId' ? { liderGrupoId: '' } : {}) }))
  }

  const lideresDeRed = lideres.filter((l) => l.red_id === form.redId)

  return (
    <Modal titulo={grupo ? 'Editar grupo' : 'Nuevo grupo'} abierto onCerrar={onCerrar}>
      {error && <div className={alertError}>{error}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(() => (grupo ? actualizarGrupo(grupo.id, form) : crearGrupo(form)))
        }}
        className="space-y-3"
      >
        <div>
          <label className={label}>Nombre del grupo *</label>
          <input required value={form.nombre} onChange={set('nombre')} className={input} placeholder="Ej: Casa de Vida Los Andes" />
        </div>

        {!soloDetalles && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>Red *</label>
              <select required value={form.redId} onChange={set('redId')} className={input} disabled={Boolean(redFija)}>
                <option value="">Selecciona...</option>
                {redes.map((red) => (
                  <option key={red.id} value={red.id}>
                    {red.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Líder de grupo</label>
              <select value={form.liderGrupoId} onChange={set('liderGrupoId')} className={input} disabled={!form.redId}>
                <option value="">Sin asignar</option>
                {lideresDeRed.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre_completo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div>
          <label className={label}>Dirección</label>
          <input value={form.direccion} onChange={set('direccion')} className={input} placeholder="Ej: Calle 10 # 5-20, Barrio Centro" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Día de reunión</label>
            <select value={form.diaReunion} onChange={set('diaReunion')} className={input}>
              <option value="">—</option>
              {DIAS_SEMANA.map((dia) => (
                <option key={dia} value={dia}>
                  {dia}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Hora</label>
            <input type="time" value={form.horaReunion} onChange={set('horaReunion')} className={input} />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onCerrar} className={`${btnSecondary} flex-1`}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={`${btnPrimary} flex-1`}>
            {pending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function NuevoGrupoBoton(props: Opciones) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={btnPrimary}>
        + Nuevo grupo
      </button>
      {abierto && <GrupoFormModal {...props} onCerrar={() => setAbierto(false)} />}
    </>
  )
}

export function GrupoAcciones({
  grupo,
  puedeAdministrar,
  ...opciones
}: Opciones & { grupo: GrupoEditable; puedeAdministrar: boolean }) {
  const [editando, setEditando] = useState(false)
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => setEditando(true)} className={btnLink}>
        Editar grupo
      </button>
      {puedeAdministrar && (
        <ConfirmButton
          label="Desactivar"
          confirmacion={`¿Desactivar el grupo "${grupo.nombre}"? Dejará de aparecer en los reportes.`}
          accion={() => desactivarGrupo(grupo.id)}
        />
      )}
      {editando && (
        <GrupoFormModal {...opciones} grupo={grupo} soloDetalles={!puedeAdministrar} onCerrar={() => setEditando(false)} />
      )}
    </div>
  )
}
