'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  calcularProximaAccion,
  ESTADOS_ASOCIADO,
  ESTADOS_REPROCANN,
  numeroSocio,
} from '@/lib/asociados'

type Asociado = {
  id: number
  numero_socio: string | null
  nombre_apellido: string | null
  dni: string | null
  telefono: string | null
  email: string | null
  fecha_nacimiento: string | null
  estado_asociado: string | null
  estado_reprocann: string | null
  numero_reprocann: string | null
  vencimiento_reprocann: string | null
  documentacion: string | null
  fecha_alta: string | null
  proxima_accion: string | null
  fecha_seguimiento: string | null
  observaciones: string | null
}

export default function AsociadosClient({
  asociados,
}: {
  asociados: Asociado[]
}) {
  const router = useRouter()

  const [busqueda, setBusqueda] =
    useState('')

  const [estado, setEstado] =
    useState('Todos')

  const [reprocann, setReprocann] =
    useState('Todos')

  const normalizar = (
    valor: string | null | undefined
  ) =>
    (valor ?? '')
      .toLowerCase()
      .trim()

  const filtrados = useMemo(() => {
    return asociados.filter((asociado) => {
      const codigo =
        numeroSocio(asociado.id)

      const textoBusqueda = [
        codigo,
        asociado.nombre_apellido,
        asociado.dni,
        asociado.telefono,
        asociado.email,
      ]
        .join(' ')
        .toLowerCase()

      const coincideBusqueda =
        textoBusqueda.includes(
          busqueda.toLowerCase()
        )

      const coincideEstado =
        estado === 'Todos' ||
        normalizar(
          asociado.estado_asociado
        ) === normalizar(estado)

      const coincideReprocann =
        reprocann === 'Todos' ||
        normalizar(
          asociado.estado_reprocann
        ) === normalizar(reprocann)

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincideReprocann
      )
    })
  }, [
    asociados,
    busqueda,
    estado,
    reprocann,
  ])

  const total =
    asociados.length

  const activos =
    asociados.filter(
      (asociado) =>
        normalizar(
          asociado.estado_asociado
        ) === 'asociado activo'
    ).length

  const enTramite =
    asociados.filter(
      (asociado) =>
        normalizar(
          asociado.estado_reprocann
        ) === 'en trámite'
    ).length

  const documentacionPendiente =
    asociados.filter(
      (asociado) =>
        normalizar(
          asociado.documentacion
        ) === 'pendiente'
    ).length

  const porVencer =
    asociados.filter(
      (asociado) => {
        if (
          !asociado.vencimiento_reprocann
        ) {
          return false
        }

        const hoy =
          new Date()

        const vencimiento =
          new Date(
            `${asociado.vencimiento_reprocann}T12:00:00`
          )

        const diferencia =
          (
            vencimiento.getTime() -
            hoy.getTime()
          ) /
          (
            1000 *
            60 *
            60 *
            24
          )

        return (
          diferencia >= 0 &&
          diferencia <= 30
        )
      }
    ).length

  // ==========================================
  // CUPO DE FLORACION
  // 9 plantas por asociado computable
  // ==========================================

  const asociadosComputables =
    asociados.filter(
      (asociado) => {
        const esActivo =
          normalizar(
            asociado.estado_asociado
          ) === 'asociado activo'

        const reprocannAprobado =
          normalizar(
            asociado.estado_reprocann
          ) === 'aprobado'

        if (
          !esActivo ||
          !reprocannAprobado
        ) {
          return false
        }

        if (
          !asociado.vencimiento_reprocann
        ) {
          return true
        }

        const hoy =
          new Date()

        const vencimiento =
          new Date(
            `${asociado.vencimiento_reprocann}T23:59:59`
          )

        return (
          vencimiento.getTime() >=
          hoy.getTime()
        )
      }
    ).length

  const CUPO_POR_ASOCIADO = 9

  const cupoMaximoFloracion =
    asociadosComputables *
    CUPO_POR_ASOCIADO

  const hayFiltros =
    busqueda !== '' ||
    estado !== 'Todos' ||
    reprocann !== 'Todos'

  function limpiarFiltros() {
    setBusqueda('')
    setEstado('Todos')
    setReprocann('Todos')
  }

  function abrirFicha(id: number) {
    router.push(
      `/asociados/${id}`
    )
  }

  function badgeEstado(
    valor: string | null
  ) {
    const texto =
      normalizar(valor)

    if (
      texto.includes('inactivo') ||
      texto.includes('baja') ||
      texto.includes('vencido')
    ) {
      return 'border-red-200 bg-red-50 text-red-700'
    }

    if (
      texto.includes('activo') ||
      texto.includes('completa')
    ) {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    }

    if (
      texto.includes('aprobado')
    ) {
      return 'border-blue-200 bg-blue-50 text-blue-700'
    }

    if (
      texto.includes('trámite') ||
      texto.includes('pendiente')
    ) {
      return 'border-amber-200 bg-amber-50 text-amber-700'
    }

    return 'border-zinc-200 bg-zinc-100 text-zinc-700'
  }

  function formatFecha(
    fecha: string | null
  ) {
    if (!fecha) {
      return '—'
    }

    return new Intl.DateTimeFormat(
      'es-AR'
    ).format(
      new Date(
        `${fecha}T12:00:00`
      )
    )
  }

  function estadoVencimiento(
    fecha: string | null
  ) {
    if (!fecha) {
      return {
        texto: '—',
        clase: 'text-zinc-400',
      }
    }

    const hoy =
      new Date()

    const vencimiento =
      new Date(
        `${fecha}T12:00:00`
      )

    const diferencia =
      (
        vencimiento.getTime() -
        hoy.getTime()
      ) /
      (
        1000 *
        60 *
        60 *
        24
      )

    if (diferencia < 0) {
      return {
        texto:
          formatFecha(fecha),

        clase:
          'font-medium text-red-600',
      }
    }

    if (diferencia <= 30) {
      return {
        texto:
          formatFecha(fecha),

        clase:
          'font-medium text-amber-600',
      }
    }

    return {
      texto:
        formatFecha(fecha),

      clase:
        'text-zinc-700',
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f6f7]">

      <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-8">

        {/* CABECERA */}

        <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">

          <div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Gestión de personas
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Asociados
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Alta, seguimiento y estado general de los asociados de Green Supply.
            </p>

          </div>

          <Link
            href="/asociados/nuevo"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
          >
            <span className="text-lg leading-none">
              +
            </span>

            Nuevo asociado
          </Link>

        </div>

        {/* INDICADORES */}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">

          <Tarjeta
            titulo="Total asociados"
            valor={total}
            descripcion="Registros cargados"
          />

          <Tarjeta
            titulo="Activos"
            valor={activos}
            descripcion="Asociados habilitados"
          />

          <Tarjeta
            titulo="REPROCANN en trámite"
            valor={enTramite}
            descripcion="Esperando resolución"
          />

          <Tarjeta
            titulo="Por vencer"
            valor={porVencer}
            descripcion="Próximos 30 días"
          />

          <Tarjeta
            titulo="Documentación pendiente"
            valor={
              documentacionPendiente
            }
            descripcion="Requieren atención"
          />

          <Tarjeta
            titulo="Cupo floración"
            valor={cupoMaximoFloracion}
            descripcion={`${asociadosComputables} ${
              asociadosComputables === 1
                ? 'asociado'
                : 'asociados'
            } × 9 plantas`}
            destacada
          />

        </div>

        {/* LISTADO */}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

          <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 px-5 py-5 lg:flex-row lg:items-center">

            <div>

              <h2 className="text-base font-semibold text-zinc-950">
                Listado de asociados
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Seleccioná una persona para abrir su ficha completa.
              </p>

            </div>

            <p className="text-sm text-zinc-400">
              {total}{' '}
              {total === 1
                ? 'registro'
                : 'registros'}
            </p>

          </div>

          {/* FILTROS */}

          <div className="border-b border-zinc-200 bg-zinc-50/70 p-5">

            <div className="flex flex-col gap-3 xl:flex-row">

              <div className="relative flex-1">

                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-400">

                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="8"
                    />

                    <path d="m21 21-4.3-4.3" />
                  </svg>

                </div>

                <input
                  value={busqueda}
                  onChange={(e) =>
                    setBusqueda(
                      e.target.value
                    )
                  }
                  placeholder="Buscar por nombre, DNI, teléfono o N° socio..."
                  className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                />

              </div>

              <select
                value={estado}
                onChange={(e) =>
                  setEstado(
                    e.target.value
                  )
                }
                className="min-w-[220px] rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 outline-none"
              >

                <option value="Todos">
                  Todos los estados
                </option>

                {ESTADOS_ASOCIADO.map(
                  (opcion) => (
                    <option
                      key={opcion}
                      value={opcion}
                    >
                      {opcion}
                    </option>
                  )
                )}

              </select>

              <select
                value={reprocann}
                onChange={(e) =>
                  setReprocann(
                    e.target.value
                  )
                }
                className="min-w-[200px] rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 outline-none"
              >

                <option value="Todos">
                  Todos REPROCANN
                </option>

                {ESTADOS_REPROCANN.map(
                  (opcion) => (
                    <option
                      key={opcion}
                      value={opcion}
                    >
                      {opcion}
                    </option>
                  )
                )}

              </select>

              {hayFiltros && (
                <button
                  type="button"
                  onClick={
                    limpiarFiltros
                  }
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
                >
                  Limpiar
                </button>
              )}

            </div>

          </div>

          {/* TABLA */}

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1240px] text-left">

              <thead>

                <tr className="border-b border-zinc-200 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">

                  <th className="px-5 py-4">
                    Socio
                  </th>

                  <th className="px-5 py-4">
                    Asociado
                  </th>

                  <th className="px-5 py-4">
                    Contacto
                  </th>

                  <th className="px-5 py-4">
                    Estado
                  </th>

                  <th className="px-5 py-4">
                    REPROCANN
                  </th>

                  <th className="px-5 py-4">
                    Vencimiento
                  </th>

                  <th className="px-5 py-4">
                    Documentación
                  </th>

                  <th className="px-5 py-4">
                    Próxima acción
                  </th>

                  <th className="px-5 py-4 text-right">
                    Ficha
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {filtrados.map(
                  (asociado) => {
                    const accion =
                      calcularProximaAccion(
                        asociado.estado_asociado,
                        asociado.estado_reprocann,
                        asociado.documentacion
                      )

                    const vencimiento =
                      estadoVencimiento(
                        asociado.vencimiento_reprocann
                      )

                    return (
                      <tr
                        key={
                          asociado.id
                        }
                        role="link"
                        tabIndex={0}
                        onClick={() =>
                          abrirFicha(
                            asociado.id
                          )
                        }
                        onKeyDown={(e) => {
                          if (
                            e.key ===
                            'Enter'
                          ) {
                            abrirFicha(
                              asociado.id
                            )
                          }
                        }}
                        className="group cursor-pointer transition hover:bg-emerald-50/40 focus:bg-emerald-50/40 focus:outline-none"
                      >

                        <td className="px-5 py-5 align-middle">

                          <span className="font-mono text-xs font-semibold text-zinc-600 group-hover:text-emerald-700">
                            {numeroSocio(
                              asociado.id
                            )}
                          </span>

                        </td>

                        <td className="px-5 py-5 align-middle">

                          <p className="font-semibold text-zinc-950 group-hover:text-emerald-800">
                            {asociado.nombre_apellido ||
                              'Sin nombre'}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            DNI{' '}
                            {asociado.dni ||
                              '—'}
                          </p>

                        </td>

                        <td className="px-5 py-5 align-middle">

                          <p className="text-sm font-medium text-zinc-800">
                            {asociado.telefono ||
                              '—'}
                          </p>

                          <p className="mt-1 max-w-[210px] truncate text-xs text-zinc-500">
                            {asociado.email ||
                              'Sin email'}
                          </p>

                        </td>

                        <td className="px-5 py-5 align-middle">

                          <span
                            className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${badgeEstado(
                              asociado.estado_asociado
                            )}`}
                          >
                            {asociado.estado_asociado ||
                              'Sin estado'}
                          </span>

                        </td>

                        <td className="px-5 py-5 align-middle">

                          <span
                            className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${badgeEstado(
                              asociado.estado_reprocann
                            )}`}
                          >
                            {asociado.estado_reprocann ||
                              'No iniciado'}
                          </span>

                        </td>

                        <td className="px-5 py-5 align-middle">

                          <span
                            className={`whitespace-nowrap text-sm ${vencimiento.clase}`}
                          >
                            {
                              vencimiento.texto
                            }
                          </span>

                        </td>

                        <td className="px-5 py-5 align-middle">

                          <span
                            className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${badgeEstado(
                              asociado.documentacion
                            )}`}
                          >
                            {asociado.documentacion ||
                              'Pendiente'}
                          </span>

                        </td>

                        <td className="max-w-[280px] px-5 py-5 align-middle">

                          <p className="text-sm font-medium leading-5 text-zinc-800">
                            {accion}
                          </p>

                          {asociado.fecha_seguimiento && (
                            <p className="mt-1.5 text-xs text-zinc-500">
                              Seguimiento:{' '}
                              {formatFecha(
                                asociado.fecha_seguimiento
                              )}
                            </p>
                          )}

                        </td>

                        <td className="px-5 py-5 text-right align-middle">

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()

                              abrirFicha(
                                asociado.id
                              )
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
                          >
                            Ver ficha

                            <span>
                              →
                            </span>
                          </button>

                        </td>

                      </tr>
                    )
                  }
                )}

              </tbody>

            </table>

            {filtrados.length === 0 && (

              <div className="px-6 py-20 text-center">

                <p className="font-semibold text-zinc-900">
                  No hay asociados para mostrar
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Revisá los filtros o cargá un nuevo asociado.
                </p>

              </div>

            )}

          </div>

          <div className="border-t border-zinc-200 bg-zinc-50/50 px-5 py-4 text-sm text-zinc-500">

            Mostrando{' '}

            <strong className="font-semibold text-zinc-700">
              {filtrados.length}
            </strong>

            {' '}de{' '}

            <strong className="font-semibold text-zinc-700">
              {total}
            </strong>

            {' '}asociados

          </div>

        </section>

      </div>

    </main>
  )
}

function Tarjeta({
  titulo,
  valor,
  descripcion,
  destacada = false,
}: {
  titulo: string
  valor: number
  descripcion: string
  destacada?: boolean
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 shadow-sm ${
        destacada
          ? 'border-emerald-200 bg-emerald-50/60'
          : 'border-zinc-200 bg-white'
      }`}
    >

      <div
        className={`mb-2 h-[3px] w-6 rounded-full ${
          destacada
            ? 'bg-emerald-700'
            : 'bg-emerald-600'
        }`}
      />

      <p className="min-h-[32px] text-[12px] font-semibold leading-4 text-zinc-800">
        {titulo}
      </p>

      <p
        className={`mt-1 text-2xl font-semibold tracking-tight ${
          destacada
            ? 'text-emerald-800'
            : 'text-zinc-950'
        }`}
      >
        {valor}
      </p>

      <p className="mt-1 min-h-[16px] text-[10px] leading-4 text-zinc-500">
        {descripcion}
      </p>

    </div>
  )
}