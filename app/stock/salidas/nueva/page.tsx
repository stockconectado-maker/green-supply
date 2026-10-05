'use client'

import Link from 'next/link'
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Lote = {
  id: number
  codigo_lote: string
  genetica_id: number
  estado: string

  geneticas:
    | {
        id: number
        nombre: string
      }
    | null
}

type Movimiento = {
  id: number
  lote_id: number
  tipo:
    | 'Ingreso'
    | 'Salida'
    | 'Ajuste positivo'
    | 'Ajuste negativo'

  cantidad: number | string
}

export default function NuevaSalidaPage() {
  const router = useRouter()

  const [
    lotes,
    setLotes,
  ] = useState<Lote[]>([])

  const [
    movimientos,
    setMovimientos,
  ] = useState<Movimiento[]>([])

  const [
    loteId,
    setLoteId,
  ] = useState('')

  const [
    cantidadSalida,
    setCantidadSalida,
  ] = useState('')

  const [
    motivo,
    setMotivo,
  ] = useState('')

  const [
    observaciones,
    setObservaciones,
  ] = useState('')

  const [
    cargando,
    setCargando,
  ] = useState(true)

  const [
    guardando,
    setGuardando,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  useEffect(() => {
    async function cargarDatos() {
      const supabase =
        createClient()

      setCargando(true)
      setError('')

      const {
        data: lotesData,
        error: lotesError,
      } = await supabase
        .from('lotes')
        .select(`
          id,
          codigo_lote,
          genetica_id,
          estado,
          geneticas (
            id,
            nombre
          )
        `)
        .eq(
          'estado',
          'Activo'
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )

      const {
        data: movimientosData,
        error:
          movimientosError,
      } = await supabase
        .from(
          'movimientos_stock'
        )
        .select(`
          id,
          lote_id,
          tipo,
          cantidad
        `)

      if (
        lotesError ||
        movimientosError
      ) {
        console.error({
          lotesError,
          movimientosError,
        })

        setError(
          'No se pudo cargar la información de Stock.'
        )

        setCargando(false)
        return
      }

      const lotesNormalizados =
        (
          lotesData ?? []
        ).map((lote) => {
          const geneticasRaw =
            lote.geneticas

          return {
            ...lote,

            geneticas:
              Array.isArray(
                geneticasRaw
              )
                ? geneticasRaw[0] ??
                  null
                : geneticasRaw,
          }
        }) as Lote[]

      setLotes(
        lotesNormalizados
      )

      setMovimientos(
        (movimientosData ??
          []) as Movimiento[]
      )

      setCargando(false)
    }

    cargarDatos()
  }, [])

  function impactoMovimiento(
    movimiento: Movimiento
  ) {
    const cantidad =
      Number(
        movimiento.cantidad
      )

    if (
      movimiento.tipo ===
        'Ingreso' ||
      movimiento.tipo ===
        'Ajuste positivo'
    ) {
      return cantidad
    }

    return -cantidad
  }

  const stockPorLote =
    useMemo(() => {
      const mapa =
        new Map<
          number,
          number
        >()

      movimientos.forEach(
        (movimiento) => {
          const actual =
            mapa.get(
              movimiento.lote_id
            ) ?? 0

          mapa.set(
            movimiento.lote_id,
            actual +
              impactoMovimiento(
                movimiento
              )
          )
        }
      )

      return mapa
    }, [movimientos])

  const lotesDisponibles =
    useMemo(() => {
      return lotes.filter(
        (lote) =>
          (
            stockPorLote.get(
              lote.id
            ) ?? 0
          ) > 0
      )
    }, [
      lotes,
      stockPorLote,
    ])

  const loteSeleccionado =
    lotesDisponibles.find(
      (lote) =>
        String(
          lote.id
        ) === loteId
    )

  const stockDisponible =
    loteSeleccionado
      ? stockPorLote.get(
          loteSeleccionado.id
        ) ?? 0
      : 0

  const cantidadNumerica =
    Number(
      cantidadSalida.replace(
        ',',
        '.'
      )
    )

  const saldoPosterior =
    loteSeleccionado &&
    cantidadNumerica > 0
      ? stockDisponible -
        cantidadNumerica
      : stockDisponible

  function formatearCantidad(
    valor: number
  ) {
    return new Intl.NumberFormat(
      'es-AR',
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    ).format(valor)
  }

  async function guardar(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setError('')

    if (!loteId) {
      setError(
        'Seleccioná un lote.'
      )
      return
    }

    if (
      !cantidadNumerica ||
      cantidadNumerica <= 0
    ) {
      setError(
        'Ingresá una cantidad válida mayor a cero.'
      )
      return
    }

    if (
      cantidadNumerica >
      stockDisponible
    ) {
      setError(
        `La cantidad supera la existencia disponible de ${formatearCantidad(
          stockDisponible
        )} g.`
      )
      return
    }

    setGuardando(true)

    const supabase =
      createClient()

    const {
      error: salidaError,
    } = await supabase.rpc(
      'registrar_salida_stock',
      {
        p_lote_id:
          Number(loteId),

        p_cantidad:
          cantidadNumerica,

        p_motivo:
          motivo.trim() ||
          null,

        p_observaciones:
          observaciones.trim() ||
          null,
      }
    )

    if (salidaError) {
      console.error(
        salidaError
      )

      setError(
        salidaError.message ||
          'No se pudo registrar la salida.'
      )

      setGuardando(false)
      return
    }

    router.push(
      `/stock/lotes/${loteId}`
    )

    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#f5f6f7]">

      <div className="mx-auto max-w-[1050px] px-6 py-8 lg:px-8">

        {/* VOLVER */}

        <Link
          href="/stock"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
        >
          <span>
            ←
          </span>

          Volver a Stock
        </Link>

        {/* CABECERA */}

        <div className="mt-7">

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Existencias
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Nueva salida
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Registrá una salida de material vegetal desde un lote existente.
          </p>

        </div>

        <form
          onSubmit={guardar}
          className="mt-7"
        >

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">

            {/* FORMULARIO */}

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">

              <div>

                <h2 className="text-base font-semibold text-zinc-950">
                  Datos de la salida
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Elegí el lote y la cantidad que sale de Stock.
                </p>

              </div>

              {cargando ? (

                <div className="mt-6 rounded-xl bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
                  Cargando lotes...
                </div>

              ) : (

                <div className="mt-6 space-y-5">

                  {/* LOTE */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-zinc-800">
                      Lote
                      <span className="ml-1 text-emerald-700">
                        *
                      </span>
                    </label>

                    <select
                      value={
                        loteId
                      }
                      onChange={(e) => {
                        setLoteId(
                          e.target.value
                        )

                        setCantidadSalida(
                          ''
                        )
                      }}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                    >

                      <option value="">
                        Seleccionar lote
                      </option>

                      {lotesDisponibles.map(
                        (lote) => {
                          const stock =
                            stockPorLote.get(
                              lote.id
                            ) ?? 0

                          return (
                            <option
                              key={
                                lote.id
                              }
                              value={
                                lote.id
                              }
                            >
                              {
                                lote.codigo_lote
                              }
                              {' · '}
                              {lote
                                .geneticas
                                ?.nombre ||
                                'Sin genética'}
                              {' · '}
                              {formatearCantidad(
                                stock
                              )}{' '}
                              g
                            </option>
                          )
                        }
                      )}

                    </select>

                    {lotesDisponibles.length ===
                      0 && (
                      <p className="mt-2 text-xs text-amber-700">
                        No hay lotes con existencia disponible.
                      </p>
                    )}

                  </div>

                  {/* CANTIDAD */}

                  <div>

                    <div className="mb-2 flex items-center justify-between gap-3">

                      <label className="text-sm font-semibold text-zinc-800">
                        Cantidad
                        <span className="ml-1 text-emerald-700">
                          *
                        </span>
                      </label>

                      {loteSeleccionado && (
                        <span className="text-xs font-medium text-zinc-500">
                          Disponible:{' '}
                          <strong className="text-zinc-800">
                            {formatearCantidad(
                              stockDisponible
                            )}{' '}
                            g
                          </strong>
                        </span>
                      )}

                    </div>

                    <div className="relative">

                      <input
                        value={
                          cantidadSalida
                        }
                        onChange={(e) =>
                          setCantidadSalida(
                            e.target.value
                          )
                        }
                        disabled={
                          !loteSeleccionado
                        }
                        inputMode="decimal"
                        placeholder="Ej. 50"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-14 text-lg font-semibold text-zinc-950 outline-none transition placeholder:text-zinc-300 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:bg-zinc-50 disabled:text-zinc-400"
                      />

                      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">

                        <span className="text-sm font-semibold text-zinc-500">
                          g
                        </span>

                      </div>

                    </div>

                  </div>

                  {/* MOTIVO */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-zinc-800">
                      Motivo
                    </label>

                    <input
                      value={
                        motivo
                      }
                      onChange={(e) =>
                        setMotivo(
                          e.target.value
                        )
                      }
                      placeholder="Ej. Merma, descarte, corrección..."
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                    />

                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      Las dispensas a asociados se registrarán desde el módulo Dispensa.
                    </p>

                  </div>

                  {/* OBSERVACIONES */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-zinc-800">
                      Observaciones
                    </label>

                    <textarea
                      rows={4}
                      value={
                        observaciones
                      }
                      onChange={(e) =>
                        setObservaciones(
                          e.target.value
                        )
                      }
                      placeholder="Información adicional opcional..."
                      className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                    />

                  </div>

                </div>

              )}

            </section>

            {/* RESUMEN */}

            <aside>

              <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

                <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-4">

                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                    Resumen
                  </p>

                  <p className="mt-2 text-base font-semibold text-zinc-950">
                    Movimiento de salida
                  </p>

                </div>

                <div className="space-y-4 p-5">

                  <Resumen
                    titulo="Lote"
                    valor={
                      loteSeleccionado
                        ?.codigo_lote ||
                      'Sin seleccionar'
                    }
                  />

                  <Resumen
                    titulo="Genética"
                    valor={
                      loteSeleccionado
                        ?.geneticas
                        ?.nombre ||
                      '—'
                    }
                  />

                  <Resumen
                    titulo="Existencia actual"
                    valor={`${formatearCantidad(
                      stockDisponible
                    )} g`}
                  />

                  <Resumen
                    titulo="Salida"
                    valor={
                      cantidadNumerica >
                      0
                        ? `-${formatearCantidad(
                            cantidadNumerica
                          )} g`
                        : '0 g'
                    }
                  />

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">

                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                      Saldo posterior
                    </p>

                    <p
                      className={`mt-1 text-2xl font-semibold ${
                        saldoPosterior <
                        0
                          ? 'text-red-700'
                          : 'text-zinc-950'
                      }`}
                    >
                      {formatearCantidad(
                        saldoPosterior
                      )}{' '}
                      g
                    </p>

                  </div>

                </div>

              </section>

            </aside>

          </div>

          {/* ERROR */}

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* ACCIONES */}

          <div className="mt-6 flex justify-end gap-3 border-t border-zinc-200 pt-6">

            <Link
              href="/stock"
              className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={
                cargando ||
                guardando ||
                !loteSeleccionado
              }
              className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? 'Registrando...'
                : 'Registrar salida'}
            </button>

          </div>

        </form>

      </div>

    </main>
  )
}

function Resumen({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">

      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
        {titulo}
      </p>

      <p className="mt-1 text-sm font-semibold text-zinc-950">
        {valor}
      </p>

    </div>
  )
}