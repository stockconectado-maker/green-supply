'use client'

import Link from 'next/link'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Asociado = {
  id: number
  numero_socio: string | null
  nombre_apellido: string
  dni: string | null
  estado_asociado: string | null
  estado_reprocann: string | null
}

type StockGenetica = {
  genetica_id: number
  genetica: string
  stock_disponible_g: number | string
  lotes_disponibles: number
}

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
  estado: string
  observaciones: string | null
  lotes_utilizados: number
  lotes: string | null
  movimiento_financiero_id: number | null
  aporte_importe: number | string | null
  aporte_moneda: string | null
  tipo_cambio_ars_usd: number | string | null
  aporte_equivalente_ars: number | string | null
  medio_pago: string | null
}

type ItemDispensa = {
  genetica_id: number
  genetica: string
  stock_disponible_g: number
  lotes_disponibles: number
  cantidad: string
}

type ResultadoDispensaMultiple = {
  asociado_id: number
  asociado: string
  cantidad_geneticas: number
  cantidad_total_g: number
  aporte_importe: number
  moneda: 'ARS' | 'USD'
  tipo_cambio_ars_usd: number | null
  aporte_equivalente_ars: number
  medio_pago: string | null
  movimiento_financiero_id: number
  dispensa_ids: number[]
  dispensas: Array<{
    dispensa_id: number
    genetica_id: number
    genetica: string
    cantidad_g: number
    lotes: Array<{
      lote_id: number
      codigo_lote: string
      cantidad_g: number
      movimiento_stock_id: number
    }>
  }>
}

