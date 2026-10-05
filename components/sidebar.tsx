'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

type ItemMenu = {
  href: string
  label: string
  icono: ReactNode
}

const MENU_PRINCIPAL: ItemMenu[] = [
  {
    href: '/',
    label: 'Inicio',
    icono: <IconoInicio />,
  },
  {
    href: '/asociados',
    label: 'Asociados',
    icono: <IconoAsociados />,
  },
  {
    href: '/stock',
    label: 'Stock',
    icono: <IconoStock />,
  },
  {
    href: '/dispensa',
    label: 'Dispensa',
    icono: <IconoDispensa />,
  },
  {
    href: '/cultivo',
    label: 'Cultivo',
    icono: <IconoCultivo />,
  },
  {
    href: '/finanzas',
    label: 'Finanzas',
    icono: <IconoFinanzas />,
  },
]

const MENU_INFERIOR: ItemMenu[] = [
  {
    href: '/administracion',
    label: 'Administración',
    icono: <IconoAdministracion />,
  },
  {
    href: '/configuracion',
    label: 'Configuración',
    icono: <IconoConfiguracion />,
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  function estaActivo(
    href: string
  ) {
    if (href === '/') {
      return pathname === '/'
    }

    return (
      pathname === href ||
      pathname.startsWith(
        `${href}/`
      )
    )
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] border-r border-zinc-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-100 px-4 py-4">
          <Link
            href="/"
            aria-label="Ir a Inicio de Green Supply"
            className="flex min-h-[84px] items-center justify-center rounded-xl transition hover:bg-zinc-50"
          >
            <Image
              src="/green-supply-logo.png"
              alt="Green Supply · ONG Cannábica"
              width={881}
              height={338}
              priority
              className="h-auto w-full max-w-[205px] object-contain"
            />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">
            Gestión
          </p>

          <div className="space-y-1">
            {MENU_PRINCIPAL.map(
              (item) => (
                <LinkMenu
                  key={item.href}
                  item={item}
                  activo={estaActivo(
                    item.href
                  )}
                />
              )
            )}
          </div>
        </nav>

        <div className="border-t border-zinc-100 px-3 py-4">
          <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">
            Sistema
          </p>

          <div className="space-y-1">
            {MENU_INFERIOR.map(
              (item) => (
                <LinkMenu
                  key={item.href}
                  item={item}
                  activo={estaActivo(
                    item.href
                  )}
                />
              )
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

function LinkMenu({
  item,
  activo,
}: {
  item: ItemMenu
  activo: boolean
}) {
  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        activo
          ? 'bg-emerald-50 text-emerald-800'
          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
          activo
            ? 'bg-white text-emerald-700 shadow-sm'
            : 'text-zinc-400 group-hover:text-zinc-700'
        }`}
      >
        {item.icono}
      </span>

      <span className="truncate">
        {item.label}
      </span>

      {activo && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-600" />
      )}
    </Link>
  )
}

function IconBase({
  children,
}: {
  children: ReactNode
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function IconoInicio() {
  return (
    <IconBase>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V20h13v-9.5" />
      <path d="M9.5 20v-5.5h5V20" />
    </IconBase>
  )
}

function IconoAsociados() {
  return (
    <IconBase>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6" />
      <path d="M15.5 5.5a3 3 0 0 1 0 5.5" />
      <path d="M16.5 14.5c2.3.5 3.6 2.3 4 5.5" />
    </IconBase>
  )
}

function IconoStock() {
  return (
    <IconBase>
      <path d="m4 7 8-4 8 4-8 4-8-4Z" />
      <path d="M4 7v10l8 4 8-4V7" />
      <path d="M12 11v10" />
    </IconBase>
  )
}

function IconoDispensa() {
  return (
    <IconBase>
      <path d="M6 3h12v18H6z" />
      <path d="M9 7h6" />
      <path d="M9 11h6" />
      <path d="M9 15h3" />
    </IconBase>
  )
}

function IconoCultivo() {
  return (
    <IconBase>
      <path d="M12 21V10" />
      <path d="M12 13c-4 0-7-2.2-7-6 4 0 7 2.2 7 6Z" />
      <path d="M12 10c4 0 7-2.2 7-6-4 0-7 2.2-7 6Z" />
    </IconBase>
  )
}

function IconoFinanzas() {
  return (
    <IconBase>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </IconBase>
  )
}

function IconoAdministracion() {
  return (
    <IconBase>
      <path d="M4 20V8l8-4 8 4v12" />
      <path d="M8 12h8" />
      <path d="M8 16h8" />
    </IconBase>
  )
}

function IconoConfiguracion() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </IconBase>
  )
}
