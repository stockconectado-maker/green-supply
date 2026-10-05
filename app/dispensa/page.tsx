'use client'

import Link from 'next/link'
import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react'
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

type ResultadoDispensa = {
  dispensa_id: number
  asociado_id: number
  asociado: string
  genetica_id: number
  genetica: string
  cantidad_g: number
  aporte_importe: number
  moneda: 'ARS' | 'USD'
  tipo_cambio_ars_usd: number | null
  aporte_equivalente_ars: number
  medio_pago: string | null
  movimiento_financiero_id: number
  lotes: Array<{
    lote_id: number
    codigo_lote: string
    cantidad_g: number
    movimiento_stock_id: number
  }>
}

const MEDIOS_APORTE = [
  'Transferencia',
  'Efectivo',
  'Otro',
]

export default function DispensaPage() {
  const supabase = useMemo(() => createClient(), [])

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] =
    useState<ResultadoDispensa | null>(null)

  const [asociados, setAsociados] =
    useState<Asociado[]>([])
  const [stock, setStock] =
    useState<StockGenetica[]>([])
  const [recientes, setRecientes] =
    useState<Dispensa[]>([])
  const [hoy, setHoy] =
    useState<Dispensa[]>([])
  const [semana, setSemana] =
    useState<Dispensa[]>([])

  const [
    busquedaAsociado,
    setBusquedaAsociado,
  ] = useState('')
  const [
    busquedaGenetica,
    setBusquedaGenetica,
  ] = useState('')

  const [asociadoId, setAsociadoId] =
    useState<number | null>(null)
  const [geneticaId, setGeneticaId] =
    useState<number | null>(null)

  const [cantidad, setCantidad] =
    useState('')
  const [aporte, setAporte] =
    useState('')

  const [
    monedaAporte,
    setMonedaAporte,
  ] = useState<'ARS' | 'USD'>('ARS')

  const [
    cotizacionUsd,
    setCotizacionUsd,
  ] = useState('')

  const [
    medioAporte,
    setMedioAporte,
  ] = useState('Transferencia')
  const [
    observaciones,
    setObservaciones,
  ] = useState('')

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    setError('')

    const fechaHoy = fechaLocal()
    const inicioSemana =
      fechaInicioSemana()

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
        .eq(
          'estado_asociado',
          'Asociado activo'
        )
        .order('nombre_apellido'),

      supabase
        .from(
          'vista_stock_geneticas_dispensa'
        )
        .select('*')
        .gt(
          'stock_disponible_g',
          0
        )
        .order('genetica'),

      supabase
        .from('vista_dispensas')
        .select('*')
        .order('created_at', {
          ascending: false,
        })
        .limit(12),

      supabase
        .from('vista_dispensas')
        .select('*')
        .eq('fecha', fechaHoy),

      supabase
        .from('vista_dispensas')
        .select('*')
        .gte(
          'fecha',
          inicioSemana
        )
        .lte(
          'fecha',
          fechaHoy
        ),
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

    setAsociados(
      (resultadoAsociados.data ??
        []) as Asociado[]
    )
    setStock(
      (resultadoStock.data ??
        []) as StockGenetica[]
    )
    setRecientes(
      (resultadoRecientes.data ??
        []) as Dispensa[]
    )
    setHoy(
      (resultadoHoy.data ??
        []) as Dispensa[]
    )
    setSemana(
      (resultadoSemana.data ??
        []) as Dispensa[]
    )

    setCargando(false)
  }

  const asociadoSeleccionado =
    asociados.find(
      (item) =>
        item.id === asociadoId
    ) ?? null

  const geneticaSeleccionada =
    stock.find(
      (item) =>
        item.genetica_id ===
        geneticaId
    ) ?? null

  const asociadosFiltrados =
    useMemo(() => {
      const q =
        normalizar(
          busquedaAsociado
        )

      if (
        !q ||
        asociadoSeleccionado
      ) {
        return []
      }

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
    }, [
      asociados,
      busquedaAsociado,
      asociadoSeleccionado,
    ])

  const geneticasFiltradas =
    useMemo(() => {
      const q =
        normalizar(
          busquedaGenetica
        )

      if (
        !q ||
        geneticaSeleccionada
      ) {
        return []
      }

      return stock
        .filter((item) =>
          normalizar(
            item.genetica
          ).includes(q)
        )
        .slice(0, 7)
    }, [
      stock,
      busquedaGenetica,
      geneticaSeleccionada,
    ])

  const cantidadNumero =
    numeroPositivo(cantidad)

  const aporteNumero =
    numeroPositivo(aporte)

  const cotizacionUsdNumero =
    numeroPositivo(
      cotizacionUsd
    )

  const aporteEquivalenteArs =
    monedaAporte === 'USD'
      ? aporteNumero *
        cotizacionUsdNumero
      : aporteNumero

  const stockDisponible =
    numero(
      geneticaSeleccionada
        ?.stock_disponible_g
    )

  const stockRestante =
    geneticaSeleccionada &&
    cantidadNumero > 0
      ? Math.max(
          0,
          stockDisponible -
            cantidadNumero
        )
      : stockDisponible

  const resumenHoy =
    resumirOperativa(hoy)

  const resumenSemana =
    resumirOperativa(semana)

  const puedeConfirmar =
    asociadoSeleccionado !==
      null &&
    geneticaSeleccionada !==
      null &&
    cantidadNumero > 0 &&
    cantidadNumero <=
      stockDisponible &&
    aporteNumero > 0 &&
    (
      monedaAporte === 'ARS' ||
      cotizacionUsdNumero > 0
    ) &&
    medioAporte.trim() !== '' &&
    !guardando

  async function confirmar() {
    if (!asociadoSeleccionado) {
      setError(
        'Seleccioná un asociado.'
      )
      return
    }

    if (!geneticaSeleccionada) {
      setError(
        'Seleccioná una genética.'
      )
      return
    }

    if (cantidadNumero <= 0) {
      setError(
        'Ingresá una cantidad mayor a 0.'
      )
      return
    }

    if (
      cantidadNumero >
      stockDisponible
    ) {
      setError(
        `Stock insuficiente. Disponible: ${formatearGramos(
          stockDisponible
        )}.`
      )
      return
    }

    if (aporteNumero <= 0) {
      setError(
        'Ingresá el aporte realizado.'
      )
      return
    }

    if (
      monedaAporte === 'USD' &&
      cotizacionUsdNumero <= 0
    ) {
      setError(
        'Ingresá la cotización tomada para el USD.'
      )
      return
    }

    const confirmado =
      window.confirm(
        [
          'Confirmar operación',
          '',
          asociadoSeleccionado.nombre_apellido,
          `${geneticaSeleccionada.genetica} · ${formatearGramos(
            cantidadNumero
          )}`,
          `Aporte: ${formatearAporte(
            aporteNumero,
            monedaAporte
          )}`,
          ...(monedaAporte === 'USD'
            ? [
                `Cotización: 1 USD = ${formatearPesos(
                  cotizacionUsdNumero
                )}`,
                `Equivalente ARS: ${formatearPesos(
                  aporteEquivalenteArs
                )}`,
                'Medio: Efectivo USD',
              ]
            : [
                `Medio: ${medioAporte}`,
              ]),
        ].join('\n')
      )

    if (!confirmado) {
      return
    }

    setGuardando(true)
    setError('')
    setExito(null)

    const resultado =
      await supabase.rpc(
        'registrar_dispensa',
        {
          p_asociado_id:
            asociadoSeleccionado.id,

          p_genetica_id:
            geneticaSeleccionada.genetica_id,

          p_cantidad_g:
            cantidadNumero,

          p_aporte_importe:
            aporteNumero,

          p_aporte_moneda:
            monedaAporte,

          p_tipo_cambio_ars_usd:
            monedaAporte === 'USD'
              ? cotizacionUsdNumero
              : null,

          p_medio_pago:
            medioAporte,

          p_observaciones:
            observaciones.trim() ||
            null,
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

    setExito(
      resultado.data as ResultadoDispensa
    )

    setGeneticaId(null)
    setBusquedaGenetica('')
    setCantidad('')
    setAporte('')
    setMonedaAporte('ARS')
    setCotizacionUsd('')
    setMedioAporte(
      'Transferencia'
    )
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
      <div className="mx-auto max-w-[1500px] px-5 py-6 lg:px-7">
        <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              Gestión de entregas
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
              Dispensa
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Registro rápido de entrega y aporte asociado.
            </p>
          </div>

          <Link
            href="/dispensa/estadisticas"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            Estadísticas
            <span aria-hidden="true">
              →
            </span>
          </Link>
        </header>

        <section className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[11px] shadow-sm">
          <span className="font-bold uppercase tracking-[0.08em] text-zinc-400">
            Hoy
          </span>

          <Marcador
            valor={String(
              resumenHoy.operaciones
            )}
            texto="dispensas"
          />

          <Punto />

          <Marcador
            valor={formatearGramos(
              resumenHoy.gramos
            )}
            texto="dispensados"
          />

          <Punto />

          <Marcador
            valor={String(
              resumenHoy.asociados
            )}
            texto="asociados"
          />

          <span className="ml-auto hidden text-zinc-400 lg:inline">
            Semana:{' '}
            <strong className="font-semibold text-zinc-600">
              {resumenSemana.operaciones}
            </strong>{' '}
            dispensas ·{' '}
            <strong className="font-semibold text-zinc-600">
              {formatearGramos(
                resumenSemana.gramos
              )}
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
            <p className="text-sm text-emerald-900">
              <strong className="font-semibold">
                Operación registrada.
              </strong>{' '}
              {exito.asociado} ·{' '}
              {exito.genetica} ·{' '}
              {formatearGramos(
                exito.cantidad_g
              )}
            </p>

            <button
              type="button"
              onClick={() =>
                setExito(null)
              }
              className="text-left text-xs font-semibold text-emerald-700"
            >
              Cerrar
            </button>
          </div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="grid xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="p-4 lg:p-5">
              <div className="grid gap-3 lg:grid-cols-2">
                <CampoBusqueda
                  etiqueta="Asociado"
                  seleccionado={
                    asociadoSeleccionado
                      ? {
                          titulo:
                            asociadoSeleccionado.nombre_apellido,
                          detalle: `${numeroSocio(
                            asociadoSeleccionado
                          )} · REPROCANN ${
                            asociadoSeleccionado.estado_reprocann ??
                            '—'
                          }`,
                        }
                      : null
                  }
                  valor={
                    busquedaAsociado
                  }
                  placeholder="Buscar asociado"
                  onCambiarValor={(valor) => {
                    setBusquedaAsociado(
                      valor
                    )
                    setExito(null)
                  }}
                  onCambiarSeleccion={() => {
                    setAsociadoId(null)
                    setBusquedaAsociado('')
                    setExito(null)
                  }}
                >
                  {busquedaAsociado.trim() &&
                    asociadosFiltrados.length >
                      0 && (
                      <ListaResultados>
                        {asociadosFiltrados.map(
                          (item) => (
                            <Resultado
                              key={
                                item.id
                              }
                              titulo={
                                item.nombre_apellido
                              }
                              detalle={`${numeroSocio(
                                item
                              )}${
                                item.dni
                                  ? ` · DNI ${dniOculto(
                                      item.dni
                                    )}`
                                  : ''
                              } · REPROCANN ${
                                item.estado_reprocann ??
                                '—'
                              }`}
                              onClick={() => {
                                setAsociadoId(
                                  item.id
                                )
                                setBusquedaAsociado(
                                  ''
                                )
                              }}
                            />
                          )
                        )}
                      </ListaResultados>
                    )}
                </CampoBusqueda>

                <CampoBusqueda
                  etiqueta="Genética"
                  seleccionado={
                    geneticaSeleccionada
                      ? {
                          titulo:
                            geneticaSeleccionada.genetica,
                          detalle: `${formatearGramos(
                            stockDisponible
                          )} disponibles · ${
                            geneticaSeleccionada.lotes_disponibles
                          } lote${
                            geneticaSeleccionada.lotes_disponibles ===
                            1
                              ? ''
                              : 's'
                          }`,
                        }
                      : null
                  }
                  valor={
                    busquedaGenetica
                  }
                  placeholder="Buscar genética"
                  onCambiarValor={(valor) => {
                    setBusquedaGenetica(
                      valor
                    )
                    setExito(null)
                  }}
                  onCambiarSeleccion={() => {
                    setGeneticaId(null)
                    setBusquedaGenetica('')
                    setCantidad('')
                    setExito(null)
                  }}
                >
                  {busquedaGenetica.trim() &&
                    geneticasFiltradas.length >
                      0 && (
                      <ListaResultados>
                        {geneticasFiltradas.map(
                          (item) => (
                            <Resultado
                              key={
                                item.genetica_id
                              }
                              titulo={
                                item.genetica
                              }
                              detalle={`${formatearGramos(
                                numero(
                                  item.stock_disponible_g
                                )
                              )} disponibles · ${
                                item.lotes_disponibles
                              } lote${
                                item.lotes_disponibles ===
                                1
                                  ? ''
                                  : 's'
                              }`}
                              onClick={() => {
                                setGeneticaId(
                                  item.genetica_id
                                )
                                setBusquedaGenetica(
                                  ''
                                )
                              }}
                            />
                          )
                        )}
                      </ListaResultados>
                    )}
                </CampoBusqueda>
              </div>

              <div
                className={`mt-3 grid gap-3 ${
                  monedaAporte === 'USD'
                    ? 'xl:grid-cols-[150px_110px_180px_190px_180px_minmax(0,1fr)]'
                    : 'xl:grid-cols-[150px_110px_190px_200px_minmax(0,1fr)]'
                }`}
              >
                <Campo
                  etiqueta="Cantidad"
                >
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cantidad}
                      onChange={(event) => {
                        setCantidad(
                          event.target.value
                        )
                        setExito(null)
                      }}
                      className="campo-compacto pr-10"
                    />

                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">
                      g
                    </span>
                  </div>
                </Campo>

                <Campo
                  etiqueta="Moneda"
                >
                  <select
                    value={monedaAporte}
                    onChange={(event) => {
                      const nuevaMoneda =
                        event.target.value as
                          | 'ARS'
                          | 'USD'

                      setMonedaAporte(
                        nuevaMoneda
                      )

                      if (
                        nuevaMoneda ===
                        'USD'
                      ) {
                        setMedioAporte(
                          'Efectivo USD'
                        )
                      } else {
                        setMedioAporte(
                          'Transferencia'
                        )
                        setCotizacionUsd(
                          ''
                        )
                      }

                      setExito(null)
                    }}
                    className="campo-compacto"
                  >
                    <option value="ARS">
                      ARS
                    </option>
                    <option value="USD">
                      USD
                    </option>
                  </select>
                </Campo>

                <Campo
                  etiqueta="Aporte"
                >
                  <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-white transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100">
                    <span className="flex min-w-[48px] items-center justify-center border-r border-zinc-200 bg-zinc-50 px-3 text-xs font-bold text-zinc-500">
                      {monedaAporte ===
                      'USD'
                        ? 'USD'
                        : '$'}
                    </span>

                    <input
                      type="number"
                      min="0"
                      step={
                        monedaAporte ===
                        'USD'
                          ? '0.01'
                          : '1'
                      }
                      value={aporte}
                      onChange={(event) => {
                        setAporte(
                          event.target.value
                        )
                        setExito(null)
                      }}
                      className="min-w-0 flex-1 bg-white px-3.5 py-[0.72rem] text-sm font-semibold text-zinc-950 outline-none"
                    />
                  </div>
                </Campo>

                {monedaAporte ===
                  'USD' && (
                  <Campo
                    etiqueta="Cotización USD"
                  >
                    <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-white transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100">
                      <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-3 text-[10px] font-semibold text-zinc-500">
                        1 USD =
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          cotizacionUsd
                        }
                        onChange={(event) => {
                          setCotizacionUsd(
                            event.target.value
                          )
                          setExito(null)
                        }}
                        className="min-w-0 flex-1 bg-white px-3 py-[0.72rem] text-sm font-semibold text-zinc-950 outline-none"
                      />

                      <span className="flex items-center border-l border-zinc-200 bg-zinc-50 px-2.5 text-[10px] font-bold text-zinc-400">
                        ARS
                      </span>
                    </div>
                  </Campo>
                )}

                <Campo
                  etiqueta="Medio"
                >
                  {monedaAporte ===
                  'USD' ? (
                    <div className="flex min-h-[43px] items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm font-semibold text-zinc-700">
                      Efectivo USD
                    </div>
                  ) : (
                    <select
                      value={medioAporte}
                      onChange={(event) =>
                        setMedioAporte(
                          event.target.value
                        )
                      }
                      className="campo-compacto"
                    >
                      {MEDIOS_APORTE.map(
                        (medio) => (
                          <option
                            key={medio}
                            value={medio}
                          >
                            {medio}
                          </option>
                        )
                      )}
                    </select>
                  )}
                </Campo>

                <Campo
                  etiqueta="Observación"
                  opcional
                >
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(event) =>
                      setObservaciones(
                        event.target.value
                      )
                    }
                    className="campo-compacto"
                  />
                </Campo>
              </div>

              {monedaAporte === 'USD' &&
                aporteNumero > 0 &&
                cotizacionUsdNumero > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2 text-[11px]">
                    <span className="text-zinc-500">
                      Aporte recibido:{' '}
                      <strong className="font-semibold text-zinc-800">
                        {formatearAporte(
                          aporteNumero,
                          'USD'
                        )}
                      </strong>
                    </span>

                    <span className="text-zinc-500">
                      Cotización tomada:{' '}
                      <strong className="font-semibold text-zinc-800">
                        1 USD ={' '}
                        {formatearPesos(
                          cotizacionUsdNumero
                        )}
                      </strong>
                    </span>

                    <span className="text-zinc-500">
                      Equivalente ARS:{' '}
                      <strong className="font-semibold text-sky-800">
                        {formatearPesos(
                          aporteEquivalenteArs
                        )}
                      </strong>
                    </span>
                  </div>
                )}

              {geneticaSeleccionada &&
                cantidadNumero > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-zinc-50 px-3 py-2 text-[11px]">
                    <span className="text-zinc-500">
                      Disponible:{' '}
                      <strong className="font-semibold text-zinc-800">
                        {formatearGramos(
                          stockDisponible
                        )}
                      </strong>
                    </span>

                    <span className="text-zinc-500">
                      Luego:{' '}
                      <strong className="font-semibold text-zinc-800">
                        {formatearGramos(
                          stockRestante
                        )}
                      </strong>
                    </span>

                    {cantidadNumero >
                      stockDisponible && (
                      <span className="font-semibold text-red-600">
                        Cantidad superior al Stock disponible
                      </span>
                    )}
                  </div>
                )}
            </div>

            <aside className="border-t border-zinc-100 bg-zinc-50/70 p-4 xl:border-l xl:border-t-0 lg:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                Confirmar
              </p>

              <div className="mt-3 space-y-2.5">
                <ResumenFila
                  titulo="Asociado"
                  valor={
                    asociadoSeleccionado
                      ?.nombre_apellido ??
                    '—'
                  }
                />

                <ResumenFila
                  titulo="Genética"
                  valor={
                    geneticaSeleccionada
                      ?.genetica ??
                    '—'
                  }
                />

                <ResumenFila
                  titulo="Cantidad"
                  valor={
                    cantidadNumero > 0
                      ? formatearGramos(
                          cantidadNumero
                        )
                      : '—'
                  }
                />

                <ResumenFila
                  titulo="Aporte"
                  valor={
                    aporteNumero > 0
                      ? formatearAporte(
                          aporteNumero,
                          monedaAporte
                        )
                      : '—'
                  }
                />

                {monedaAporte ===
                  'USD' && (
                  <>
                    <ResumenFila
                      titulo="Cotización"
                      valor={
                        cotizacionUsdNumero >
                        0
                          ? `1 USD = ${formatearPesos(
                              cotizacionUsdNumero
                            )}`
                          : '—'
                      }
                    />

                    <ResumenFila
                      titulo="Equiv. ARS"
                      valor={
                        aporteEquivalenteArs >
                        0
                          ? formatearPesos(
                              aporteEquivalenteArs
                            )
                          : '—'
                      }
                    />
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={confirmar}
                disabled={
                  !puedeConfirmar
                }
                className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
              >
                {guardando
                  ? 'Registrando...'
                  : 'Confirmar operación'}
              </button>

              <p className="mt-2 text-center text-[10px] text-zinc-400">
                Actualiza Dispensa, Stock y Finanzas.
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
                    <th className="px-4 py-2.5 lg:px-5">
                      Fecha
                    </th>
                    <th className="px-4 py-2.5 lg:px-5">
                      Asociado
                    </th>
                    <th className="px-4 py-2.5 lg:px-5">
                      Genética
                    </th>
                    <th className="px-4 py-2.5 text-right lg:px-5">
                      Cantidad
                    </th>
                    <th className="px-4 py-2.5 text-right lg:px-5">
                      Aporte
                    </th>
                    <th className="px-4 py-2.5 lg:px-5">
                      Medio
                    </th>
                    <th className="px-4 py-2.5 lg:px-5">
                      Lote
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100">
                  {recientes.map(
                    (item) => (
                      <tr
                        key={
                          item.dispensa_id
                        }
                        className="text-sm text-zinc-700"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500 lg:px-5">
                          {formatearFecha(
                            item.fecha
                          )}
                        </td>

                        <td className="px-4 py-3 lg:px-5">
                          <p className="font-semibold text-zinc-950">
                            {
                              item.asociado
                            }
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
                          {formatearGramos(
                            numero(
                              item.cantidad_g
                            )
                          )}
                        </td>

                        <td className="px-4 py-3 text-right lg:px-5">
                          {item.aporte_importe ? (
                            <>
                              <p className="text-xs font-semibold text-zinc-700">
                                {formatearAporte(
                                  numero(
                                    item.aporte_importe
                                  ),
                                  item.aporte_moneda ===
                                    'USD'
                                    ? 'USD'
                                    : 'ARS'
                                )}
                              </p>

                              {item.aporte_moneda ===
                                'USD' &&
                                item.aporte_equivalente_ars && (
                                  <p className="mt-0.5 text-[10px] text-zinc-400">
                                    ≈{' '}
                                    {formatearPesos(
                                      numero(
                                        item.aporte_equivalente_ars
                                      )
                                    )}
                                  </p>
                                )}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="px-4 py-3 text-xs text-zinc-600 lg:px-5">
                          {item.medio_pago ??
                            '—'}
                        </td>

                        <td className="px-4 py-3 text-xs text-zinc-500 lg:px-5">
                          {item.lotes ?? '—'}
                        </td>
                      </tr>
                    )
                  )}
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
        `}</style>
      </div>
    </main>
  )
}

function resumirOperativa(
  items: Dispensa[]
) {
  return {
    operaciones: items.length,
    gramos: items.reduce(
      (total, item) =>
        total +
        numero(item.cantidad_g),
      0
    ),
    asociados:
      new Set(
        items.map(
          (item) =>
            item.asociado_id
        )
      ).size,
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
      <strong className="font-semibold text-zinc-800">
        {valor}
      </strong>{' '}
      {texto}
    </span>
  )
}

function Punto() {
  return (
    <span className="text-zinc-300">
      ·
    </span>
  )
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
          <span className="text-[10px] text-zinc-400">
            opcional
          </span>
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
  onCambiarValor: (
    valor: string
  ) => void
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
            onClick={
              onCambiarSeleccion
            }
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
            onChange={(event) =>
              onCambiarValor(
                event.target.value
              )
            }
            placeholder={placeholder}
            className="campo-compacto"
          />

          {children}
        </>
      )}
    </div>
  )
}

function ListaResultados({
  children,
}: {
  children: ReactNode
}) {
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
}: {
  titulo: string
  detalle: string
  onClick: () => void
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
        Elegir
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
      <span className="text-xs text-zinc-500">
        {titulo}
      </span>

      <strong className="max-w-[160px] text-right text-xs font-semibold text-zinc-900">
        {valor}
      </strong>
    </div>
  )
}

function numeroSocio(
  asociado: Asociado
) {
  return asociado.numero_socio
    ? `#${asociado.numero_socio}`
    : `#${asociado.id}`
}

function dniOculto(
  dni: string
) {
  const limpio =
    String(dni).replace(
      /\D/g,
      ''
    )

  if (limpio.length <= 4) {
    return limpio
  }

  return `${'*'.repeat(
    Math.max(
      2,
      limpio.length - 4
    )
  )}${limpio.slice(-4)}`
}

function fechaLocal() {
  return formatearFechaISO(
    new Date()
  )
}

function fechaInicioSemana() {
  const hoy = new Date()
  const dia = hoy.getDay()
  const desplazamiento =
    dia === 0
      ? -6
      : 1 - dia

  const lunes =
    new Date(hoy)
  lunes.setDate(
    hoy.getDate() +
      desplazamiento
  )

  return formatearFechaISO(
    lunes
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

function normalizar(
  valor: unknown
) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase()
    .trim()
}

function numero(
  valor: unknown
) {
  const n = Number(valor)
  return Number.isFinite(n)
    ? n
    : 0
}

function numeroPositivo(
  valor: string
) {
  const n = Number(
    String(valor).replace(
      ',',
      '.'
    )
  )

  return Number.isFinite(n) &&
    n > 0
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

function formatearPesos(
  importe: number
) {
  return new Intl.NumberFormat(
    'es-AR',
    {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }
  ).format(importe)
}

function formatearAporte(
  importe: number,
  moneda: 'ARS' | 'USD'
) {
  if (moneda === 'USD') {
    return new Intl.NumberFormat(
      'es-AR',
      {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    ).format(importe)
  }

  return formatearPesos(
    importe
  )
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
