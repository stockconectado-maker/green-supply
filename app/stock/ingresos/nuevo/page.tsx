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

type Genetica = {
  id: number
  nombre: string
}

type Cantidades = Record<number, string>

export default function NuevoIngresoPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [geneticas, setGeneticas] = useState<Genetica[]>([])
  const [cargando, setCargando] = useState(true)
  const [cantidades, setCantidades] = useState<Cantidades>({})
  const [busqueda, setBusqueda] = useState('')
  const [fechaCosecha, setFechaCosecha] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void cargarGeneticas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargarGeneticas() {
    setCargando(true)

    const { data, error } = await supabase
      .from('geneticas')
      .select('id, nombre')
      .eq('activa', true)
      .order('nombre')

    if (error) {
      console.error(error)
      setError('No se pudieron cargar las genéticas.')
      setCargando(false)
      return
    }

    setGeneticas(data ?? [])
    setCargando(false)
  }

  const geneticasVisibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    if (!texto) return geneticas

    return geneticas.filter((genetica) =>
      genetica.nombre.toLowerCase().includes(texto)
    )
  }, [geneticas, busqueda])

  const seleccionadas = useMemo(
    () =>
      geneticas.filter((genetica) =>
        Object.prototype.hasOwnProperty.call(
          cantidades,
          genetica.id
        )
      ),
    [geneticas, cantidades]
  )

  const totalGramos = useMemo(
    () =>
      seleccionadas.reduce((total, genetica) => {
        const valor = Number(
          (cantidades[genetica.id] ?? '')
            .replace(',', '.')
        )

        return total + (
          Number.isFinite(valor) && valor > 0
            ? valor
            : 0
        )
      }, 0),
    [seleccionadas, cantidades]
  )

  function alternarGenetica(id: number) {
    setError('')

    setCantidades((actual) => {
      const nuevo = { ...actual }

      if (
        Object.prototype.hasOwnProperty.call(
          nuevo,
          id
        )
      ) {
        delete nuevo[id]
      } else {
        nuevo[id] = ''
      }

      return nuevo
    })
  }

  function cambiarCantidad(
    id: number,
    valor: string
  ) {
    setCantidades((actual) => ({
      ...actual,
      [id]: valor,
    }))
  }

  function limpiarSeleccion() {
    setCantidades({})
    setError('')
  }

  async function guardar(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()
    setError('')

    if (seleccionadas.length === 0) {
      setError(
        'Seleccioná al menos una genética.'
      )
      return
    }

    const ingresos = seleccionadas.map(
      (genetica) => ({
        genetica,
        cantidad: Number(
          (cantidades[genetica.id] ?? '')
            .replace(',', '.')
        ),
      })
    )

    const invalida = ingresos.find(
      (item) =>
        !Number.isFinite(item.cantidad) ||
        item.cantidad <= 0
    )

    if (invalida) {
      setError(
        `Ingresá una cantidad válida para ${invalida.genetica.nombre}.`
      )
      return
    }

    setGuardando(true)

    let registrados = 0

    for (const ingreso of ingresos) {
      const { error: ingresoError } =
        await supabase.rpc(
          'crear_ingreso_stock',
          {
            p_genetica_id:
              ingreso.genetica.id,
            p_cantidad:
              ingreso.cantidad,
            p_fecha_cosecha:
              fechaCosecha || null,
            p_observaciones:
              observaciones.trim() || null,
          }
        )

      if (ingresoError) {
        console.error(ingresoError)

        setError(
          registrados > 0
            ? `Se registraron ${registrados} de ${ingresos.length} ingresos. Falló ${ingreso.genetica.nombre}. Revisá Stock antes de volver a intentar.`
            : `No se pudo registrar el ingreso de ${ingreso.genetica.nombre}.`
        )

        setGuardando(false)
        return
      }

      registrados += 1
    }

    router.push('/stock')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#f5f6f7]">
      <div className="mx-auto max-w-[1050px] px-4 py-7 sm:px-6 lg:px-8">

        <Link
          href="/stock"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
        >
          <span>←</span>
          Volver a Stock
        </Link>

        <div className="mt-7">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Existencias
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Nuevo ingreso
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Seleccioná una o varias genéticas y cargá sus cantidades. Se genera un lote y un movimiento independiente por cada genética.
          </p>
        </div>

        <form
          onSubmit={guardar}
          className="mt-7"
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-zinc-950">
                    Genéticas del ingreso
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                    Marcá las que ingresan y completá los gramos de cada una.
                  </p>
                </div>

                {seleccionadas.length > 0 && (
                  <button
                    type="button"
                    onClick={limpiarSeleccion}
                    className="text-left text-xs font-semibold text-zinc-500 transition hover:text-zinc-900"
                  >
                    Limpiar selección
                  </button>
                )}
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-zinc-800">
                  Buscar y agregar genética
                </label>

                <input
                  value={busqueda}
                  onChange={(e) =>
                    setBusqueda(e.target.value)
                  }
                  placeholder="Escribí el nombre de la genética..."
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50"
                />

                {busqueda.trim() && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                    {cargando ? (
                      <div className="px-4 py-4 text-sm text-zinc-500">
                        Cargando genéticas...
                      </div>
                    ) : geneticasVisibles.filter(
                        (genetica) =>
                          !Object.prototype.hasOwnProperty.call(
                            cantidades,
                            genetica.id
                          )
                      ).length === 0 ? (
                      <div className="px-4 py-4 text-sm text-zinc-500">
                        No hay genéticas disponibles con ese nombre.
                      </div>
                    ) : (
                      <div className="max-h-56 divide-y divide-zinc-100 overflow-y-auto">
                        {geneticasVisibles
                          .filter(
                            (genetica) =>
                              !Object.prototype.hasOwnProperty.call(
                                cantidades,
                                genetica.id
                              )
                          )
                          .slice(0, 8)
                          .map((genetica) => (
                            <button
                              key={genetica.id}
                              type="button"
                              onClick={() => {
                                alternarGenetica(genetica.id)
                                setBusqueda('')
                              }}
                              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition hover:bg-emerald-50"
                            >
                              <span className="font-semibold text-zinc-900">
                                {genetica.nombre}
                              </span>

                              <span className="text-xs font-semibold text-emerald-700">
                                + Agregar
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Genéticas seleccionadas
                    </h3>

                    <p className="mt-1 text-xs text-zinc-500">
                      Solo aparecen las que agregaste al ingreso.
                    </p>
                  </div>

                  {seleccionadas.length > 0 && (
                    <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                      {seleccionadas.length}
                    </span>
                  )}
                </div>

                <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200">
                  {seleccionadas.length === 0 ? (
                    <div className="px-4 py-9 text-center text-sm text-zinc-500">
                      Buscá una genética arriba y agregala al ingreso.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100">
                      {seleccionadas.map((genetica) => (
                        <div
                          key={genetica.id}
                          className="grid gap-3 bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_180px_34px] sm:items-center"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-900">
                              {genetica.nombre}
                            </p>
                          </div>

                          <div className="relative">
                            <input
                              autoFocus={
                                seleccionadas[
                                  seleccionadas.length - 1
                                ]?.id === genetica.id
                              }
                              value={
                                cantidades[
                                  genetica.id
                                ] ?? ''
                              }
                              onChange={(e) =>
                                cambiarCantidad(
                                  genetica.id,
                                  e.target.value
                                )
                              }
                              inputMode="decimal"
                              placeholder="0"
                              aria-label={`Cantidad de ${genetica.nombre}`}
                              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 pr-10 text-right text-sm font-semibold tabular-nums text-zinc-950 outline-none transition placeholder:text-zinc-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50"
                            />

                            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-zinc-400">
                              g
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              alternarGenetica(
                                genetica.id
                              )
                            }
                            aria-label={`Quitar ${genetica.nombre}`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-800">
                    Fecha de cosecha
                  </label>

                  <input
                    type="date"
                    value={fechaCosecha}
                    onChange={(e) =>
                      setFechaCosecha(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                  />

                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Opcional. Se aplica a todas las genéticas de este ingreso.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-800">
                    Observaciones
                  </label>

                  <textarea
                    rows={3}
                    value={observaciones}
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
            </section>

            <aside>
              <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm lg:sticky lg:top-6">
                <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">
                    Resumen
                  </p>

                  <p className="mt-2 text-lg font-semibold text-zinc-950">
                    {seleccionadas.length === 0
                      ? 'Sin genéticas'
                      : `${seleccionadas.length} ${
                          seleccionadas.length === 1
                            ? 'genética'
                            : 'genéticas'
                        }`}
                  </p>
                </div>

                <div className="space-y-4 p-5">
                  <Resumen
                    titulo="Cantidad total"
                    valor={`${formatearNumero(
                      totalGramos
                    )} g`}
                  />

                  <Resumen
                    titulo="Lotes"
                    valor={
                      seleccionadas.length === 0
                        ? '0'
                        : `${seleccionadas.length} automáticos`
                    }
                  />

                  <Resumen
                    titulo="Movimientos"
                    valor={
                      seleccionadas.length === 0
                        ? '0'
                        : `${seleccionadas.length} ingresos`
                    }
                  />

                  {seleccionadas.length > 0 && (
                    <div className="border-t border-zinc-100 pt-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Detalle
                      </p>

                      <div className="space-y-2">
                        {seleccionadas.map(
                          (genetica) => (
                            <div
                              key={
                                genetica.id
                              }
                              className="flex items-center justify-between gap-3 text-xs"
                            >
                              <span className="min-w-0 truncate font-medium text-zinc-700">
                                {
                                  genetica.nombre
                                }
                              </span>

                              <span className="shrink-0 font-semibold tabular-nums text-zinc-950">
                                {cantidades[
                                  genetica.id
                                ]
                                  ? `${cantidades[genetica.id]} g`
                                  : '—'}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/stock"
              className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-center text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={
                guardando ||
                cargando ||
                seleccionadas.length === 0
              }
              className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? 'Registrando...'
                : seleccionadas.length <= 1
                  ? 'Registrar ingreso'
                  : `Registrar ${seleccionadas.length} ingresos`}
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

function formatearNumero(
  valor: number
) {
  return new Intl.NumberFormat(
    'es-AR',
    {
      maximumFractionDigits: 2,
    }
  ).format(valor)
}
