'use client'

import { useState } from 'react'
import { desactivarLider } from '@/app/actions/lideres-actions'
import ResetPasswordModal from '@/components/ResetPasswordModal'
import ConfirmButton from '@/components/ui/ConfirmButton'
import type { Rol } from '@/lib/roles'
import type { OpcionRed } from '@/lib/types'
import { btnLink, btnPrimary } from '@/lib/ui'
import LiderFormModal, { type LiderEditable } from './LiderFormModal'

type Comunes = { rolesDisponibles: Rol[]; redes: OpcionRed[]; redFija: string | null }

export function NuevoLiderBoton(props: Comunes) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={btnPrimary}>
        + Nuevo líder
      </button>
      {/* Remount on open so the form starts empty */}
      {abierto && <LiderFormModal {...props} abierto onCerrar={() => setAbierto(false)} />}
    </>
  )
}

export function LiderAcciones({ lider, ...props }: Comunes & { lider: LiderEditable }) {
  const [modal, setModal] = useState<'editar' | 'clave' | null>(null)
  const cerrar = () => setModal(null)

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => setModal('editar')} className={btnLink}>
        Editar
      </button>
      <button type="button" onClick={() => setModal('clave')} className={btnLink}>
        Clave
      </button>
      <ConfirmButton
        label="Desactivar"
        confirmacion={`¿Desactivar a ${lider.nombre_completo}? Ya no podrá ingresar al sistema.`}
        accion={() => desactivarLider(lider.id)}
      />

      {modal === 'editar' && <LiderFormModal {...props} lider={lider} abierto onCerrar={cerrar} />}
      <ResetPasswordModal
        perfilId={lider.id}
        nombrePersona={lider.nombre_completo}
        isOpen={modal === 'clave'}
        onClose={cerrar}
      />
    </div>
  )
}
