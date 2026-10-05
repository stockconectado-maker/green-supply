'use client'

import Link from 'next/link'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createClient } from '@/lib/supabase/client'

type Periodo =
  | '7d'
  | '30d'
  | 'mes'
  | 'personalizado'

type Dispensa = {
  dispensa_id: number
  fecha: string
  created_at: string
  asociado_id: number
  numero_socio: string | null
  asociado: string
  genetica_id: number
  genetica: string
  cantidad_g: number | string
}

type GrupoGenetica = {
  genetica: string
  gramos: number
  dispensas: number
  asociados: number
}

type GrupoAsociado = {
  asociado: string
  numero_socio: string | null
  gramos: number
  dispensas: number
  ultimaFecha: string
}

type PuntoDia = {
  fecha: string
  gramos: number
  dispensas: number
  asociados: Set<number>
}

export default function EstadisticasDispensaPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    )

  const [
    periodo,
    setPeriodo,
  ] =
    useState<Periodo>('30d')

  const [desde, setDesde] =
    useState(
      fechaHaceDias(29)
    )

  const [hasta, setHasta] =
    useState(fechaLocal())

  const [
    dispensas,
    setDispensas,
  ] =
    useState<Dispensa[]>([])

  const [
    cargando,
    setCargando,
  ] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    if (
      periodo ===
      'personalizado'
    ) {
      return
    }

    const rango =
      resolverRango(periodo)

    setDesde(rango.desde)
    setHasta(rango.hasta)
  }, [periodo])

  useEffect(() => {
    cargar()
  }, [desde, hasta])

  async function cargar() {
    setCargando(true)
    setError('')

    const resultado =
      await supabase
        .from(
          'vista_dispensas'
        )
        .select(`
          dispensa_id,
          fecha,
          created_at,
          asociado_id,
          numero_socio,
          asociado,
          genetica_id,
          genetica,
          cantidad_g
        `)
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order(
          'fecha',
          {
            ascending: true,
          }
        )
        .order(
          'created_at',
          {
            ascending: true,
          }
        )

    if (resultado.error) {
      setError(
        describirErrorSupabase(
          resultado.error,
          'No se pudieron cargar las estadísticas.'
        )
      )
      setCargando(false)
      return
    }

    setDispensas(
      (resultado.data ??
        []) as Dispensa[]
    )

    setCargando(false)
  }

  const totales =
    useMemo(() => {
      const gramos =
        dispensas.reduce(
          (total, item) =>
            total +
            numero(
              item.cantidad_g
            ),
          0
        )

      const asociados =
        new Set(
          dispensas.map(
            (item) =>
              item.asociado_id
          )
        ).size

      const dias =
        cantidadDiasInclusivos(
          desde,
          hasta
        )

      return {
        dispensas:
          dispensas.length,
        gramos,
        asociados,
        promedioDia:
          dias > 0
            ? gramos / dias
            : 0,
      }
    }, [
      dispensas,
      desde,
      hasta,
    ])

  const porGenetica =
    useMemo<
      GrupoGenetica[]
    >(() => {
      const mapa =
        new Map<
          string,
          {
            gramos: number
            dispensas: number
            asociados:
              Set<number>
          }
        >()

      dispensas.forEach(
        (item) => {
          const actual =
            mapa.get(
              item.genetica
            ) ?? {
              gramos: 0,
              dispensas: 0,
              asociados:
                new Set<number>(),
            }

          actual.gramos +=
            numero(
              item.cantidad_g
            )
          actual.dispensas += 1
          actual.asociados.add(
            item.asociado_id
          )

          mapa.set(
            item.genetica,
            actual
          )
        }
      )

      return [
        ...mapa.entries(),
      ]
        .map(
          ([
            genetica,
            valor,
          ]) => ({
            genetica,
            gramos:
              valor.gramos,
            dispensas:
              valor.dispensas,
            asociados:
              valor.asociados
                .size,
          })
        )
        .sort(
          (a, b) =>
            b.gramos -
            a.gramos
        )
    }, [dispensas])

  const porAsociado =
    useMemo<
      GrupoAsociado[]
    >(() => {
      const mapa =
        new Map<
          number,
          GrupoAsociado
        >()

      dispensas.forEach(
        (item) => {
          const actual =
            mapa.get(
              item.asociado_id
            )

          if (!actual) {
            mapa.set(
              item.asociado_id,
              {
                asociado:
                  item.asociado,
                numero_socio:
                  item.numero_socio,
                gramos:
                  numero(
                    item.cantidad_g
                  ),
                dispensas: 1,
                ultimaFecha:
                  item.fecha,
              }
            )

            return
          }

          actual.gramos +=
            numero(
              item.cantidad_g
            )
          actual.dispensas += 1

          if (
            item.fecha >
            actual.ultimaFecha
          ) {
            actual.ultimaFecha =
              item.fecha
          }
        }
      )

      return [
        ...mapa.values(),
      ].sort(
        (a, b) =>
          b.ultimaFecha.localeCompare(
            a.ultimaFecha
          )
      )
    }, [dispensas])

  const serie =
    useMemo<
      PuntoDia[]
    >(() => {
      const mapa =
        new Map<
          string,
          PuntoDia
        >()

      dispensas.forEach(
        (item) => {
          const actual =
            mapa.get(
              item.fecha
            ) ?? {
              fecha:
                item.fecha,
              gramos: 0,
              dispensas: 0,
              asociados:
                new Set<number>(),
            }

          actual.gramos +=
            numero(
              item.cantidad_g
            )
          actual.dispensas += 1
          actual.asociados.add(
            item.asociado_id
          )

          mapa.set(
            item.fecha,
            actual
          )
        }
      )

      return [
        ...mapa.values(),
      ].sort(
        (a, b) =>
          a.fecha.localeCompare(
            b.fecha
          )
      )
    }, [dispensas])

  const maxSerie =
    Math.max(
      1,
      ...serie.map(
        (item) =>
          item.gramos
      )
    )

  const maxGenetica =
    Math.max(
      1,
      ...porGenetica.map(
        (item) =>
          item.gramos
      )
    )

  return (
    <main className="min-h-screen bg-[#f5f6f7]">
      <div className="mx-auto max-w-[1500px] px-5 py-6 lg:px-7">
        <header className="mb-5">
          <Link
            href="/dispensa"
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-900"
          >
            ← Volver a Dispensa
          </Link>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
            Análisis operativo
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
            Estadísticas de Dispensa
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Volumen dispensado, actividad por período, genéticas y asociados atendidos.
          </p>
        </header>

        <section className="mb-4 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-1.5">
              <Filtro
                activo={
                  periodo === '7d'
                }
                texto="7 días"
                onClick={() =>
                  setPeriodo('7d')
                }
              />

              <Filtro
                activo={
                  periodo === '30d'
                }
                texto="30 días"
                onClick={() =>
                  setPeriodo('30d')
                }
              />

              <Filtro
                activo={
                  periodo === 'mes'
                }
                texto="Mes actual"
                onClick={() =>
                  setPeriodo('mes')
                }
              />

              <Filtro
                activo={
                  periodo ===
                  'personalizado'
                }
                texto="Personalizado"
                onClick={() =>
                  setPeriodo(
                    'personalizado'
                  )
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={desde}
                onChange={(event) => {
                  setPeriodo(
                    'personalizado'
                  )
                  setDesde(
                    event.target.value
                  )
                }}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 outline-none focus:border-emerald-400"
              />

              <span className="text-xs text-zinc-400">
                a
              </span>

              <input
                type="date"
                value={hasta}
                onChange={(event) => {
                  setPeriodo(
                    'personalizado'
                  )
                  setHasta(
                    event.target.value
                  )
                }}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {cargando ? (
          <section className="rounded-2xl border border-zinc-200 bg-white px-5 py-12 text-center text-sm text-zinc-500 shadow-sm">
            Cargando estadísticas...
          </section>
        ) : (
          <>
            <section className="grid overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                titulo="Dispensas"
                valor={String(
                  totales.dispensas
                )}
                detalle="operaciones"
              />

              <Kpi
                titulo="Cantidad dispensada"
                valor={formatearGramos(
                  totales.gramos
                )}
                detalle="volumen total"
              />

              <Kpi
                titulo="Asociados atendidos"
                valor={String(
                  totales.asociados
                )}
                detalle="personas distintas"
              />

              <Kpi
                titulo="Promedio diario"
                valor={formatearGramos(
                  totales.promedioDia
                )}
                detalle="por día calendario"
              />
            </section>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
              <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-5">
                <TituloSeccion
                  titulo="Actividad en el tiempo"
                  descripcion="Cantidad dispensada por día."
                />

                {!serie.length ? (
                  <Vacio />
                ) : (
                  <div className="mt-5 space-y-3">
                    {serie.map(
                      (item) => (
                        <div
                          key={
                            item.fecha
                          }
                          className="grid grid-cols-[74px_minmax(0,1fr)_72px] items-center gap-3"
                        >
                          <span className="text-xs text-zinc-500">
                            {formatearFechaCorta(
                              item.fecha
                            )}
                          </span>

                          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-emerald-600"
                              style={{
                                width: `${Math.max(
                                  4,
                                  (item.gramos /
                                    maxSerie) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>

                          <strong className="text-right text-xs font-semibold text-zinc-800">
                            {formatearGramos(
                              item.gramos
                            )}
                          </strong>
                        </div>
                      )
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-5">
                <TituloSeccion
                  titulo="Genéticas más dispensadas"
                  descripcion="Distribución del volumen del período."
                />

                {!porGenetica.length ? (
                  <Vacio />
                ) : (
                  <div className="mt-5 space-y-4">
                    {porGenetica.map(
                      (item) => (
                        <div
                          key={
                            item.genetica
                          }
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-zinc-900">
                                {
                                  item.genetica
                                }
                              </p>

                              <p className="mt-0.5 text-[10px] text-zinc-400">
                                {item.dispensas}{' '}
                                dispensas ·{' '}
                                {item.asociados}{' '}
                                asociados
                              </p>
                            </div>

                            <strong className="text-xs font-semibold text-zinc-800">
                              {formatearGramos(
                                item.gramos
                              )}
                            </strong>
                          </div>

                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-zinc-800"
                              style={{
                                width: `${Math.max(
                                  4,
                                  (item.gramos /
                                    maxGenetica) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </section>
            </div>

            <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 px-4 py-3.5 lg:px-5">
                <TituloSeccion
                  titulo="Asociados atendidos"
                  descripcion="Consulta operativa del período, ordenada por actividad más reciente."
                />
              </div>

              {!porAsociado.length ? (
                <div className="px-5 py-8">
                  <Vacio />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left">
                    <thead className="bg-zinc-50 text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                      <tr>
                        <th className="px-4 py-2.5 lg:px-5">
                          Asociado
                        </th>
                        <th className="px-4 py-2.5 text-right lg:px-5">
                          Dispensas
                        </th>
                        <th className="px-4 py-2.5 text-right lg:px-5">
                          Cantidad
                        </th>
                        <th className="px-4 py-2.5 text-right lg:px-5">
                          Última
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-zinc-100">
                      {porAsociado.map(
                        (item) => (
                          <tr
                            key={`${item.asociado}-${item.numero_socio ?? ''}`}
                            className="text-sm"
                          >
                            <td className="px-4 py-3 lg:px-5">
                              <p className="font-semibold text-zinc-950">
                                {
                                  item.asociado
                                }
                              </p>

                              <p className="mt-0.5 text-[10px] text-zinc-400">
                                {item.numero_socio
                                  ? `#${item.numero_socio}`
                                  : '—'}
                              </p>
                            </td>

                            <td className="px-4 py-3 text-right font-medium text-zinc-700 lg:px-5">
                              {
                                item.dispensas
                              }
                            </td>

                            <td className="px-4 py-3 text-right font-semibold text-zinc-900 lg:px-5">
                              {formatearGramos(
                                item.gramos
                              )}
                            </td>

                            <td className="px-4 py-3 text-right text-xs text-zinc-500 lg:px-5">
                              {formatearFecha(
                                item.ultimaFecha
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function Filtro({
  activo,
  texto,
  onClick,
}: {
  activo: boolean
  texto: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
        activo
          ? 'bg-zinc-950 text-white'
          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
      }`}
    >
      {texto}
    </button>
  )
}

function Kpi({
  titulo,
  valor,
  detalle,
}: {
  titulo: string
  valor: string
  detalle: string
}) {
  return (
    <div className="border-b border-zinc-100 px-4 py-4 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0 lg:px-5">
      <p className="text-[9px] font-bold uppercase tracking-[0.09em] text-zinc-400">
        {titulo}
      </p>

      <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">
        {valor}
      </p>

      <p className="mt-0.5 text-xs text-zinc-500">
        {detalle}
      </p>
    </div>
  )
}

function TituloSeccion({
  titulo,
  descripcion,
}: {
  titulo: string
  descripcion: string
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-zinc-950">
        {titulo}
      </h2>

      <p className="mt-0.5 text-xs text-zinc-500">
        {descripcion}
      </p>
    </div>
  )
}

function Vacio() {
  return (
    <div className="mt-4 rounded-xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
      Sin dispensas en este período.
    </div>
  )
}

function resolverRango(
  periodo: Periodo
) {
  const hoy = fechaLocal()

  if (periodo === '7d') {
    return {
      desde:
        fechaHaceDias(6),
      hasta: hoy,
    }
  }

  if (
    periodo === 'mes'
  ) {
    const ahora =
      new Date()

    return {
      desde: `${ahora.getFullYear()}-${String(
        ahora.getMonth() + 1
      ).padStart(2, '0')}-01`,
      hasta: hoy,
    }
  }

  return {
    desde:
      fechaHaceDias(29),
    hasta: hoy,
  }
}

function cantidadDiasInclusivos(
  desde: string,
  hasta: string
) {
  const inicio =
    new Date(
      `${desde}T12:00:00`
    )
  const fin =
    new Date(
      `${hasta}T12:00:00`
    )

  return (
    Math.floor(
      (
        fin.getTime() -
        inicio.getTime()
      ) /
        86400000
    ) + 1
  )
}

function fechaLocal() {
  return formatearFechaISO(
    new Date()
  )
}

function fechaHaceDias(
  dias: number
) {
  const fecha =
    new Date()

  fecha.setDate(
    fecha.getDate() -
      dias
  )

  return formatearFechaISO(
    fecha
  )
}

function formatearFechaISO(
  fecha: Date
) {
  const year =
    fecha.getFullYear()
  const month =
    String(
      fecha.getMonth() + 1
    ).padStart(2, '0')
  const day =
    String(
      fecha.getDate()
    ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function numero(
  valor: unknown
) {
  const n = Number(valor)
  return Number.isFinite(n)
    ? n
    : 0
}

function formatearGramos(
  gramos: number
) {
  return `${new Intl.NumberFormat(
    'es-AR',
    {
      maximumFractionDigits: 2,
    }
  ).format(gramos)} g`
}

function formatearFecha(
  fecha: string | null
) {
  if (!fecha) return '—'

  return new Intl.DateTimeFormat(
    'es-AR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  ).format(
    new Date(
      `${fecha}T12:00:00`
    )
  )
}

function formatearFechaCorta(
  fecha: string
) {
  return new Intl.DateTimeFormat(
    'es-AR',
    {
      day: '2-digit',
      month: '2-digit',
    }
  ).format(
    new Date(
      `${fecha}T12:00:00`
    )
  )
}

function describirErrorSupabase(
  error: unknown,
  fallback: string
) {
  if (
    !error ||
    typeof error !== 'object'
  ) {
    return fallback
  }

  const e =
    error as {
      message?: string
      details?: string
      hint?: string
      code?: string
    }

  return [
    e.message,
    e.details,
    e.hint,
    e.code
      ? `Código ${e.code}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ') || fallback
}
