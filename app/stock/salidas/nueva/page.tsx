'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Lote = {
  id: number
  codigo_lote: string
  genetica_id: number
  fecha_ingreso: string | null
  fecha_cosecha: string | null
  estado: string
  created_at: string
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

type GeneticaDisponible = {
  id: number
  nombre: string
  stock: number
  lotes: number
}

type ItemSalida = {
  genetica_id: number
  genetica: string
  stock_disponible_g: number
  lotes_disponibles: number
  cantidad: string
}

export default function NuevaSalidaPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [lotes, setLotes] = useState<Lote[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])

  const [busqueda, setBusqueda] = useState('')
  const [items, setItems] = useState<ItemSalida[]>([])

  const [motivo, setMotivo] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargarDatos() {
    setCargando(true)
    setError('')

    const [resultadoLotes, resultadoMovimientos] = await Promise.all([
      supabase
        .from('lotes')
        .select(`
          id,
          codigo_lote,
          genetica_id,
          fecha_ingreso,
          fecha_cosecha,
          estado,
          created_at,
          geneticas (
            id,
            nombre
          )
        `)
        .eq('estado', 'Activo')
        .order('created_at', { ascending: true }),

      supabase
        .from('movimientos_stock')
        .select(`
          id,
          lote_id,
          tipo,
          cantidad
        `),
    ])

    if (resultadoLotes.error || resultadoMovimientos.error) {
      setError('No se pudo cargar la información de Stock.')
      setCargando(false)
      return
    }

    const lotesNormalizados = ((resultadoLotes.data ?? []) as any[]).map(
      (lote) => ({
        ...lote,
        geneticas: Array.isArray(lote.geneticas)
          ? lote.geneticas[0] ?? null
          : lote.geneticas,
      })
    ) as Lote[]

    setLotes(lotesNormalizados)
    setMovimientos((resultadoMovimientos.data ?? []) as Movimiento[])

    setCargando(false)
  }

  function impactoMovimiento(movimiento: Movimiento) {
    const cantidad = Number(movimiento.cantidad)

    if (!Number.isFinite(cantidad)) return 0

    return movimiento.tipo === 'Ingreso' ||
      movimiento.tipo === 'Ajuste positivo'
      ? cantidad
      : -cantidad
  }

  const stockPorLote = useMemo(() => {
    const mapa = new Map<number, number>()

    lotes.forEach((lote) => mapa.set(lote.id, 0))

    movimientos.forEach((movimiento) => {
      mapa.set(
        movimiento.lote_id,
        (mapa.get(movimiento.lote_id) ?? 0) +
          impactoMovimiento(movimiento)
      )
    })

    return mapa
  }, [lotes, movimientos])

  const geneticasDisponibles = useMemo(() => {
    const mapa = new Map<number, GeneticaDisponible>()

    lotes.forEach((lote) => {
      const saldo = stockPorLote.get(lote.id) ?? 0

      if (saldo <= 0 || !lote.geneticas) return

      const actual = mapa.get(lote.genetica_id)

      if (actual) {
        actual.stock += saldo
        actual.lotes += 1
        return
      }

      mapa.set(lote.genetica_id, {
        id: lote.genetica_id,
        nombre: lote.geneticas.nombre,
        stock: saldo,
        lotes: 1,
      })
    })

    return [...mapa.values()].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es')
    )
  }, [lotes, stockPorLote])

  const resultadosBusqueda = useMemo(() => {
    const q = normalizar(busqueda)

    if (!q) return []

    const seleccionadas = new Set(
      items.map((item) => item.genetica_id)
    )

    return geneticasDisponibles
      .filter(
        (genetica) =>
          !seleccionadas.has(genetica.id) &&
          normalizar(genetica.nombre).includes(q)
      )
      .slice(0, 8)
  }, [busqueda, geneticasDisponibles, items])

  const itemsConCantidad = items.map((item) => ({
    ...item,
    cantidadNumero: numeroPositivo(item.cantidad),
  }))

  const totalGramos = itemsConCantidad.reduce(
    (total, item) => total + item.cantidadNumero,
    0
  )

  const hayErrorCantidad = itemsConCantidad.some(
    (item) =>
      item.cantidadNumero <= 0 ||
      item.cantidadNumero > item.stock_disponible_g
  )

  const puedeGuardar =
    items.length > 0 &&
    totalGramos > 0 &&
    !hayErrorCantidad &&
    !guardando

  function agregarGenetica(genetica: GeneticaDisponible) {
    setItems((actuales) => [
      ...actuales,
      {
        genetica_id: genetica.id,
        genetica: genetica.nombre,
        stock_disponible_g: genetica.stock,
        lotes_disponibles: genetica.lotes,
        cantidad: '',
      },
    ])

    setBusqueda('')
    setError('')
  }

  function quitarGenetica(geneticaId: number) {
    setItems((actuales) =>
      actuales.filter(
        (item) => item.genetica_id !== geneticaId
      )
    )
  }

  function cambiarCantidad(geneticaId: number, valor: string) {
    setItems((actuales) =>
      actuales.map((item) =>
        item.genetica_id === geneticaId
          ? { ...item, cantidad: valor }
          : item
      )
    )
  }

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!items.length) {
      setError('Agregá al menos una genética.')
      return
    }

    for (const item of itemsConCantidad) {
      if (item.cantidadNumero <= 0) {
        setError(
          `Ingresá una cantidad válida para ${item.genetica}.`
        )
        return
      }

      if (item.cantidadNumero > item.stock_disponible_g) {
        setError(
          `La salida de ${item.genetica} supera el stock disponible de ${formatearCantidad(
            item.stock_disponible_g
          )} g.`
        )
        return
      }
    }

    const confirmado = window.confirm(
      [
        'Confirmar salida manual',
        '',
        ...itemsConCantidad.map(
          (item) =>
            `${item.genetica} · ${formatearCantidad(
              item.cantidadNumero
            )} g`
        ),
        '',
        `Total: ${formatearCantidad(totalGramos)} g`,
        motivo.trim()
          ? `Motivo: ${motivo.trim()}`
          : 'Motivo: sin especificar',
      ].join('\n')
    )

    if (!confirmado) return

    setGuardando(true)

    const resultado = await supabase.rpc(
      'registrar_salida_stock_multiple',
      {
        p_items: itemsConCantidad.map((item) => ({
          genetica_id: item.genetica_id,
          cantidad_g: item.cantidadNumero,
        })),
        p_motivo: motivo.trim() || null,
        p_observaciones: observaciones.trim() || null,
      }
    )

    if (resultado.error) {
      setError(
        resultado.error.message ||
          'No se pudo registrar la salida.'
      )
      setGuardando(false)
      return
    }

    router.push('/stock')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#f5f6f7]">
      <div className="mx-auto max-w-[1050px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Link
          href="/stock"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
        >
          <span>←</span>
          Volver a Stock
        </Link>

        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Existencias
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Nueva salida
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Buscá una o varias genéticas y cargá la cantidad que sale de Stock.
            El sistema toma automáticamente los lotes disponibles.
          </p>
        </div>

        <form onSubmit={guardar} className="mt-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
              <div>
                <h2 className="text-base font-semibold text-zinc-950">
                  Genéticas de la salida
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Agregá solamente las genéticas que necesitás retirar.
                </p>
              </div>

              {cargando ? (
                <div className="mt-6 rounded-xl bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
                  Cargando Stock...
                </div>
              ) : (
                <>
                  <div className="relative mt-6">
                    <input
                      value={busqueda}
                      onChange={(e) =>
                        setBusqueda(e.target.value)
                      }
                      autoComplete="off"
                      placeholder="Buscar genética..."
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />

                    {busqueda.trim() &&
                      resultadosBusqueda.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
                          {resultadosBusqueda.map(
                            (genetica) => (
                              <button
                                type="button"
                                key={genetica.id}
                                onClick={() =>
                                  agregarGenetica(genetica)
                                }
                                className="flex w-full items-center justify-between gap-4 border-b border-zinc-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-zinc-50"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-zinc-950">
                                    {genetica.nombre}
                                  </p>

                                  <p className="mt-0.5 text-[11px] text-zinc-500">
                                    {formatearCantidad(
                                      genetica.stock
                                    )}{' '}
                                    g disponibles ·{' '}
                                    {genetica.lotes}{' '}
                                    {genetica.lotes === 1
                                      ? 'lote'
                                      : 'lotes'}
                                  </p>
                                </div>

                                <span className="shrink-0 text-xs font-semibold text-emerald-700">
                                  Agregar
                                </span>
                              </button>
                            )
                          )}
                        </div>
                      )}

                    {busqueda.trim() &&
                      resultadosBusqueda.length === 0 && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 shadow-xl">
                          No hay coincidencias disponibles.
                        </div>
                      )}
                  </div>

                  <div className="mt-5">
                    {!items.length ? (
                      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-7 text-center text-sm text-zinc-400">
                        Buscá una genética y agregala a la salida.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {itemsConCantidad.map((item) => {
                          const excede =
                            item.cantidadNumero >
                            item.stock_disponible_g

                          const saldoPosterior =
                            item.cantidadNumero > 0
                              ? item.stock_disponible_g -
                                item.cantidadNumero
                              : item.stock_disponible_g

                          return (
                            <div
                              key={item.genetica_id}
                              className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-center"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-zinc-950">
                                  {item.genetica}
                                </p>

                                <p className="mt-1 text-[11px] text-zinc-500">
                                  Disponible:{' '}
                                  <strong className="font-semibold text-zinc-700">
                                    {formatearCantidad(
                                      item.stock_disponible_g
                                    )}{' '}
                                    g
                                  </strong>{' '}
                                  · Luego:{' '}
                                  <strong
                                    className={
                                      excede
                                        ? 'font-semibold text-red-600'
                                        : 'font-semibold text-zinc-700'
                                    }
                                  >
                                    {formatearCantidad(
                                      Math.max(
                                        0,
                                        saldoPosterior
                                      )
                                    )}{' '}
                                    g
                                  </strong>
                                </p>
                              </div>

                              <div className="relative">
                                <input
                                  value={item.cantidad}
                                  onChange={(e) =>
                                    cambiarCantidad(
                                      item.genetica_id,
                                      e.target.value
                                    )
                                  }
                                  inputMode="decimal"
                                  placeholder="Cantidad"
                                  className={`w-full rounded-xl border bg-white px-3.5 py-2.5 pr-9 text-sm font-semibold text-zinc-950 outline-none transition focus:ring-4 ${
                                    excede
                                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                                      : 'border-zinc-200 focus:border-emerald-400 focus:ring-emerald-100'
                                  }`}
                                />

                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">
                                  g
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  quitarGenetica(
                                    item.genetica_id
                                  )
                                }
                                className="rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-400 transition hover:bg-white hover:text-red-600"
                              >
                                Quitar
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <label className="mb-2 block text-sm font-semibold text-zinc-800">
                      Motivo
                    </label>

                    <input
                      value={motivo}
                      onChange={(e) =>
                        setMotivo(e.target.value)
                      }
                      placeholder="Ej. Merma, descarte, corrección..."
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />

                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      Las entregas a asociados se registran desde Dispensa.
                    </p>
                  </div>

                  <div className="mt-5">
                    <label className="mb-2 block text-sm font-semibold text-zinc-800">
                      Observaciones
                    </label>

                    <textarea
                      rows={4}
                      value={observaciones}
                      onChange={(e) =>
                        setObservaciones(e.target.value)
                      }
                      placeholder="Información adicional opcional..."
                      className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>
                </>
              )}
            </section>

            <aside>
              <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm lg:sticky lg:top-6">
                <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                    Resumen
                  </p>

                  <p className="mt-2 text-base font-semibold text-zinc-950">
                    {items.length
                      ? `${items.length} ${
                          items.length === 1
                            ? 'genética'
                            : 'genéticas'
                        }`
                      : 'Sin genéticas'}
                  </p>
                </div>

                <div className="space-y-4 p-5">
                  <Resumen
                    titulo="Cantidad total"
                    valor={`${formatearCantidad(
                      totalGramos
                    )} g`}
                  />

                  <Resumen
                    titulo="Genéticas"
                    valor={String(items.length)}
                  />

                  <Resumen
                    titulo="Lotes disponibles"
                    valor={String(
                      items.reduce(
                        (total, item) =>
                          total +
                          item.lotes_disponibles,
                        0
                      )
                    )}
                  />

                  {!!items.length && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                      <div className="space-y-2">
                        {itemsConCantidad.map((item) => (
                          <div
                            key={item.genetica_id}
                            className="flex items-center justify-between gap-3 text-[11px]"
                          >
                            <span className="min-w-0 truncate text-zinc-500">
                              {item.genetica}
                            </span>

                            <strong className="shrink-0 font-semibold text-zinc-800">
                              {item.cantidadNumero > 0
                                ? `${formatearCantidad(
                                    item.cantidadNumero
                                  )} g`
                                : '—'}
                            </strong>
                          </div>
                        ))}
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
              disabled={!puedeGuardar || cargando}
              className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? 'Registrando...'
                : `Registrar salida${
                    items.length > 1
                      ? ` (${items.length})`
                      : ''
                  }`}
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

function normalizar(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function numeroPositivo(valor: string) {
  const n = Number(String(valor).replace(',', '.'))

  return Number.isFinite(n) && n > 0 ? n : 0
}

function formatearCantidad(valor: number) {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor)
}
