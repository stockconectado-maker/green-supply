
'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type Genetica = {
  id: number
  nombre: string
  activa: boolean
  observaciones: string | null
  created_at: string
}

type Lote = {
  id: number
  codigo_lote: string
  genetica_id: number
  fecha_ingreso: string | null
  fecha_cosecha: string | null
  estado: string
  observaciones: string | null
  created_at: string
  geneticas: {
    id: number
    nombre: string
    activa: boolean
  } | null
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
  fecha: string
  motivo: string | null
  observaciones: string | null
  created_at: string
  lotes: {
    id: number
    codigo_lote: string
    genetica_id: number
    geneticas: {
      id: number
      nombre: string
    } | null
  } | null
}

const gramos = (n: number) =>
  `${new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 2,
  }).format(n)} g`

function fecha(valor: string | null) {
  if (!valor) return '—'

  const [year, month, day] = valor
    .slice(0, 10)
    .split('-')
    .map(Number)

  if (!year || !month || !day) return '—'

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(
    new Date(year, month - 1, day, 12)
  )
}

function saldoMovimiento(m: Movimiento) {
  const valor = Number(m.cantidad)

  if (!Number.isFinite(valor)) return 0

  return m.tipo === 'Ingreso' ||
    m.tipo === 'Ajuste positivo'
    ? valor
    : -valor
}