export default function DispensaPage() {
  const supabase = useMemo(() => createClient(), [])

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState<ResultadoDispensaMultiple | null>(null)

  const [asociados, setAsociados] = useState<Asociado[]>([])
  const [stock, setStock] = useState<StockGenetica[]>([])
  const [recientes, setRecientes] = useState<Dispensa[]>([])
  const [hoy, setHoy] = useState<Dispensa[]>([])
  const [semana, setSemana] = useState<Dispensa[]>([])

  const [busquedaAsociado, setBusquedaAsociado] = useState('')
  const [busquedaGenetica, setBusquedaGenetica] = useState('')

  const [asociadoId, setAsociadoId] = useState<number | null>(null)
  const [items, setItems] = useState<ItemDispensa[]>([])

  const [aporte, setAporte] = useState('')
  const [monedaAporte, setMonedaAporte] = useState<'ARS' | 'USD'>('ARS')
  const [cotizacionUsd, setCotizacionUsd] = useState('')
  const [medioAporte, setMedioAporte] = useState('')
  const [aporteEfectivo, setAporteEfectivo] = useState('')
  const [aporteTransferencia, setAporteTransferencia] = useState('')
  const [aporteEfectivoUsd, setAporteEfectivoUsd] = useState('')
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargar() {
    setCargando(true)
    setError('')

    const fechaHoy = fechaLocal()
    const inicioSemana = fechaInicioSemana()

    const [
      resultadoAsociados,
      resultadoStock,
      resultadoRecientes,
      resultadoHoy,
      resultadoSemana,
    ] = await Promise.all([
      supabase
        .from('asociados')
        .select(
          'id, numero_socio, nombre_apellido, dni, estado_asociado, estado_reprocann'
        )
        .eq('estado_asociado', 'Asociado activo')
        .order('nombre_apellido'),

      supabase
        .from('vista_stock_geneticas_dispensa')
        .select('*')
        .gt('stock_disponible_g', 0)
        .order('genetica'),

      supabase
        .from('vista_dispensas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12),

      supabase
        .from('vista_dispensas')
        .select('*')
        .eq('fecha', fechaHoy),

      supabase
        .from('vista_dispensas')
        .select('*')
        .gte('fecha', inicioSemana)
        .lte('fecha', fechaHoy),
    ])

    const primerError =
      resultadoAsociados.error ||
      resultadoStock.error ||
      resultadoRecientes.error ||
      resultadoHoy.error ||
      resultadoSemana.error

    if (primerError) {
      setError(
        describirErrorSupabase(
          primerError,
          'No se pudo cargar Dispensa.'
        )
      )
      setCargando(false)
      return
    }

    const stockActual = (resultadoStock.data ?? []) as StockGenetica[]

    setAsociados((resultadoAsociados.data ?? []) as Asociado[])
    setStock(stockActual)
    setRecientes((resultadoRecientes.data ?? []) as Dispensa[])
    setHoy((resultadoHoy.data ?? []) as Dispensa[])
    setSemana((resultadoSemana.data ?? []) as Dispensa[])

    setItems((actuales) =>
      actuales.map((item) => {
        const actualizado = stockActual.find(
          (s) => s.genetica_id === item.genetica_id
        )

        return actualizado
          ? {
              ...item,
              stock_disponible_g: numero(actualizado.stock_disponible_g),
              lotes_disponibles: actualizado.lotes_disponibles,
            }
          : item
      })
    )

    setCargando(false)
  }

  const asociadoSeleccionado =
    asociados.find((item) => item.id === asociadoId) ?? null

  const asociadosFiltrados = useMemo(() => {
    const q = normalizar(busquedaAsociado)

    if (!q || asociadoSeleccionado) return []

    return asociados
      .filter((item) =>
        normalizar(
          [
            item.numero_socio,
            item.nombre_apellido,
            item.dni,
            item.estado_reprocann,
          ]
            .filter(Boolean)
            .join(' ')
        ).includes(q)
      )
      .slice(0, 7)
  }, [asociados, busquedaAsociado, asociadoSeleccionado])

  const geneticasFiltradas = useMemo(() => {
    const q = normalizar(busquedaGenetica)

    if (!q) return []

    const seleccionadas = new Set(items.map((item) => item.genetica_id))

    return stock
      .filter(
        (item) =>
          !seleccionadas.has(item.genetica_id) &&
          normalizar(item.genetica).includes(q)
      )
      .slice(0, 8)
  }, [stock, busquedaGenetica, items])

  const itemsConCantidad = items.map((item) => ({
    ...item,
    cantidadNumero: numeroPositivo(item.cantidad),
  }))

  const totalGramos = itemsConCantidad.reduce(
    (total, item) => total + item.cantidadNumero,
    0
  )

  const hayCantidadInvalida = itemsConCantidad.some(
    (item) =>
      item.cantidadNumero <= 0 ||
      item.cantidadNumero > item.stock_disponible_g
  )

  const aporteEfectivoNumero = numeroPositivo(aporteEfectivo)
  const aporteTransferenciaNumero = numeroPositivo(aporteTransferencia)
  const aporteEfectivoUsdNumero = numeroPositivo(aporteEfectivoUsd)
  const cotizacionUsdNumero = numeroPositivo(cotizacionUsd)

  const aporteMixtoArs =
    aporteEfectivoNumero +
    aporteTransferenciaNumero +
    aporteEfectivoUsdNumero * cotizacionUsdNumero

  const aporteNumero =
    medioAporte === 'Mixto'
      ? aporteMixtoArs
      : numeroPositivo(aporte)

  const aporteEquivalenteArs =
    monedaAporte === 'USD' && medioAporte !== 'Mixto'
      ? aporteNumero * cotizacionUsdNumero
      : aporteNumero

  const resumenHoy = resumirOperativa(hoy)
  const resumenSemana = resumirOperativa(semana)

  const puedeConfirmar =
    asociadoSeleccionado !== null &&
    items.length > 0 &&
    !hayCantidadInvalida &&
    totalGramos > 0 &&
    aporteNumero > 0 &&
    (monedaAporte === 'ARS' || cotizacionUsdNumero > 0) &&
    medioAporte.trim() !== '' &&
    (
      medioAporte !== 'Mixto' ||
      (
        [aporteEfectivoNumero, aporteTransferenciaNumero, aporteEfectivoUsdNumero]
          .filter((valor) => valor > 0).length >= 2 &&
        (
          aporteEfectivoUsdNumero <= 0 ||
          cotizacionUsdNumero > 0
        )
      )
    ) &&
    !guardando

  function agregarGenetica(item: StockGenetica) {
    setItems((actuales) => [
      ...actuales,
      {
        genetica_id: item.genetica_id,
        genetica: item.genetica,
        stock_disponible_g: numero(item.stock_disponible_g),
        lotes_disponibles: item.lotes_disponibles,
        cantidad: '',
      },
    ])

    setBusquedaGenetica('')
    setExito(null)
    setError('')
  }

  function quitarGenetica(geneticaId: number) {
    setItems((actuales) =>
      actuales.filter((item) => item.genetica_id !== geneticaId)
    )
    setExito(null)
    setError('')
  }

  function cambiarCantidad(geneticaId: number, valor: string) {
    setItems((actuales) =>
      actuales.map((item) =>
        item.genetica_id === geneticaId
          ? { ...item, cantidad: valor }
          : item
      )
    )
    setExito(null)
  }

  async function confirmar() {
    if (!asociadoSeleccionado) {
      setError('Seleccioná un asociado.')
      return
    }

    if (!items.length) {
      setError('Agregá al menos una genética.')
      return
    }

    for (const item of itemsConCantidad) {
      if (item.cantidadNumero <= 0) {
        setError(`Ingresá una cantidad válida para ${item.genetica}.`)
        return
      }

      if (item.cantidadNumero > item.stock_disponible_g) {
        setError(
          `Stock insuficiente para ${item.genetica}. Disponible: ${formatearGramos(
            item.stock_disponible_g
          )}.`
        )
        return
      }
    }

    if (!medioAporte.trim()) {
      setError('Elegí el medio del aporte.')
      return
    }

    if (medioAporte === 'Mixto') {
      const componentesPositivos = [
        aporteEfectivoNumero,
        aporteTransferenciaNumero,
        aporteEfectivoUsdNumero,
      ].filter((valor) => valor > 0).length

      if (componentesPositivos < 2) {
        setError('En pago mixto completá al menos dos formas de pago.')
        return
      }

      if (aporteEfectivoUsdNumero > 0 && cotizacionUsdNumero <= 0) {
        setError('Ingresá la cotización utilizada para el efectivo USD.')
        return
      }
    }

    if (aporteNumero <= 0) {
      setError('Ingresá el aporte realizado.')
      return
    }

    if (
      monedaAporte === 'USD' &&
      medioAporte !== 'Mixto' &&
      cotizacionUsdNumero <= 0
    ) {
      setError('Ingresá la cotización tomada para el USD.')
      return
    }

    const detalleGeneticas = itemsConCantidad
      .map(
        (item) =>
          `${item.genetica} · ${formatearGramos(item.cantidadNumero)}`
      )
      .join('\n')

    const confirmado = window.confirm(
      [
        'Confirmar operación',
        '',
        asociadoSeleccionado.nombre_apellido,
        '',
        detalleGeneticas,
        '',
        `Total: ${formatearGramos(totalGramos)}`,
        `Aporte: ${formatearAporte(aporteNumero, monedaAporte)}`,
        ...(monedaAporte === 'USD'
          ? [
              `Cotización: 1 USD = ${formatearPesos(cotizacionUsdNumero)}`,
              `Equivalente ARS: ${formatearPesos(aporteEquivalenteArs)}`,
              'Medio: Efectivo USD',
            ]
          : medioAporte === 'Mixto'
            ? [
                'Medio: Mixto',
                ...(aporteTransferenciaNumero > 0
                  ? [`Transferencia ARS: ${formatearPesos(aporteTransferenciaNumero)}`]
                  : []),
                ...(aporteEfectivoNumero > 0
                  ? [`Efectivo ARS: ${formatearPesos(aporteEfectivoNumero)}`]
                  : []),
                ...(aporteEfectivoUsdNumero > 0
                  ? [
                      `Efectivo USD: ${formatearAporte(aporteEfectivoUsdNumero, 'USD')}`,
                      `Cotización: 1 USD = ${formatearPesos(cotizacionUsdNumero)}`,
                    ]
                  : []),
                `Total ARS equivalente: ${formatearPesos(aporteMixtoArs)}`,
              ]
            : [`Medio: ${medioAporte}`]),
      ].join('\n')
    )

    if (!confirmado) return

    setGuardando(true)
    setError('')
    setExito(null)

    const resultado = await supabase.rpc(
      'registrar_dispensa_multiple_medios_v2',
      {
        p_asociado_id: asociadoSeleccionado.id,
        p_items: itemsConCantidad.map((item) => ({
          genetica_id: item.genetica_id,
          cantidad_g: item.cantidadNumero,
        })),
        p_aporte_importe:
          medioAporte === 'Mixto'
            ? aporteMixtoArs
            : aporteNumero,
        p_aporte_moneda:
          medioAporte === 'Mixto'
            ? 'ARS'
            : monedaAporte,
        p_tipo_cambio_ars_usd:
          medioAporte === 'Mixto'
            ? aporteEfectivoUsdNumero > 0
              ? cotizacionUsdNumero
              : null
            : monedaAporte === 'USD'
              ? cotizacionUsdNumero
              : null,
        p_medio_pago: medioAporte,
        p_aporte_efectivo_ars:
          medioAporte === 'Mixto'
            ? aporteEfectivoNumero
            : null,
        p_aporte_transferencia_ars:
          medioAporte === 'Mixto'
            ? aporteTransferenciaNumero
            : null,
        p_aporte_efectivo_usd:
          medioAporte === 'Mixto'
            ? aporteEfectivoUsdNumero
            : null,
        p_observaciones: observaciones.trim() || null,
      }
    )

    if (resultado.error) {
      setError(
        describirErrorSupabase(
          resultado.error,
          'No se pudo registrar la operación.'
        )
      )
      setGuardando(false)
      return
    }

    setExito(resultado.data as ResultadoDispensaMultiple)

    setItems([])
    setBusquedaGenetica('')
    setAporte('')
    setMonedaAporte('ARS')
    setCotizacionUsd('')
    setMedioAporte('')
    setAporteEfectivo('')
    setAporteTransferencia('')
    setAporteEfectivoUsd('')
    setObservaciones('')

    setGuardando(false)

    await cargar()
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-[#f5f6f7]">
        <div className="mx-auto max-w-[1500px] px-5 py-10 lg:px-7">
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center text-sm text-zinc-500 shadow-sm">
            Cargando Dispensa...
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f6f7]">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-5 lg:px-7 lg:py-6">
        <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              Gestión de entregas
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
              Dispensa
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Una operación puede incluir una o varias genéticas.
            </p>
          </div>

          <Link
            href="/dispensa/estadisticas"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            Estadísticas <span aria-hidden="true">→</span>
          </Link>
        </header>

        <section className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[11px] shadow-sm">
          <span className="font-bold uppercase tracking-[0.08em] text-zinc-400">
            Hoy
          </span>

          <Marcador valor={String(resumenHoy.operaciones)} texto="dispensas" />
          <Punto />
          <Marcador
            valor={formatearGramos(resumenHoy.gramos)}
            texto="dispensados"
          />
          <Punto />
          <Marcador valor={String(resumenHoy.asociados)} texto="asociados" />

          <span className="ml-auto hidden text-zinc-400 lg:inline">
            Semana:{' '}
            <strong className="font-semibold text-zinc-600">
              {resumenSemana.operaciones}
            </strong>{' '}
            dispensas ·{' '}
            <strong className="font-semibold text-zinc-600">
              {formatearGramos(resumenSemana.gramos)}
            </strong>
          </span>
        </section>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {exito && (
          <div className="mb-4 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-emerald-900">
                <strong className="font-semibold">Operación registrada.</strong>{' '}
                {exito.asociado} · {exito.cantidad_geneticas}{' '}
                {exito.cantidad_geneticas === 1 ? 'genética' : 'genéticas'} ·{' '}
                {formatearGramos(numero(exito.cantidad_total_g))}
              </p>

              <p className="mt-0.5 text-[11px] text-emerald-700">
                Un solo aporte financiero · Stock actualizado por cada genética.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setExito(null)}
              className="text-left text-xs font-semibold text-emerald-700"
            >
              Cerrar
            </button>
          </div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="grid xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="p-4 lg:p-5">
              <div className="grid gap-3 lg:grid-cols-2">
                <CampoBusqueda
                  etiqueta="Asociado"
                  seleccionado={
                    asociadoSeleccionado
                      ? {
                          titulo: asociadoSeleccionado.nombre_apellido,
                          detalle: `${numeroSocio(
                            asociadoSeleccionado
                          )} · REPROCANN ${
                            asociadoSeleccionado.estado_reprocann ?? '—'
                          }`,
                        }
                      : null
                  }
                  valor={busquedaAsociado}
                  placeholder="Buscar asociado"
                  onCambiarValor={(valor) => {
                    setBusquedaAsociado(valor)
                    setExito(null)
                  }}
                  onCambiarSeleccion={() => {
                    setAsociadoId(null)
                    setBusquedaAsociado('')
                    setExito(null)
                  }}
                >
                  {busquedaAsociado.trim() &&
                    asociadosFiltrados.length > 0 && (
                      <ListaResultados>
                        {asociadosFiltrados.map((item) => (
                          <Resultado
                            key={item.id}
                            titulo={item.nombre_apellido}
                            detalle={`${numeroSocio(item)}${
                              item.dni
                                ? ` · DNI ${dniOculto(item.dni)}`
                                : ''
                            } · REPROCANN ${
                              item.estado_reprocann ?? '—'
                            }`}
                            onClick={() => {
                              setAsociadoId(item.id)
                              setBusquedaAsociado('')
                            }}
                          />
                        ))}
                      </ListaResultados>
                    )}
                </CampoBusqueda>

                <CampoBusqueda
                  etiqueta="Agregar genética"
                  seleccionado={null}
                  valor={busquedaGenetica}
                  placeholder="Buscar genética"
                  onCambiarValor={(valor) => {
                    setBusquedaGenetica(valor)
                    setExito(null)
                  }}
                  onCambiarSeleccion={() => {}}
                >
                  {busquedaGenetica.trim() &&
                    geneticasFiltradas.length > 0 && (
                      <ListaResultados>
                        {geneticasFiltradas.map((item) => (
                          <Resultado
                            key={item.genetica_id}
                            titulo={item.genetica}
                            detalle={`${formatearGramos(
                              numero(item.stock_disponible_g)
                            )} disponibles · ${item.lotes_disponibles} lote${
                              item.lotes_disponibles === 1 ? '' : 's'
                            }`}
                            accion="Agregar"
                            onClick={() => agregarGenetica(item)}
                          />
                        ))}
                      </ListaResultados>
                    )}
                </CampoBusqueda>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-zinc-700">
                      Genéticas seleccionadas
                    </p>
                    <p className="mt-0.5 text-[10px] text-zinc-400">
                      Cargá los gramos de cada una.
                    </p>
                  </div>

                  {!!items.length && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                      {items.length}{' '}
                      {items.length === 1 ? 'genética' : 'genéticas'}
                    </span>
                  )}
                </div>

                {!items.length ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-6 text-center text-sm text-zinc-400">
                    Buscá una genética arriba y agregala a la operación.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {itemsConCantidad.map((item) => {
                      const restante =
                        item.cantidadNumero > 0
                          ? Math.max(
                              0,
                              item.stock_disponible_g - item.cantidadNumero
                            )
                          : item.stock_disponible_g

                      const excede =
                        item.cantidadNumero > item.stock_disponible_g

                      return (
                        <div
                          key={item.genetica_id}
                          className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-center"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-950">
                              {item.genetica}
                            </p>

                            <p className="mt-0.5 text-[10px] text-zinc-500">
                              Disponible:{' '}
                              <strong className="font-semibold text-zinc-700">
                                {formatearGramos(item.stock_disponible_g)}
                              </strong>{' '}
                              · Luego:{' '}
                              <strong
                                className={
                                  excede
                                    ? 'font-semibold text-red-600'
                                    : 'font-semibold text-zinc-700'
                                }
                              >
                                {formatearGramos(restante)}
                              </strong>
                            </p>
                          </div>

                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.cantidad}
                              onChange={(event) =>
                                cambiarCantidad(
                                  item.genetica_id,
                                  event.target.value
                                )
                              }
                              placeholder="Cantidad"
                              className={`campo-compacto pr-10 ${
                                excede ? 'campo-error' : ''
                              }`}
                            />

                            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">
                              g
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => quitarGenetica(item.genetica_id)}
                            className="rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-400 transition hover:bg-white hover:text-red-600"
                            aria-label={`Quitar ${item.genetica}`}
                          >
                            Quitar
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div
                className={`mt-4 grid gap-3 ${
                  monedaAporte === 'USD'
                    ? 'xl:grid-cols-[100px_170px_185px_175px_minmax(150px,.7fr)]'
                    : 'xl:grid-cols-[100px_175px_315px_minmax(150px,.65fr)]'
                }`}
              >
                <Campo etiqueta="Moneda">
                  {medioAporte === 'Mixto' ? (
                    <div className="flex min-h-[43px] items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm font-semibold text-zinc-700">
                      ARS + USD
                    </div>
                  ) : (
                    <select
                      value={monedaAporte}
                      onChange={(event) => {
                        const nuevaMoneda =
                          event.target.value as 'ARS' | 'USD'

                        setMonedaAporte(nuevaMoneda)
                        setAporte('')
                        setAporteEfectivo('')
                        setAporteTransferencia('')
                        setAporteEfectivoUsd('')

                        if (nuevaMoneda === 'USD') {
                          setMedioAporte('Efectivo USD')
                        } else {
                          setMedioAporte('')
                          setCotizacionUsd('')
                        }

                        setExito(null)
                      }}
                      className="campo-compacto"
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  )}
                </Campo>

                <Campo
                  etiqueta={
                    medioAporte === 'Mixto'
                      ? 'Total aporte'
                      : 'Aporte'
                  }
                >
                  <div
                    className={`flex overflow-hidden rounded-xl border transition ${
                      medioAporte === 'Mixto'
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-zinc-200 bg-white focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100'
                    }`}
                  >
                    <span className="flex min-w-[48px] items-center justify-center border-r border-zinc-200 bg-zinc-50 px-3 text-xs font-bold text-zinc-500">
                      {medioAporte === 'Mixto' ? '$' : monedaAporte === 'USD' ? 'USD' : '$'}
                    </span>

                    <input
                      type="number"
                      min="0"
                      step={monedaAporte === 'USD' ? '0.01' : '1'}
                      value={
                        medioAporte === 'Mixto'
                          ? aporteNumero > 0
                            ? aporteNumero
                            : ''
                          : aporte
                      }
                      readOnly={
                        medioAporte === 'Mixto'
                      }
                      onChange={(event) => {
                        if (
                          monedaAporte === 'ARS' &&
                          medioAporte === 'Mixto'
                        ) {
                          return
                        }

                        setAporte(event.target.value)
                        setExito(null)
                      }}
                      className={`min-w-0 flex-1 px-3.5 py-[0.72rem] text-sm font-semibold outline-none ${
                        medioAporte === 'Mixto'
                          ? 'bg-emerald-50 text-emerald-900'
                          : 'bg-white text-zinc-950'
                      }`}
                    />
                  </div>
                </Campo>

                {monedaAporte === 'USD' && (
                  <Campo etiqueta="Cotización USD">
                    <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-white transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100">
                      <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-3 text-[10px] font-semibold text-zinc-500">
                        1 USD =
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cotizacionUsd}
                        onChange={(event) => {
                          setCotizacionUsd(event.target.value)
                          setExito(null)
                        }}
                        className="min-w-0 flex-1 bg-white px-3.5 py-[0.72rem] text-sm font-semibold text-zinc-950 outline-none"
                      />

                      <span className="flex items-center border-l border-zinc-200 bg-zinc-50 px-2.5 text-[10px] font-bold text-zinc-400">
                        ARS
                      </span>
                    </div>
                  </Campo>
                )}

                <Campo etiqueta="Medio de aporte">
                  {monedaAporte === 'USD' ? (
                    <div className="flex min-h-[43px] items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm font-semibold text-zinc-700">
                      Efectivo USD
                    </div>
                  ) : (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-1">
                      <div className="grid grid-cols-3 gap-1">
                        {['Transferencia', 'Efectivo', 'Mixto'].map((medio) => {
                          const seleccionado = medioAporte === medio

                          return (
                            <button
                              key={medio}
                              type="button"
                              onClick={() => {
                                setMedioAporte(medio)

                                if (medio === 'Mixto') {
                                  setAporte('')
                                } else {
                                  setAporteEfectivo('')
                                  setAporteTransferencia('')
                                  setAporteEfectivoUsd('')
                                  setCotizacionUsd('')
                                }

                                setExito(null)
                                setError('')
                              }}
                              aria-pressed={seleccionado}
                              className={`min-h-[39px] rounded-lg px-2 text-xs font-semibold transition ${
                                seleccionado
                                  ? 'bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-200'
                                  : 'text-zinc-500 hover:bg-white/70 hover:text-zinc-800'
                              }`}
                            >
                              {medio}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </Campo>

                <Campo etiqueta="Observación" opcional>
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(event) =>
                      setObservaciones(event.target.value)
                    }
                    className="campo-compacto"
                  />
                </Campo>
              </div>

              {medioAporte === 'Mixto' && (
                <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                        Composición del aporte
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-400">
                        Completá al menos dos formas de pago.
                      </p>
                    </div>

                    <div className="rounded-lg bg-white px-3 py-1.5 text-right ring-1 ring-zinc-200">
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                        Total ARS equiv.
                      </p>
                      <p className="text-sm font-semibold text-zinc-950">
                        {formatearPesos(aporteMixtoArs)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                      <p className="mb-1.5 text-[10px] font-semibold text-zinc-500">
                        Transferencia ARS
                      </p>
                      <div className="flex items-center">
                        <span className="mr-2 text-xs font-bold text-zinc-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={aporteTransferencia}
                          onChange={(event) => {
                            setAporteTransferencia(event.target.value)
                            setExito(null)
                          }}
                          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-zinc-950 outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                      <p className="mb-1.5 text-[10px] font-semibold text-zinc-500">
                        Efectivo ARS
                      </p>
                      <div className="flex items-center">
                        <span className="mr-2 text-xs font-bold text-zinc-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={aporteEfectivo}
                          onChange={(event) => {
                            setAporteEfectivo(event.target.value)
                            setExito(null)
                          }}
                          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-zinc-950 outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold text-zinc-500">
                          Efectivo USD
                        </p>
                        <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                          opcional
                        </span>
                      </div>

                      <div className="flex items-center">
                        <span className="mr-2 text-xs font-bold text-zinc-400">US$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={aporteEfectivoUsd}
                          onChange={(event) => {
                            setAporteEfectivoUsd(event.target.value)
                            setExito(null)
                          }}
                          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-zinc-950 outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {aporteEfectivoUsdNumero > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5 rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-[11px] font-medium text-zinc-600">
                        Cotización usada para el efectivo USD
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-zinc-400">
                          1 USD =
                        </span>
                        <div className="flex w-[150px] overflow-hidden rounded-lg border border-zinc-200 bg-white">
                          <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-2 text-xs font-bold text-zinc-400">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={cotizacionUsd}
                            onChange={(event) => {
                              setCotizacionUsd(event.target.value)
                              setExito(null)
                            }}
                            className="min-w-0 flex-1 bg-white px-2.5 py-1.5 text-sm font-semibold text-zinc-950 outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {monedaAporte === 'USD' &&
                aporteNumero > 0 &&
                cotizacionUsdNumero > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2 text-[11px]">
                    <span className="text-zinc-500">
                      Aporte recibido:{' '}
                      <strong className="font-semibold text-zinc-800">
                        {formatearAporte(aporteNumero, 'USD')}
                      </strong>
                    </span>

                    <span className="text-zinc-500">
                      Cotización tomada:{' '}
                      <strong className="font-semibold text-zinc-800">
                        1 USD = {formatearPesos(cotizacionUsdNumero)}
                      </strong>
                    </span>

                    <span className="text-zinc-500">
                      Equivalente ARS:{' '}
                      <strong className="font-semibold text-sky-800">
                        {formatearPesos(aporteEquivalenteArs)}
                      </strong>
                    </span>
                  </div>
                )}
            </div>

            <aside className="border-t border-zinc-100 bg-zinc-50/70 p-4 lg:p-5 xl:border-l xl:border-t-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                Confirmar
              </p>

              <div className="mt-3 space-y-2.5">
                <ResumenFila
                  titulo="Asociado"
                  valor={asociadoSeleccionado?.nombre_apellido ?? '—'}
                />

                <ResumenFila
                  titulo="Genéticas"
                  valor={items.length ? String(items.length) : '—'}
                />

                <ResumenFila
                  titulo="Cantidad total"
                  valor={
                    totalGramos > 0 ? formatearGramos(totalGramos) : '—'
                  }
                />

                {!!items.length && (
                  <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
                    <div className="space-y-1.5">
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
                              ? formatearGramos(item.cantidadNumero)
                              : '—'}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <ResumenFila
                  titulo="Aporte"
                  valor={
                    aporteNumero > 0
                      ? formatearAporte(aporteNumero, monedaAporte)
                      : '—'
                  }
                />

                {monedaAporte === 'USD' && (
                  <>
                    <ResumenFila
                      titulo="Cotización"
                      valor={
                        cotizacionUsdNumero > 0
                          ? `1 USD = ${formatearPesos(
                              cotizacionUsdNumero
                            )}`
                          : '—'
                      }
                    />

                    <ResumenFila
                      titulo="Equiv. ARS"
                      valor={
                        aporteEquivalenteArs > 0
                          ? formatearPesos(aporteEquivalenteArs)
                          : '—'
                      }
                    />
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={confirmar}
                disabled={!puedeConfirmar}
                className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
              >
                {guardando ? 'Registrando...' : 'Confirmar operación'}
              </button>

              <p className="mt-2 text-center text-[10px] text-zinc-400">
                Un aporte · múltiples genéticas · Stock y Finanzas coordinados.
              </p>
            </aside>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-end justify-between gap-4 border-b border-zinc-100 px-4 py-3.5 lg:px-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                Actividad reciente
              </p>

              <h2 className="mt-0.5 text-base font-semibold text-zinc-950">
                Últimas dispensas
              </h2>
            </div>

            <Link
              href="/dispensa/estadisticas"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Ver estadísticas →
            </Link>
          </div>

          {!recientes.length ? (
            <div className="px-5 py-8 text-center text-sm text-zinc-500">
              Todavía no hay dispensas registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead className="bg-zinc-50 text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                  <tr>
                    <th className="px-4 py-2.5 lg:px-5">Fecha</th>
                    <th className="px-4 py-2.5 lg:px-5">Asociado</th>
                    <th className="px-4 py-2.5 lg:px-5">Genética</th>
                    <th className="px-4 py-2.5 text-right lg:px-5">
                      Cantidad
                    </th>
                    <th className="px-4 py-2.5 text-right lg:px-5">
                      Aporte
                    </th>
                    <th className="px-4 py-2.5 lg:px-5">Medio</th>
                    <th className="px-4 py-2.5 lg:px-5">Lote</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100">
                  {recientes.map((item) => (
                    <tr
                      key={item.dispensa_id}
                      className="text-sm text-zinc-700"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500 lg:px-5">
                        {formatearFecha(item.fecha)}
                      </td>

                      <td className="px-4 py-3 lg:px-5">
                        <p className="font-semibold text-zinc-950">
                          {item.asociado}
                        </p>

                        <p className="mt-0.5 text-[10px] text-zinc-400">
                          {item.numero_socio
                            ? `#${item.numero_socio}`
                            : `#${item.asociado_id}`}
                        </p>
                      </td>

                      <td className="px-4 py-3 font-medium text-zinc-900 lg:px-5">
                        {item.genetica}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-zinc-950 lg:px-5">
                        {formatearGramos(numero(item.cantidad_g))}
                      </td>

                      <td className="px-4 py-3 text-right lg:px-5">
                        {item.aporte_importe ? (
                          <>
                            <p className="text-xs font-semibold text-zinc-700">
                              {formatearAporte(
                                numero(item.aporte_importe),
                                item.aporte_moneda === 'USD' ? 'USD' : 'ARS'
                              )}
                            </p>

                            {item.aporte_moneda === 'USD' &&
                              item.aporte_equivalente_ars && (
                                <p className="mt-0.5 text-[10px] text-zinc-400">
                                  ≈{' '}
                                  {formatearPesos(
                                    numero(item.aporte_equivalente_ars)
                                  )}
                                </p>
                              )}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-zinc-600 lg:px-5">
                        {item.medio_pago ?? '—'}
                      </td>

                      <td className="px-4 py-3 text-xs text-zinc-500 lg:px-5">
                        {item.lotes ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <style jsx global>{`
          .campo-compacto {
            width: 100%;
            border-radius: 0.75rem;
            border: 1px solid rgb(228 228 231);
            background: white;
            padding: 0.72rem 0.85rem;
            font-size: 0.875rem;
            color: rgb(24 24 27);
            outline: none;
            transition: all 150ms ease;
          }

          .campo-compacto:focus {
            border-color: rgb(52 211 153);
            box-shadow: 0 0 0 4px rgb(209 250 229);
          }

          .campo-error {
            border-color: rgb(252 165 165);
            background: rgb(254 242 242);
          }
        `}</style>
      </div>
    </main>
  )
}

function resumirOperativa(items: Dispensa[]) {
  return {
    operaciones: items.length,
    gramos: items.reduce(
      (total, item) => total + numero(item.cantidad_g),
      0
    ),
    asociados: new Set(items.map((item) => item.asociado_id)).size,
  }
}

function Marcador({
  valor,
  texto,
}: {
  valor: string
  texto: string
}) {
  return (
    <span className="text-zinc-500">
      <strong className="font-semibold text-zinc-800">{valor}</strong>{' '}
      {texto}
    </span>
  )
}

function Punto() {
  return <span className="text-zinc-300">·</span>
}

function Campo({
  etiqueta,
  opcional = false,
  children,
}: {
  etiqueta: string
  opcional?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-600">
          {etiqueta}
        </span>

        {opcional && (
          <span className="text-[10px] text-zinc-400">opcional</span>
        )}
      </div>

      {children}
    </label>
  )
}

function CampoBusqueda({
  etiqueta,
  seleccionado,
  valor,
  placeholder,
  onCambiarValor,
  onCambiarSeleccion,
  children,
}: {
  etiqueta: string
  seleccionado: {
    titulo: string
    detalle: string
  } | null
  valor: string
  placeholder: string
  onCambiarValor: (valor: string) => void
  onCambiarSeleccion: () => void
  children: ReactNode
}) {
  return (
    <div className="relative">
      <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
        {etiqueta}
      </span>

      {seleccionado ? (
        <div className="flex min-h-[46px] items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-950">
              {seleccionado.titulo}
            </p>

            <p className="mt-0.5 truncate text-[10px] text-zinc-500">
              {seleccionado.detalle}
            </p>
          </div>

          <button
            type="button"
            onClick={onCambiarSeleccion}
            className="shrink-0 text-[11px] font-semibold text-emerald-700"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <input
            autoComplete="off"
            value={valor}
            onChange={(event) => onCambiarValor(event.target.value)}
            placeholder={placeholder}
            className="campo-compacto"
          />

          {children}
        </>
      )}
    </div>
  )
}

function ListaResultados({ children }: { children: ReactNode }) {
  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
      {children}
    </div>
  )
}

function Resultado({
  titulo,
  detalle,
  onClick,
  accion = 'Elegir',
}: {
  titulo: string
  detalle: string
  onClick: () => void
  accion?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 border-b border-zinc-100 px-3.5 py-2.5 text-left transition last:border-b-0 hover:bg-zinc-50"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-950">
          {titulo}
        </p>

        <p className="mt-0.5 truncate text-[10px] text-zinc-500">
          {detalle}
        </p>
      </div>

      <span className="shrink-0 text-[10px] font-semibold text-emerald-700">
        {accion}
      </span>
    </button>
  )
}

function ResumenFila({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-zinc-200/70 pb-2.5 last:border-b-0 last:pb-0">
      <span className="text-xs text-zinc-500">{titulo}</span>

      <strong className="max-w-[170px] text-right text-xs font-semibold text-zinc-900">
        {valor}
      </strong>
    </div>
  )
}

function numeroSocio(asociado: Asociado) {
  return asociado.numero_socio
    ? `#${asociado.numero_socio}`
    : `#${asociado.id}`
}

function dniOculto(dni: string) {
  const limpio = String(dni).replace(/\D/g, '')

  if (limpio.length <= 4) return limpio

  return `${'*'.repeat(Math.max(2, limpio.length - 4))}${limpio.slice(-4)}`
}

function fechaLocal() {
  return formatearFechaISO(new Date())
}

function fechaInicioSemana() {
  const hoy = new Date()
  const dia = hoy.getDay()
  const desplazamiento = dia === 0 ? -6 : 1 - dia

  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() + desplazamiento)

  return formatearFechaISO(lunes)
}

function formatearFechaISO(fecha: Date) {
  const year = fecha.getFullYear()
  const month = String(fecha.getMonth() + 1).padStart(2, '0')
  const day = String(fecha.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizar(valor: unknown) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function numero(valor: unknown) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

function numeroPositivo(valor: string) {
  const n = Number(String(valor).replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

function formatearGramos(gramos: number) {
  return `${new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 2,
  }).format(gramos)} g`
}

function formatearPesos(importe: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(importe)
}

function formatearAporte(
  importe: number,
  moneda: 'ARS' | 'USD'
) {
  if (moneda === 'USD') {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(importe)
  }

  return formatearPesos(importe)
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return '—'

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${fecha}T12:00:00`))
}

function describirErrorSupabase(
  error: unknown,
  fallback: string
) {
  if (!error || typeof error !== 'object') return fallback

  const e = error as {
    message?: string
    details?: string
    hint?: string
    code?: string
  }

  return (
    [
      e.message,
      e.details,
      e.hint,
      e.code ? `Código ${e.code}` : '',
    ]
      .filter(Boolean)
      .join(' · ') || fallback
  )
}
