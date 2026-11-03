import Link from 'next/link'

type PageHeaderProps = {
  titulo: string
  subtitulo?: React.ReactNode
  volver?: { href: string; label: string }
  children?: React.ReactNode
}

/** Page title row; `children` are the page actions (buttons, modals). */
export default function PageHeader({ titulo, subtitulo, volver, children }: PageHeaderProps) {
  return (
    <div className="space-y-2">
      {volver && (
        <Link href={volver.href} className="text-xs font-semibold text-gray-500 hover:text-[#006C69]">
          ← {volver.label}
        </Link>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{titulo}</h2>
          {subtitulo && <p className="text-xs text-gray-500 mt-0.5">{subtitulo}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </div>
  )
}