export default function StockClient({
  geneticas,
  lotes,
  movimientos,
}: {
  geneticas: Genetica[]
  lotes: Lote[]
  movimientos: Movimiento[]
}) {
  const [busqueda, setBusqueda] = useState('')
  const [soloConStock, setSoloConStock] =
    useState(false)

  const [
    mostrarTodosLotes,
    setMostrarTodosLotes,
  ] = useState(false)

  const [
    mostrarTodosMovimientos,
    setMostrarTodosMovimientos,
  ] = useState(false)

  // STOCK CALCULADO POR MOVIMIENTOS

  const stockPorLote = useMemo(() => {
    const mapa = new Map<number, number>(
      lotes.map((l) => [l.id, 0])
    )

    movimientos.forEach((m) =>
      mapa.set(
        m.lote_id,
        (mapa.get(m.lote_id) ?? 0) +
          saldoMovimiento(m)
      )
    )

    return mapa
  }, [lotes, movimientos])

  // STOCK CONSOLIDADO POR GENÉTICA

  const stockPorGenetica = useMemo(() => {
    const mapa = new Map<number, number>(
      geneticas.map((g) => [g.id, 0])
    )

    lotes.forEach((l) =>
      mapa.set(
        l.genetica_id,
        (mapa.get(l.genetica_id) ?? 0) +
          (stockPorLote.get(l.id) ?? 0)
      )
    )

    return mapa
  }, [geneticas, lotes, stockPorLote])

  const existenciaTotal = useMemo(
    () =>
      Array.from(stockPorLote.values()).reduce(
        (s, n) => s + n,
        0
      ),
    [stockPorLote]
  )

  const geneticasConStock = geneticas.filter(
    (g) =>
      (stockPorGenetica.get(g.id) ?? 0) > 0
  ).length

  const lotesConStock = lotes.filter(
    (l) =>
      (stockPorLote.get(l.id) ?? 0) > 0
  ).length

  // BÚSQUEDA Y FILTROS

  const geneticasVisibles = useMemo(
    () =>
      geneticas
        .filter((g) =>
          g.nombre
            .toLowerCase()
            .includes(
              busqueda.trim().toLowerCase()
            )
        )
        .filter(
          (g) =>
            !soloConStock ||
            (stockPorGenetica.get(g.id) ?? 0) > 0
        )
        .sort(
          (a, b) =>
            (stockPorGenetica.get(b.id) ?? 0) -
              (stockPorGenetica.get(a.id) ?? 0) ||
            a.nombre.localeCompare(b.nombre)
        ),
    [
      geneticas,
      busqueda,
      soloConStock,
      stockPorGenetica,
    ]
  )

  const lotesOrdenados = useMemo(
    () =>
      [...lotes].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      ),
    [lotes]
  )

  const movimientosOrdenados = useMemo(
    () =>
      [...movimientos].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      ),
    [movimientos]
  )

  const mayorExistencia = Math.max(
    0,
    ...geneticasVisibles.map(
      (g) =>
        stockPorGenetica.get(g.id) ?? 0
    )
  )

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-zinc-900">
      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">

        {/* CABECERA */}

        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.17em] text-emerald-700">
              Existencias / Inventario
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Stock
            </h1>

            <p className="mt-1.5 text-sm text-zinc-500">
              Disponibilidad, lotes y trazabilidad
              en un solo lugar.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/stock/geneticas/nueva"
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              + Genética
            </Link>

            <Link
              href="/stock/ingresos/nuevo"
              className="rounded-lg bg-zinc-950 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              + Ingreso
            </Link>

            <Link
              href="/stock/salidas/nueva"
              className="rounded-lg border border-emerald-700 bg-emerald-700 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              − Salida
            </Link>
          </div>
        </header>

        {/* INDICADORES */}

        <section
          aria-label="Resumen de stock"
          className="mt-7 grid grid-cols-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:grid-cols-4"
        >
          <Kpi
            titulo="Existencia total"
            valor={gramos(existenciaTotal)}
            detalle="Calculada por movimientos"
            destacado
          />

          <Kpi
            titulo="Genéticas con stock"
            valor={String(geneticasConStock)}
            detalle={`${geneticas.length} registradas`}
          />

          <Kpi
            titulo="Lotes con stock"
            valor={String(lotesConStock)}
            detalle={`${lotes.length} registrados`}
          />

          <Kpi
            titulo="Movimientos"
            valor={String(movimientos.length)}
            detalle="Historial total"
          />
        </section>

        {/* EXISTENCIAS POR GENÉTICA */}

        <section className="mt-7 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-950">
                Existencias por genética
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Saldo consolidado de sus lotes registrados.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

              <label className="relative">
                <span className="sr-only">
                  Buscar genética
                </span>

                <input
                  value={busqueda}
                  onChange={(e) =>
                    setBusqueda(e.target.value)
                  }
                  placeholder="Buscar genética..."
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 sm:w-56"
                />
              </label>

              <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-zinc-200 px-3 py-2.5 text-xs font-medium text-zinc-600">
                <input
                  type="checkbox"
                  checked={soloConStock}
                  onChange={(e) =>
                    setSoloConStock(e.target.checked)
                  }
                  className="accent-emerald-700"
                />

                Solo con stock
              </label>
            </div>
          </div>

          {geneticasVisibles.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-zinc-500">
              No hay genéticas que coincidan
              con el filtro.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">

              {/* ENCABEZADO DE TABLA */}

              <div className="hidden grid-cols-[minmax(0,1fr)_110px_150px_90px] gap-4 bg-zinc-50/70 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 md:grid">
                <span>
                  Genética / Existencia relativa
                </span>

                <span>Estado</span>

                <span className="text-right">
                  Disponible
                </span>

                <span />
              </div>

              {/* FILAS */}

              {geneticasVisibles.map((g) => {
                const stock =
                  stockPorGenetica.get(g.id) ?? 0

                const ancho =
                  mayorExistencia > 0
                    ? Math.max(
                        0,
                        Math.min(
                          100,
                          (stock /
                            mayorExistencia) *
                            100
                        )
                      )
                    : 0

                return (
                  <Link
                    key={g.id}
                    href={`/stock/geneticas/${g.id}`}
                    className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 transition hover:bg-emerald-50/30 md:grid-cols-[minmax(0,1fr)_110px_150px_90px] md:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900 group-hover:text-emerald-800">
                        {g.nombre}
                      </p>

                      {g.observaciones && (
                        <p className="mt-0.5 truncate text-xs text-zinc-400">
                          {g.observaciones}
                        </p>
                      )}

                      <div className="mt-2 h-1 max-w-[350px] overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{
                            width: `${ancho}%`,
                          }}
                        />
                      </div>
                    </div>

                    <span
                      className={`hidden w-fit rounded-full px-2 py-1 text-[10px] font-semibold md:inline-flex ${
                        g.activa
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-zinc-100 text-zinc-500'
                      }`}
                    >
                      {g.activa
                        ? 'Activa'
                        : 'Inactiva'}
                    </span>

                    <div className="text-right">
                      <p className="whitespace-nowrap text-base font-semibold tabular-nums text-zinc-950">
                        {gramos(stock)}
                      </p>

                      <p className="mt-0.5 text-[10px] text-zinc-400 md:hidden">
                        {g.activa
                          ? 'Activa'
                          : 'Inactiva'}
                      </p>
                    </div>

                    <span className="hidden text-right text-xs font-semibold text-emerald-700 md:block">
                      Ver detalle →
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* LOTES Y MOVIMIENTOS */}

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">

          {/* LOTES */}

          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

            <Encabezado
              titulo="Lotes"
              detalle="Existencias y trazabilidad por lote"
              total={lotes.length}
            />

            {lotes.length === 0 ? (
              <Vacio texto="Todavía no hay lotes registrados." />
            ) : (
              <div className="divide-y divide-zinc-100">

                {(mostrarTodosLotes
                  ? lotesOrdenados
                  : lotesOrdenados.slice(0, 6)
                ).map((l) => (
                  <Link
                    key={l.id}
                    href={`/stock/lotes/${l.id}`}
                    className="group flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-zinc-50"
                  >
                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-mono text-xs font-bold text-zinc-900 group-hover:text-emerald-800">
                          {l.codigo_lote}
                        </span>

                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            l.estado === 'Activo'
                              ? 'bg-emerald-50 text-emerald-700'
                              : l.estado === 'Bloqueado'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          {l.estado}
                        </span>
                      </div>

                      <p className="mt-1 truncate text-xs text-zinc-600">
                        {l.geneticas?.nombre ||
                          'Genética sin identificar'}

                        <span className="mx-1 text-zinc-300">
                          ·
                        </span>

                        Cosecha: {fecha(l.fecha_cosecha)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {gramos(
                          stockPorLote.get(l.id) ?? 0
                        )}
                      </p>

                      <p className="mt-1 text-[10px] text-emerald-700">
                        Ver lote →
                      </p>
                    </div>
                  </Link>
                ))}

                {lotes.length > 6 && (
                  <button
                    type="button"
                    onClick={() =>
                      setMostrarTodosLotes(
                        (v) => !v
                      )
                    }
                    className="w-full px-5 py-3 text-xs font-semibold text-emerald-700 hover:bg-zinc-50"
                  >
                    {mostrarTodosLotes
                      ? 'Ver menos'
                      : `Ver todos los lotes (${lotes.length})`}
                  </button>
                )}
              </div>
            )}
          </section>

          {/* MOVIMIENTOS */}

          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

            <Encabezado
              titulo="Movimientos recientes"
              detalle="Ingresos, salidas y ajustes registrados"
              total={movimientos.length}
            />

            {movimientos.length === 0 ? (
              <Vacio texto="Todavía no hay movimientos registrados." />
            ) : (
              <div className="divide-y divide-zinc-100">

                {(mostrarTodosMovimientos
                  ? movimientosOrdenados
                  : movimientosOrdenados.slice(0, 6)
                ).map((m) => {
                  const positivo =
                    saldoMovimiento(m) >= 0

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              positivo
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {m.tipo}
                          </span>

                          <span className="truncate text-xs font-semibold text-zinc-800">
                            {m.lotes?.geneticas
                              ?.nombre ??
                              'Sin genética'}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {m.lotes?.codigo_lote ??
                            'Sin lote'}

                          <span className="mx-1 text-zinc-300">
                            ·
                          </span>

                          {fecha(m.fecha)}

                          {m.motivo
                            ? ` · ${m.motivo}`
                            : ''}
                        </p>
                      </div>

                      <p
                        className={`shrink-0 text-sm font-semibold tabular-nums ${
                          positivo
                            ? 'text-emerald-700'
                            : 'text-zinc-800'
                        }`}
                      >
                        {positivo ? '+' : '−'}
                        {gramos(
                          Math.abs(
                            Number(m.cantidad)
                          )
                        )}
                      </p>
                    </div>
                  )
                })}

                {movimientos.length > 6 && (
                  <button
                    type="button"
                    onClick={() =>
                      setMostrarTodosMovimientos(
                        (v) => !v
                      )
                    }
                    className="w-full px-5 py-3 text-xs font-semibold text-emerald-700 hover:bg-zinc-50"
                  >
                    {mostrarTodosMovimientos
                      ? 'Ver menos'
                      : `Ver todos los movimientos (${movimientos.length})`}
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

/* COMPONENTES VISUALES */

function Kpi({
  titulo,
  valor,
  detalle,
  destacado = false,
}: {
  titulo: string
  valor: string
  detalle: string
  destacado?: boolean
}) {
  return (
    <div className="border-b border-r border-zinc-100 px-5 py-5 last:border-r-0 lg:border-b-0">
      <p className="text-xs font-medium text-zinc-500">
        {titulo}
      </p>

      <p
        className={`mt-1.5 text-2xl font-semibold tracking-tight tabular-nums ${
          destacado
            ? 'text-emerald-700'
            : 'text-zinc-950'
        }`}
      >
        {valor}
      </p>

      <p className="mt-1 text-[11px] text-zinc-400">
        {detalle}
      </p>
    </div>
  )
}

function Encabezado({
  titulo,
  detalle,
  total,
}: {
  titulo: string
  detalle: string
  total: number
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">
          {titulo}
        </h2>

        <p className="mt-1 text-xs text-zinc-500">
          {detalle}
        </p>
      </div>

      <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
        {total}
      </span>
    </div>
  )
}

function Vacio({
  texto,
}: {
  texto: string
}) {
  return (
    <p className="px-5 py-12 text-center text-sm text-zinc-500">
      {texto}
    </p>
  )
}
