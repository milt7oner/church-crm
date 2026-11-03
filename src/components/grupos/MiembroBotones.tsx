'use client'

import { useState } from 'react'
import { actualizarMiembro, crearMiembro, desactivarMiembro } from '@/app/actions/miembros-actions'
import ConfirmButton from '@/components/ui/ConfirmButton'
import Modal from '@/components/ui/Modal'
import { useActionForm } from '@/components/ui/useActionForm'
import { alertError, btnLink, btnPrimary, btnSecondary, input, label } from '@/lib/ui'

export type MiembroEditable = {
  id: string
  nombre_completo: string
  telefono: string | null
  direccion: string | null
  fecha_ingreso: string
  notas: string | null
}

function MiembroFormModal({ grupoId, miembro, hoy, onCerrar }: { grupoId: string; miembro?: MiembroEditable; hoy: string; onCerrar: () => void }) {
  const [form, setForm] = useState({
    nombreCompleto: miembro?.nombre_completo ?? '',
    telefono: miembro?.telefono ?? '',
    direccion: miembro?.direccion ?? '',
    fechaIngreso: miembro?.fecha_ingreso ?? hoy,
    notas: miembro?.notas ?? '',
  })
  const { pending, error, run } = useActionForm(onCerrar)
  const set = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [campo]: e.target.value })

  return (
    <Modal titulo={miembro ? 'Editar miembro' : 'Nuevo miembro'} abierto onCerrar={onCerrar}>
      {error && <div className={alertError}>{error}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(() => (miembro ? actualizarMiembro(miembro.id, form) : crearMiembro(grupoId, form)))
        }}
        className="space-y-3"
      >
        <div>
          <label className={label}>Nombre completo *</label>
          <input required value={form.nombreCompleto} onChange={set('nombreCompleto')} className={input} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Teléfono</label>
            <input type="tel" value={form.telefono} onChange={set('telefono')} className={input} />
          </div>
          <div>
            <label className={label}>Fecha de ingreso</label>
            <input type="date" value={form.fechaIngreso} max={hoy} onChange={set('fechaIngreso')} className={input} />
          </div>
        </div>
        <div>
          <label className={label}>Dirección</label>
          <input value={form.direccion} onChange={set('direccion')} className={input} />
        </div>
        <div>
          <label className={label}>Notas</label>
          <textarea rows={2} value={form.notas} onChange={set('notas')} className={input} />
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

export function NuevoMiembroBoton({ grupoId, hoy }: { grupoId: string; hoy: string }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={btnPrimary}>
        + Agregar miembro
      </button>
      {abierto && <MiembroFormModal grupoId={grupoId} hoy={hoy} onCerrar={() => setAbierto(false)} />}
    </>
  )
}

export function MiembroAcciones({ grupoId, miembro, hoy }: { grupoId: string; miembro: MiembroEditable; hoy: string }) {
  const [editando, setEditando] = useState(false)
  return (
    <div className="flex items-center gap-3 shrink-0">
      <button type="button" onClick={() => setEditando(true)} className={btnLink}>
        Editar
      </button>
      <ConfirmButton
        label="Eliminar"
        confirmacion={`¿Eliminar a ${miembro.nombre_completo} del grupo? Su historial de asistencia se conserva.`}
        accion={() => desactivarMiembro(miembro.id)}
      />
      {editando && <MiembroFormModal grupoId={grupoId} miembro={miembro} hoy={hoy} onCerrar={() => setEditando(false)} />}
    </div>
  )
}
