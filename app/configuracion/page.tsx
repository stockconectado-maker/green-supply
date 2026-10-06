import Link from 'next/link'
import type { ReactNode } from 'react'

export default function ConfiguracionPage() {
  return (
    <main className="min-h-screen bg-[#f5f6f7]">
      <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-8">

        {/* CABECERA */}

        <div className="mb-7">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Sistema
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Configuración
          </h1>

          <p className="mt-1.5 text-sm text-zinc-500">
            Seguridad y ajustes generales de Green Supply.
          </p>
        </div>

        {/* CONFIGURACIÓN */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

          <Tarjeta
            href="/configuracion/seguridad"
            icono={<IconoSeguridad />}
            titulo="Seguridad"
            descripcion="Administrá tu contraseña y la seguridad de tu cuenta."
            disponible
          />

          <Tarjeta
            href="/configuracion/cuotas"
            icono={<IconoCuotas />}
            titulo="Cuotas"
            descripcion="Importes y configuración de cuotas sociales."
            disponible
          />

          <Tarjeta
            href="/configuracion/costos-base"
            icono={<IconoCostos />}
            titulo="Costos base"
            descripcion="Valor del kWh, nutrientes y referencias para calcular costos."
            disponible
          />

          <Tarjeta
            icono={<IconoUsuarios />}
            titulo="Usuarios y permisos"
            descripcion="Administración de cuentas y permisos."
          />

          <Tarjeta
            icono={<IconoAsociacion />}
            titulo="Datos de la asociación"
            descripcion="Información institucional."
          />

          <Tarjeta
            icono={<IconoAjustes />}
            titulo="Parámetros"
            descripcion="Ajustes generales del sistema."
          />

        </div>
      </div>
    </main>
  )
}

function Tarjeta({
  href,
  icono,
  titulo,
  descripcion,
  disponible = false,
}: {
  href?: string
  icono: ReactNode
  titulo: string
  descripcion: string
  disponible?: boolean
}) {
  const contenido = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            disponible
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-zinc-100 text-zinc-500'
          }`}
        >
          {icono}
        </div>

        {disponible ? (
          <span className="text-zinc-400">
            ↗
          </span>
        ) : (
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-500">
            Próximamente
          </span>
        )}
      </div>

      <h2 className="mt-5 text-sm font-semibold text-zinc-950">
        {titulo}
      </h2>

      <p className="mt-1 text-xs leading-5 text-zinc-500">
        {descripcion}
      </p>
    </>
  )

  const clases =
    'block rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm'

  if (disponible && href) {
    return (
      <Link
        href={href}
        className={`${clases} transition hover:border-emerald-300 hover:shadow-md`}
      >
        {contenido}
      </Link>
    )
  }

  return (
    <div className={`${clases} opacity-75`}>
      {contenido}
    </div>
  )
}

function IconoSeguridad() {
  return (
    <Icono ruta="M6 10V7a6 6 0 0 1 12 0v3M5 10h14v11H5z" />
  )
}

function IconoCuotas() {
  return (
    <Icono ruta="M12 3v18M16 7H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H7" />
  )
}

function IconoCostos() {
  return (
    <Icono ruta="M4 19h16M6 16V9M12 16V5M18 16v-4M5 5h2M11 3h2M17 8h2" />
  )
}

function IconoUsuarios() {
  return (
    <Icono
      ruta="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-2a7 7 0 0 1 14 0v2M17 4a4 4 0 0 1 0 8M18 15a6 6 0 0 1 4 6"
    />
  )
}

function IconoAsociacion() {
  return (
    <Icono ruta="M4 21h16M6 21V9h12v12M3 9l9-6 9 6M9 13h6M9 17h6" />
  )
}

function IconoAjustes() {
  return (
    <Icono
      ruta="M4 7h10M18 7h2M4 17h2M10 17h10M4 12h5M13 12h7M16 5v4M8 15v4M11 10v4"
    />
  )
}

function Icono({
  ruta,
}: {
  ruta: string
}) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ruta} />
    </svg>
  )
}