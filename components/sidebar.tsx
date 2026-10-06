'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  usePathname,
  useRouter,
} from 'next/navigation'
import {
  useEffect,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  const router = useRouter()

  const [
    menuMovilAbierto,
    setMenuMovilAbierto,
  ] = useState(false)

  const [
    cerrandoSesion,
    setCerrandoSesion,
  ] = useState(false)

  useEffect(() => {
    setMenuMovilAbierto(false)
  }, [pathname])

  useEffect(() => {
    if (menuMovilAbierto) {
      document.body.style.overflow =
        'hidden'
    } else {
      document.body.style.overflow =
        ''
    }

    return () => {
      document.body.style.overflow =
        ''
    }
  }, [menuMovilAbierto])

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

  async function cerrarSesion() {
    if (cerrandoSesion) return

    setCerrandoSesion(true)

    try {
      const supabase =
        createClient()

      const { error } =
        await supabase.auth.signOut()

      if (error) {
        console.error(
          'Error al cerrar sesión:',
          error.message
        )

        return
      }

      setMenuMovilAbierto(false)

      router.replace('/login')
      router.refresh()
    } catch (error) {
      console.error(
        'Error inesperado al cerrar sesión:',
        error
      )
    } finally {
      setCerrandoSesion(false)
    }
  }

  return (
    <>
      {/* =====================================================
          DESKTOP
      ====================================================== */}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] border-r border-zinc-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-full flex-col">

          <Logo />

          <nav className="flex-1 overflow-y-auto px-3 py-4">

            <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">
              Gestión
            </p>

            <div className="space-y-1">

              {MENU_PRINCIPAL.map(
                (item) => (
                  <LinkMenu
                    key={
                      item.href
                    }
                    item={
                      item
                    }
                    activo={
                      estaActivo(
                        item.href
                      )
                    }
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
                    key={
                      item.href
                    }
                    item={
                      item
                    }
                    activo={
                      estaActivo(
                        item.href
                      )
                    }
                  />
                )
              )}

              <BotonCerrarSesion
                cerrando={
                  cerrandoSesion
                }
                onClick={
                  cerrarSesion
                }
              />

            </div>

          </div>

        </div>
      </aside>

      {/* =====================================================
          MOBILE — BARRA SUPERIOR
      ====================================================== */}

      <div className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur lg:hidden">

        <div className="flex h-[64px] items-center justify-between px-4">

          <Link
            href="/"
            aria-label="Inicio Green Supply"
            className="flex items-center"
          >
            <Image
              src="/green-supply-logo.png"
              alt="Green Supply"
              width={881}
              height={338}
              priority
              className="h-auto w-[132px] object-contain"
            />
          </Link>

          <button
            type="button"
            onClick={() =>
              setMenuMovilAbierto(
                true
              )
            }
            aria-label="Abrir menú"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition active:scale-95"
          >
            <IconoMenu />
          </button>

        </div>

      </div>

      {/* =====================================================
          MOBILE — FONDO
      ====================================================== */}

      {menuMovilAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() =>
            setMenuMovilAbierto(
              false
            )
          }
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* =====================================================
          MOBILE — PANEL
      ====================================================== */}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-[340px] flex-col border-l border-zinc-200 bg-white shadow-2xl transition-transform duration-200 lg:hidden ${
          menuMovilAbierto
            ? 'translate-x-0'
            : 'translate-x-full'
        }`}
      >

        {/* CABECERA */}

        <div className="flex h-[70px] items-center justify-between border-b border-zinc-100 px-4">

          <Image
            src="/green-supply-logo.png"
            alt="Green Supply"
            width={881}
            height={338}
            className="h-auto w-[145px] object-contain"
          />

          <button
            type="button"
            onClick={() =>
              setMenuMovilAbierto(
                false
              )
            }
            aria-label="Cerrar menú"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition active:scale-95"
          >
            <IconoCerrar />
          </button>

        </div>

        {/* NAVEGACION */}

        <nav className="flex-1 overflow-y-auto px-3 py-4">

          <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">
            Gestión
          </p>

          <div className="space-y-1">

            {MENU_PRINCIPAL.map(
              (item) => (
                <LinkMenu
                  key={
                    item.href
                  }
                  item={
                    item
                  }
                  activo={
                    estaActivo(
                      item.href
                    )
                  }
                  movil
                  onNavigate={() =>
                    setMenuMovilAbierto(
                      false
                    )
                  }
                />
              )
            )}

          </div>

        </nav>

        {/* SISTEMA */}

        <div className="border-t border-zinc-100 px-3 py-4">

          <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">
            Sistema
          </p>

          <div className="space-y-1">

            {MENU_INFERIOR.map(
              (item) => (
                <LinkMenu
                  key={
                    item.href
                  }
                  item={
                    item
                  }
                  activo={
                    estaActivo(
                      item.href
                    )
                  }
                  movil
                  onNavigate={() =>
                    setMenuMovilAbierto(
                      false
                    )
                  }
                />
              )
            )}

            <div className="pt-2">

              <BotonCerrarSesion
                cerrando={
                  cerrandoSesion
                }
                onClick={
                  cerrarSesion
                }
                movil
              />

            </div>

          </div>

        </div>

      </aside>
    </>
  )
}

function Logo() {
  return (
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
  )
}

function LinkMenu({
  item,
  activo,
  movil = false,
  onNavigate,
}: {
  item: ItemMenu
  activo: boolean
  movil?: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={
        item.href
      }
      onClick={
        onNavigate
      }
      className={`group flex items-center gap-3 rounded-xl px-3 ${
        movil
          ? 'py-3'
          : 'py-2.5'
      } text-sm font-medium transition ${
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

function BotonCerrarSesion({
  cerrando,
  onClick,
  movil = false,
}: {
  cerrando: boolean
  onClick: () => void
  movil?: boolean
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      disabled={
        cerrando
      }
      className={`group flex w-full items-center gap-3 rounded-xl px-3 ${
        movil
          ? 'py-3'
          : 'py-2.5'
      } text-sm font-medium text-zinc-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50`}
    >

      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition group-hover:text-red-600">
        <IconoSalir />
      </span>

      <span>
        {cerrando
          ? 'Cerrando sesión...'
          : 'Cerrar sesión'}
      </span>

    </button>
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

function IconoMenu() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  )
}

function IconoCerrar() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  )
}

function IconoSalir() {
  return (
    <IconBase>
      <path d="M10 5H5v14h5" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H9" />
    </IconBase>
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