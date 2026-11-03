'use client'

import { useState } from 'react'
import { actualizarLider, crearLider } from '@/app/actions/lideres-actions'
import Modal from '@/components/ui/Modal'
import { useActionForm } from '@/components/ui/useActionForm'
import { ROL_LABEL, rolRequiereRed, type Rol } from '@/lib/roles'
import { alertError, btnPrimary, btnSecondary, input, label } from '@/lib/ui'

export type OpcionRed = { id: string; nombre: string }

export type LiderEditable = {
  id: string
  nombre_completo: string
  telefono: string | null
  rol: Rol
  red_id: string | null
}

type LiderFormModalProps = {
  rolesDisponibles: Rol[]
  redes: OpcionRed[]
  /** Network leaders always create inside their own network. */
  redFija: string | null
  lider?: LiderEditable
  abierto: boolean
  onCerrar: () => void
}

export default function LiderFormModal({ rolesDisponibles, redes, redFija, lider, abierto, onCerrar }: LiderFormModalProps) {
  const esEdicion = Boolean(lider)
  const [form, setForm] = useState({
    nombreCompleto: lider?.nombre_completo ?? '',
    telefono: lider?.telefono ?? '',
    email: '',
    password: '',
    rol: lider?.rol ?? rolesDisponibles[rolesDisponibles.length - 1],
    redId: lider?.red_id ?? redFija ?? '',
  })
  const { pending, error, setError, run } = useActionForm(onCerrar)

  const set = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [campo]: e.target.value })

  const necesitaRed = rolRequiereRed(form.rol)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (necesitaRed && !form.redId) {
      setError('Selecciona una red.')
      return
    }
    const datos = {
      nombreCompleto: form.nombreCompleto,
      telefono: form.telefono,
      rol: form.rol,
      redId: necesitaRed ? form.redId : null,
    }
    run(() =>
      lider ? actualizarLider(lider.id, datos) : crearLider({ ...datos, email: form.email, password: form.password })
    )
  }

  return (
    <Modal titulo={esEdicion ? 'Editar líder' : 'Nuevo líder'} abierto={abierto} onCerrar={onCerrar}>
      {error && <div className={alertError}>{error}</div>}

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className={label}>Nombre completo *</label>
          <input required value={form.nombreCompleto} onChange={set('nombreCompleto')} className={input} />
        </div>

        <div>
          <label className={label}>Teléfono</label>
          <input type="tel" value={form.telefono} onChange={set('telefono')} className={input} />
        </div>

        {!esEdicion && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>Correo *</label>
              <input type="email" required value={form.email} onChange={set('email')} className={input} />
            </div>
            <div>
              <label className={label}>Contraseña inicial *</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={set('password')}
                className={input}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label}>Rol *</label>
            <select value={form.rol} onChange={set('rol')} className={input} disabled={rolesDisponibles.length === 1}>
              {rolesDisponibles.map((rol) => (
                <option key={rol} value={rol}>
                  {ROL_LABEL[rol]}
                </option>
              ))}
            </select>
          </div>

          {necesitaRed && (
            <div>
              <label className={label}>Red *</label>
              <select value={form.redId} onChange={set('redId')} className={input} disabled={Boolean(redFija)}>
                <option value="">Selecciona...</option>
                {redes.map((red) => (
                  <option key={red.id} value={red.id}>
                    {red.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
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
