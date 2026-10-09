'use client'

import Link from 'next/link'

import {

  ReactNode,

  useEffect,

  useMemo,

  useState,

} from 'react'

import { createClient } from '@/lib/supabase/client'



type TipoMovimiento =

  | 'Ingreso'

  | 'Gasto'



type Categoria = {

  id: number

  tipo: TipoMovimiento

  nombre: string

  activa: boolean

  orden: number

}



type Asociado = {

  id: number

  numero_socio: string | null

  nombre_apellido: string

}



type Movimiento = {

  movimiento_id: number

  fecha: string

  tipo: TipoMovimiento

  categoria: string

  concepto: string

  importe: number | string

  importe_ars: number | string | null

  moneda: string

  tipo_cambio_ars_usd: number | string | null

  medio_pago: string | null

  pagado_por: string | null

  estado: string

  origen: 'Dispensa' | 'Manual'

  asociado_id: number | null

  numero_socio: string | null

  asociado: string | null

  dispensa_id: number | null

  genetica_id: number | null

  genetica: string | null

  cantidad_dispensa_g:

    | number

    | string

    | null

  comprobante: string | null

  observaciones: string | null

  created_at: string

}



type ResumenMes = {

  periodo: string

  ingresos: number | string

  gastos: number | string

  aportes_dispensa:

    | number

    | string

  otros_ingresos:

    | number

    | string

  gramos_dispensa_vinculados:

    | number

    | string

  saldo: number | string

  movimientos: number

}



type ResumenGeneral = {

  ingresos_total:

    | number

    | string

  gastos_total:

    | number

    | string

  saldo_total:

    | number

    | string

  movimientos_total: number

}



type CostoProduccion = {

  periodo: string

  costo_por_gramo:

    | number

    | string

  moneda: string

  observaciones: string | null

  updated_at: string

}



type Modal =

  | TipoMovimiento

  | 'Costo'

  | null



type Filtro =

  | 'Todos'

  | 'Ingresos'

  | 'Gastos'

  | 'Aportes'



const MEDIOS = [

  'Transferencia',

  'Efectivo',

  'Tarjeta',

  'Mercado Pago',

  'Otro',

]



const PAGADORES = [

  'Asociación',

  'Sebastián',

  'Gonzalo',

  'Maxi',

  'Otro',

]



export default function FinanzasPage() {

  const supabase =

    useMemo(

      () => createClient(),

      []

    )



  const [

    periodo,

    setPeriodo,

  ] = useState(

    periodoActual()

  )



  const [

    categorias,

    setCategorias,

  ] = useState<Categoria[]>([])



  const [

    asociados,

    setAsociados,

  ] = useState<Asociado[]>([])



  const [

    movimientos,

    setMovimientos,

  ] = useState<Movimiento[]>([])



  const [

    resumenes,

    setResumenes,

  ] = useState<ResumenMes[]>([])



  const [

    resumenGeneral,

    setResumenGeneral,

  ] =

    useState<ResumenGeneral>({

      ingresos_total: 0,

      gastos_total: 0,

      saldo_total: 0,

      movimientos_total: 0,

    })



  const [

    costoProduccion,

    setCostoProduccion,

  ] =

    useState<CostoProduccion | null>(

      null

    )



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



  const [

    modal,

    setModal,

  ] = useState<Modal>(null)



  const [

    filtro,

    setFiltro,

  ] =

    useState<Filtro>('Todos')



  const [

    busqueda,

    setBusqueda,

  ] = useState('')



  const [

    fechaForm,

    setFechaForm,

  ] = useState(fechaLocal())



  const [

    categoriaForm,

    setCategoriaForm,

  ] = useState('')



  const [

    conceptoForm,

    setConceptoForm,

  ] = useState('')



  const [

    importeForm,

    setImporteForm,

  ] = useState('')



  const [

    monedaForm,

    setMonedaForm,

  ] = useState<'ARS' | 'USD'>('ARS')



  const [

    tipoCambioForm,

    setTipoCambioForm,

  ] = useState('')



  const [

    medioForm,

    setMedioForm,

  ] =

    useState('Transferencia')



  const [

    pagadoPorForm,

    setPagadoPorForm,

  ] =

    useState('Asociación')



  const [

    asociadoForm,

    setAsociadoForm,

  ] = useState('')



  const [

    comprobanteForm,

    setComprobanteForm,

  ] = useState('')



  const [

    observacionesForm,

    setObservacionesForm,

  ] = useState('')



  const [

    costoForm,

    setCostoForm,

  ] = useState('')



  const [

    costoObsForm,

    setCostoObsForm,

  ] = useState('')



  useEffect(() => {

    cargar()

  }, [periodo])



  async function cargar() {

    setCargando(true)

    setError('')



    const rango =

      rangoPeriodo(periodo)



    const [

      resultadoCategorias,

      resultadoAsociados,

      resultadoMovimientos,

      resultadoResumenMes,

      resultadoGeneral,

      resultadoCosto,

    ] = await Promise.all([

      supabase

        .from(

          'categorias_financieras'

        )

        .select('*')

        .eq('activa', true)

        .order('tipo')

        .order('orden')

        .order('nombre'),



      supabase

        .from('asociados')

        .select(

          'id, numero_socio, nombre_apellido'

        )

        .order('nombre_apellido'),



      supabase

        .from(

          'vista_movimientos_financieros'

        )

        .select('*')

        .gte(

          'fecha',

          rango.desde

        )

        .lte(

          'fecha',

          rango.hasta

        )

        .eq(

          'estado',

          'Registrado'

        )

        .order('fecha', {

          ascending: false,

        })

        .order('created_at', {

          ascending: false,

        }),



      supabase

        .from(

          'vista_finanzas_resumen_mensual'

        )

        .select('*')

        .order('periodo', {

          ascending: false,

        })

        .limit(12),



      supabase

        .from(

          'vista_finanzas_resumen_general'

        )

        .select('*')

        .single(),



      supabase

        .from(

          'costos_produccion_periodo'

        )

        .select('*')

        .eq(

          'periodo',

          `${periodo}-01`

        )

        .maybeSingle(),

    ])



    const primerError =

      resultadoCategorias.error ||

      resultadoAsociados.error ||

      resultadoMovimientos.error ||

      resultadoResumenMes.error ||

      resultadoGeneral.error ||

      resultadoCosto.error



    if (primerError) {

      setError(

        describirError(

          primerError,

          'No se pudo cargar Finanzas.'

        )

      )

      setCargando(false)

      return

    }



    setCategorias(

      (resultadoCategorias.data ??

        []) as Categoria[]

    )



    setAsociados(

      (resultadoAsociados.data ??

        []) as Asociado[]

    )



    setMovimientos(

      (resultadoMovimientos.data ??

        []) as Movimiento[]

    )



    setResumenes(

      (resultadoResumenMes.data ??

        []) as ResumenMes[]

    )



    setResumenGeneral(

      (resultadoGeneral.data ??

        {

          ingresos_total: 0,

          gastos_total: 0,

          saldo_total: 0,

          movimientos_total: 0,

        }) as ResumenGeneral

    )



    const costo =

      (resultadoCosto.data ??

        null) as CostoProduccion | null



    setCostoProduccion(costo)



    if (costo) {

      setCostoForm(

        String(

          costo.costo_por_gramo

        )

      )

      setCostoObsForm(

        costo.observaciones ??

          ''

      )

    } else {

      setCostoForm('')

      setCostoObsForm('')

    }



    setCargando(false)

  }



  const resumenMes =

    useMemo(() => {

      return (

        resumenes.find(

          (item) =>

            String(

              item.periodo

            ).slice(0, 7) ===

            periodo

        ) ?? {

          periodo:

            `${periodo}-01`,

          ingresos: 0,

          gastos: 0,

          aportes_dispensa: 0,

          otros_ingresos: 0,

          gramos_dispensa_vinculados:

            0,

          saldo: 0,

          movimientos: 0,

        }

      )

    }, [

      resumenes,

      periodo,

    ])



  const movimientosFiltrados =

    useMemo(() => {

      let base =

        movimientos



      if (

        filtro === 'Ingresos'

      ) {

        base =

          base.filter(

            (item) =>

              item.tipo ===

              'Ingreso'

          )

      }



      if (

        filtro === 'Gastos'

      ) {

        base =

          base.filter(

            (item) =>

              item.tipo ===

              'Gasto'

          )

      }



      if (

        filtro === 'Aportes'

      ) {

        base =

          base.filter(

            (item) =>

              item.tipo ===

                'Ingreso' &&

              item.dispensa_id !==

                null

          )

      }



      const q =

        normalizar(busqueda)



      if (!q) {

        return base

      }



      return base.filter(

        (item) =>

          normalizar(

            [

              item.concepto,

              item.categoria,

              item.asociado,

              item.genetica,

              item.medio_pago,

              item.pagado_por,

              item.comprobante,

            ]

              .filter(Boolean)

              .join(' ')

          ).includes(q)

      )

    }, [

      movimientos,

      filtro,

      busqueda,

    ])



  const gastosCategoria =

    useMemo(() => {

      const mapa =

        new Map<

          string,

          number

        >()



      movimientos

        .filter(

          (item) =>

            item.tipo ===

            'Gasto'

        )

        .forEach(

          (item) => {

            mapa.set(

              item.categoria,

              (

                mapa.get(

                  item.categoria

                ) ?? 0

              ) +

                (

                  item.moneda === 'USD'

                    ? item.importe_ars !== null

                      ? numero(

                          item.importe_ars

                        )

                      : 0

                    : numero(

                        item.importe

                      )

                )

            )

          }

        )



      return [

        ...mapa.entries(),

      ]

        .map(

          ([

            categoria,

            importe,

          ]) => ({

            categoria,

            importe,

          })

        )

        .sort(

          (a, b) =>

            b.importe -

            a.importe

        )

    }, [movimientos])



  const maxGasto =

    Math.max(

      1,

      ...gastosCategoria.map(

        (item) =>

          item.importe

      )

    )



  const resumenCronologico =

    [...resumenes]

      .sort(

        (a, b) =>

          String(

            a.periodo

          ).localeCompare(

            String(

              b.periodo

            )

          )

      )

      .slice(-6)



  const maxFlujo =

    Math.max(

      1,

      ...resumenCronologico.flatMap(

        (item) => [

          numero(

            item.ingresos

          ),

          numero(

            item.gastos

          ),

        ]

      )

    )



  const aportesDispensa =

    numero(

      resumenMes

        .aportes_dispensa

    )



  const otrosIngresos =

    numero(

      resumenMes

        .otros_ingresos

    )



  const ingresosMes =

    numero(

      resumenMes.ingresos

    )



  const gastosMes =

    numero(

      resumenMes.gastos

    )



  const saldoMes =

    numero(

      resumenMes.saldo

    )



  const saldoGeneral =

    numero(

      resumenGeneral

        .saldo_total

    )



  const gramosVinculados =

    numero(

      resumenMes

        .gramos_dispensa_vinculados

    )



  const costoRef =

    numero(

      costoProduccion

        ?.costo_por_gramo

    )



  const porcentajeAportes =

    ingresosMes > 0

      ? (

          aportesDispensa /

          ingresosMes

        ) * 100

      : 0



  function abrirMovimiento(

    tipo: TipoMovimiento

  ) {

    limpiarFormulario()

    setModal(tipo)



    const primeraCategoria =

      categorias.find(

        (item) =>

          item.tipo === tipo

      )



    setCategoriaForm(

      primeraCategoria

        ?.nombre ?? ''

    )

  }



  function limpiarFormulario() {

    setFechaForm(

      fechaLocal()

    )

    setCategoriaForm('')

    setConceptoForm('')

    setImporteForm('')

    setMonedaForm('ARS')

    setTipoCambioForm('')

    setMedioForm(

      'Transferencia'

    )

    setPagadoPorForm(

      'Asociación'

    )

    setAsociadoForm('')

    setComprobanteForm('')

    setObservacionesForm('')

  }



  async function guardarMovimiento() {

    if (

      modal !== 'Ingreso' &&

      modal !== 'Gasto'

    ) {

      return

    }



    const importe =

      numeroPositivo(

        importeForm

      )



    if (!categoriaForm) {

      setError(

        'Seleccioná una categoría.'

      )

      return

    }



    if (

      !conceptoForm.trim()

    ) {

      setError(

        'Ingresá un concepto.'

      )

      return

    }



    if (importe <= 0) {

      setError(

        'Ingresá un importe válido.'

      )

      return

    }



    const tipoCambio =

      numeroPositivo(

        tipoCambioForm

      )



    if (

      monedaForm === 'USD' &&

      tipoCambio <= 0

    ) {

      setError(

        'Ingresá la cotización ARS/USD utilizada.'

      )

      return

    }



    setGuardando(true)

    setError('')



    const resultado =

      await supabase.rpc(

        'registrar_movimiento_financiero',

        {

          p_tipo: modal,

          p_categoria:

            categoriaForm,

          p_concepto:

            conceptoForm.trim(),

          p_importe:

            importe,

          p_fecha:

            fechaForm,

          p_moneda:

            monedaForm,

          p_tipo_cambio_ars_usd:

            monedaForm === 'USD'

              ? tipoCambio

              : null,

          p_medio_pago:

            monedaForm === 'USD'

              ? 'Efectivo USD'

              : medioForm || null,

          p_pagado_por:

            modal === 'Gasto'

              ? pagadoPorForm ||

                null

              : null,

          p_comprobante:

            comprobanteForm.trim() ||

            null,

          p_observaciones:

            observacionesForm.trim() ||

            null,

          p_asociado_id:

            modal === 'Ingreso' &&

            asociadoForm

              ? Number(

                  asociadoForm

                )

              : null,

        }

      )



    if (resultado.error) {

      setError(

        describirError(

          resultado.error,

          'No se pudo registrar el movimiento.'

        )

      )

      setGuardando(false)

      return

    }



    setModal(null)

    setGuardando(false)

    await cargar()

  }



  async function guardarCosto() {

    const costo =

      numeroNoNegativo(

        costoForm

      )



    if (

      costo === null

    ) {

      setError(

        'Ingresá un costo válido.'

      )

      return

    }



    setGuardando(true)

    setError('')



    const resultado =

      await supabase.rpc(

        'guardar_costo_produccion_periodo',

        {

          p_periodo:

            `${periodo}-01`,

          p_costo_por_gramo:

            costo,

          p_observaciones:

            costoObsForm.trim() ||

            null,

        }

      )



    if (resultado.error) {

      setError(

        describirError(

          resultado.error,

          'No se pudo guardar el costo de producción.'

        )

      )

      setGuardando(false)

      return

    }



    setModal(null)

    setGuardando(false)

    await cargar()

  }



  const categoriasModal =

    categorias.filter(

      (item) =>

        item.tipo === modal

    )



  return (

    <main className="min-h-screen bg-[#f5f6f7]">

      <div className="mx-auto max-w-[1500px] px-5 py-6 lg:px-7">

        <header className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">

              Gestión económica

            </p>



            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">

              Finanzas

            </h1>



            <p className="mt-1 max-w-2xl text-sm text-zinc-500">

              Registro económico central del club.

            </p>

          </div>



          <div className="flex flex-wrap items-center gap-2">

            <input

              type="month"

              value={periodo}

              onChange={(event) =>

                setPeriodo(

                  event.target.value

                )

              }

              className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"

            />



            <Link

              href="/finanzas/caja"

              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100"

            >

              Caja

            </Link>



            <button

              type="button"

              onClick={() =>

                abrirMovimiento(

                  'Ingreso'

                )

              }

              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"

            >

              + Ingreso

            </button>



            <button

              type="button"

              onClick={() =>

                abrirMovimiento(

                  'Gasto'

                )

              }

              className="rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800"

            >

              + Gasto

            </button>

          </div>

        </header>



        {error && (

          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">

            {error}

          </div>

        )}



        {cargando ? (

          <section className="rounded-2xl border border-zinc-200 bg-white px-5 py-14 text-center text-sm text-zinc-500 shadow-sm">

            Cargando Finanzas...

          </section>

        ) : (

          <>

            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

              <div className="flex flex-col gap-2 border-b border-zinc-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-5">

                <div>

                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400">

                    Período

                  </p>

                  <p className="mt-0.5 text-sm font-semibold capitalize text-zinc-900">

                    {nombrePeriodo(

                      periodo

                    )}

                  </p>

                </div>



                <p className="text-[11px] text-zinc-400">

                  {resumenMes.movimientos}{' '}

                  movimientos registrados

                </p>

              </div>



              <div className="grid sm:grid-cols-2 xl:grid-cols-4">

                <Kpi

                  etiqueta="Ingresos"

                  valor={formatearPesos(

                    ingresosMes

                  )}

                  detalle={`${formatearPesos(

                    aportesDispensa

                  )} desde Dispensa`}

                  tono="positivo"

                />



                <Kpi

                  etiqueta="Gastos"

                  valor={formatearPesos(

                    gastosMes

                  )}

                  detalle={`${gastosCategoria.length} categorías`}

                  tono="negativo"

                />



                <Kpi

                  etiqueta="Resultado del mes"

                  valor={formatearPesos(

                    saldoMes

                  )}

                  detalle="Ingresos menos gastos"

                  tono={

                    saldoMes >= 0

                      ? 'positivo'

                      : 'negativo'

                  }

                />



                <Kpi

                  etiqueta="Aportes vinculados"

                  valor={formatearPesos(

                    aportesDispensa

                  )}

                  detalle={`${formatearGramos(

                    gramosVinculados

                  )} dispensados`}

                  tono="neutro"

                />

              </div>

            </section>



            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.65fr)]">

              <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

                <div className="border-b border-zinc-100 px-4 py-3.5 lg:px-5">

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

                    <div>

                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400">

                        Libro interno

                      </p>



                      <h2 className="mt-0.5 text-base font-semibold text-zinc-950">

                        Movimientos

                      </h2>

                    </div>



                    <div className="flex flex-wrap gap-1.5">

                      {(

                        [

                          'Todos',

                          'Ingresos',

                          'Gastos',

                          'Aportes',

                        ] as Filtro[]

                      ).map(

                        (item) => (

                          <button

                            key={item}

                            type="button"

                            onClick={() =>

                              setFiltro(

                                item

                              )

                            }

                            className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${

                              filtro ===

                              item

                                ? 'bg-zinc-950 text-white'

                                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'

                            }`}

                          >

                            {item}

                          </button>

                        )

                      )}

                    </div>

                  </div>



                  <div className="mt-3">

                    <input

                      value={busqueda}

                      onChange={(event) =>

                        setBusqueda(

                          event.target.value

                        )

                      }

                      placeholder="Buscar por concepto, categoría, asociado, genética o referencia"

                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 text-xs text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"

                    />

                  </div>

                </div>



                {!movimientosFiltrados.length ? (

                  <div className="px-5 py-12 text-center text-sm text-zinc-500">

                    No hay movimientos para mostrar.

                  </div>

                ) : (

                  <>

                    <div className="hidden grid-cols-[82px_minmax(0,1fr)_150px_128px] border-b border-zinc-100 bg-zinc-50 px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400 md:grid">

                      <span>Fecha</span>

                      <span>Detalle</span>

                      <span>Origen</span>

                      <span className="text-right">

                        Importe

                      </span>

                    </div>



                    <div className="divide-y divide-zinc-100">

                      {movimientosFiltrados

                        .slice(0, 14)

                        .map(

                          (item) => (

                            <MovimientoFilaSeria

                              key={

                                item.movimiento_id

                              }

                              item={item}

                            />

                          )

                        )}

                    </div>



                    {movimientosFiltrados.length >

                      14 && (

                      <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-2.5 text-center text-[10px] text-zinc-400 lg:px-5">

                        Mostrando 14 de{' '}

                        {

                          movimientosFiltrados.length

                        }{' '}

                        movimientos

                      </div>

                    )}

                  </>

                )}

              </section>



              <aside className="space-y-4">

                <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-5">

                  <TituloSeccion

                    titulo="Composición del mes"

                    descripcion="Lectura rápida de ingresos y gastos."

                  />



                  <div className="mt-4 space-y-4">

                    <BloqueResumen

                      etiqueta="Aportes desde Dispensa"

                      valor={formatearPesos(

                        aportesDispensa

                      )}

                      detalle={`${formatearPorcentaje(

                        porcentajeAportes

                      )} de los ingresos`}

                      barra={

                        porcentajeAportes

                      }

                    />



                    <BloqueResumen

                      etiqueta="Ingresos no Dispensa"

                      valor={formatearPesos(

                        otrosIngresos

                      )}

                      detalle="Incluye aportes históricos de socios"

                    />

                  </div>



                  <div className="mt-4 border-t border-zinc-100 pt-4">

                    <div className="flex items-center justify-between gap-3">

                      <span className="text-xs text-zinc-500">

                        Saldo acumulado registrado

                      </span>



                      <strong

                        className={`text-sm font-semibold ${

                          saldoGeneral >= 0

                            ? 'text-zinc-950'

                            : 'text-red-700'

                        }`}

                      >

                        {formatearPesos(

                          saldoGeneral

                        )}

                      </strong>

                    </div>



                    <p className="mt-1 text-[10px] leading-4 text-zinc-400">

                      Incluye todos los movimientos cargados en el sistema.

                    </p>

                  </div>

                </section>



                <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-5">

                  <TituloSeccion

                    titulo="Gastos por categoría"

                    descripcion={nombrePeriodo(

                      periodo

                    )}

                  />



                  {!gastosCategoria.length ? (

                    <Vacio texto="No hay gastos registrados este mes." />

                  ) : (

                    <div className="mt-4 space-y-4">

                      {gastosCategoria

                        .slice(0, 7)

                        .map(

                          (item) => (

                            <div

                              key={

                                item.categoria

                              }

                            >

                              <div className="flex items-center justify-between gap-3">

                                <p className="truncate text-[11px] font-medium text-zinc-600">

                                  {

                                    item.categoria

                                  }

                                </p>



                                <strong className="text-xs font-semibold text-zinc-900">

                                  {formatearPesos(

                                    item.importe

                                  )}

                                </strong>

                              </div>



                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">

                                <div

                                  className="h-full rounded-full bg-zinc-700"

                                  style={{

                                    width: `${Math.max(

                                      4,

                                      (

                                        item.importe /

                                        maxGasto

                                      ) * 100

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

              </aside>

            </div>



            <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-5">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                <TituloSeccion

                  titulo="Evolución"

                  descripcion="Últimos meses registrados."

                />



                <div className="flex items-center gap-4 text-[10px] text-zinc-400">

                  <Leyenda

                    texto="Ingresos"

                    clase="bg-emerald-600"

                  />



                  <Leyenda

                    texto="Gastos"

                    clase="bg-zinc-600"

                  />

                </div>

              </div>



              {!resumenCronologico.length ? (

                <Vacio texto="Todavía no hay movimientos financieros." />

              ) : (

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                  {resumenCronologico.map(

                    (item) => {

                      const ingresos =

                        numero(

                          item.ingresos

                        )



                      const gastos =

                        numero(

                          item.gastos

                        )



                      const saldo =

                        numero(

                          item.saldo

                        )



                      return (

                        <div

                          key={

                            item.periodo

                          }

                          className="rounded-xl border border-zinc-200 p-3.5"

                        >

                          <div className="flex items-center justify-between gap-3">

                            <span className="text-xs font-semibold capitalize text-zinc-700">

                              {mesCorto(

                                item.periodo

                              )}

                            </span>



                            <span

                              className={`text-[10px] font-semibold tabular-nums ${

                                saldo >= 0

                                  ? 'text-emerald-700'

                                  : 'text-red-700'

                              }`}

                            >

                              {formatearPesos(

                                saldo

                              )}

                            </span>

                          </div>



                          <div className="mt-3 space-y-1.5">

                            <Barra

                              porcentaje={

                                (

                                  ingresos /

                                  maxFlujo

                                ) * 100

                              }

                              clase="bg-emerald-600"

                            />



                            <Barra

                              porcentaje={

                                (

                                  gastos /

                                  maxFlujo

                                ) * 100

                              }

                              clase="bg-zinc-600"

                            />

                          </div>



                          <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-400">

                            <span className="tabular-nums">

                              +{' '}

                              {formatearPesos(

                                ingresos

                              )}

                            </span>



                            <span className="tabular-nums">

                              −{' '}

                              {formatearPesos(

                                gastos

                              )}

                            </span>

                          </div>

                        </div>

                      )

                    }

                  )}

                </div>

              )}

            </section>



            <section className="mt-4 flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[10px] text-zinc-400 shadow-sm sm:flex-row sm:items-center sm:justify-between">

              <span>

                Los aportes registrados desde Dispensa ingresan automáticamente a Finanzas.

              </span>



              <button

                type="button"

                onClick={() =>

                  setModal('Costo')

                }

                className="w-fit font-medium text-zinc-500 transition hover:text-zinc-800"

              >

                {costoProduccion

                  ? `Costo de producción: ${formatearPesos(

                      costoRef

                    )}/g`

                  : 'Configurar costo de producción'}

              </button>

            </section>

          </>

        )}

      </div>



      {(modal === 'Ingreso' ||

        modal === 'Gasto') && (

        <ModalBase

          titulo={

            modal === 'Ingreso'

              ? 'Registrar ingreso'

              : 'Registrar gasto'

          }

          descripcion={

            modal === 'Ingreso'

              ? 'Agregá un ingreso que no proviene automáticamente de Dispensa.'

              : 'Registrá un gasto del club de forma simple y trazable.'

          }

          onCerrar={() => {

            if (!guardando) {

              setModal(null)

            }

          }}

        >

          <div className="grid gap-4 sm:grid-cols-2">

            <Campo

              titulo="Fecha"

            >

              <input

                type="date"

                value={fechaForm}

                onChange={(event) =>

                  setFechaForm(

                    event.target.value

                  )

                }

                className="campo-finanzas"

              />

            </Campo>



            <Campo

              titulo="Categoría"

            >

              <select

                value={

                  categoriaForm

                }

                onChange={(event) =>

                  setCategoriaForm(

                    event.target.value

                  )

                }

                className="campo-finanzas"

              >

                {categoriasModal.map(

                  (item) => (

                    <option

                      key={item.id}

                      value={item.nombre}

                    >

                      {item.nombre}

                    </option>

                  )

                )}

              </select>

            </Campo>

          </div>



          <div className="mt-4">

            <Campo

              titulo="Concepto"

            >

              <input

                value={

                  conceptoForm

                }

                onChange={(event) =>

                  setConceptoForm(

                    event.target.value

                  )

                }

                className="campo-finanzas"

              />

            </Campo>

          </div>



          <div

            className={`mt-4 grid gap-4 ${

              monedaForm === 'USD'

                ? 'sm:grid-cols-2 lg:grid-cols-4'

                : 'sm:grid-cols-3'

            }`}

          >

            <Campo

              titulo="Moneda"

            >

              <select

                value={monedaForm}

                onChange={(event) => {

                  const moneda =

                    event.target.value as

                      | 'ARS'

                      | 'USD'

                  setMonedaForm(moneda)

                  setTipoCambioForm('')

                  setMedioForm(

                    moneda === 'USD'

                      ? 'Efectivo USD'

                      : 'Transferencia'

                  )

                }}

                className="campo-finanzas"

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

              titulo="Importe"

            >

              <div className="relative">

                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">

                  {monedaForm === 'USD'

                    ? 'US$'

                    : '$'}

                </span>



                <input

                  type="number"

                  min="0"

                  step={

                    monedaForm === 'USD'

                      ? '0.01'

                      : '1'

                  }

                  value={

                    importeForm

                  }

                  onChange={(event) =>

                    setImporteForm(

                      event.target.value

                    )

                  }

                  className={

                    monedaForm === 'USD'

                      ? 'campo-finanzas pl-12'

                      : 'campo-finanzas pl-8'

                  }

                />

              </div>

            </Campo>



            {monedaForm === 'USD' && (

              <Campo

                titulo="Cotización ARS/USD"

              >

                <div className="relative">

                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">

                    $

                  </span>



                  <input

                    type="number"

                    min="0"

                    step="0.01"

                    value={

                      tipoCambioForm

                    }

                    onChange={(event) =>

                      setTipoCambioForm(

                        event.target.value

                      )

                    }

                    placeholder="Ej. 1500"

                    className="campo-finanzas pl-8"

                  />

                </div>

              </Campo>

            )}



            <Campo

              titulo="Medio"

            >

              {monedaForm === 'USD' ? (

                <div className="flex min-h-[43px] items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm font-semibold text-zinc-700">

                  Efectivo USD

                </div>

              ) : (

                <select

                  value={medioForm}

                  onChange={(event) =>

                    setMedioForm(

                      event.target.value

                    )

                  }

                  className="campo-finanzas"

                >

                  {MEDIOS.map(

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

          </div>



          {monedaForm === 'USD' &&

            numeroPositivo(importeForm) > 0 &&

            numeroPositivo(tipoCambioForm) > 0 && (

              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">

                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">

                  Equivalente registrado

                </p>

                <p className="mt-1 text-sm font-semibold text-zinc-950">

                  {formatearPesos(

                    numeroPositivo(importeForm) *

                      numeroPositivo(tipoCambioForm)

                  )}

                </p>

              </div>

            )}



          {modal === 'Gasto' ? (

            <div className="mt-4">

              <Campo

                titulo="Quién pagó"

              >

                <select

                  value={

                    pagadoPorForm

                  }

                  onChange={(event) =>

                    setPagadoPorForm(

                      event.target.value

                    )

                  }

                  className="campo-finanzas"

                >

                  {PAGADORES.map(

                    (item) => (

                      <option

                        key={item}

                        value={item}

                      >

                        {item}

                      </option>

                    )

                  )}

                </select>

              </Campo>

            </div>

          ) : (

            <div className="mt-4">

              <Campo

                titulo="Asociado"

                opcional

              >

                <select

                  value={

                    asociadoForm

                  }

                  onChange={(event) =>

                    setAsociadoForm(

                      event.target.value

                    )

                  }

                  className="campo-finanzas"

                >

                  <option value="">

                    Sin asociar

                  </option>



                  {asociados.map(

                    (item) => (

                      <option

                        key={item.id}

                        value={item.id}

                      >

                        {item.nombre_apellido}

                        {item.numero_socio

                          ? ` · #${item.numero_socio}`

                          : ''}

                      </option>

                    )

                  )}

                </select>

              </Campo>

            </div>

          )}



          <div className="mt-4 grid gap-4 sm:grid-cols-2">

            <Campo

              titulo="Comprobante / referencia"

              opcional

            >

              <input

                value={

                  comprobanteForm

                }

                onChange={(event) =>

                  setComprobanteForm(

                    event.target.value

                  )

                }

                className="campo-finanzas"

              />

            </Campo>



            <Campo

              titulo="Observaciones"

              opcional

            >

              <input

                value={

                  observacionesForm

                }

                onChange={(event) =>

                  setObservacionesForm(

                    event.target.value

                  )

                }

                className="campo-finanzas"

              />

            </Campo>

          </div>



          <div className="mt-5 flex justify-end gap-2 border-t border-zinc-100 pt-4">

            <button

              type="button"

              onClick={() =>

                setModal(null)

              }

              disabled={guardando}

              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"

            >

              Cancelar

            </button>



            <button

              type="button"

              onClick={

                guardarMovimiento

              }

              disabled={guardando}

              className="rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:bg-zinc-300"

            >

              {guardando

                ? 'Guardando...'

                : 'Registrar'}

            </button>

          </div>

        </ModalBase>

      )}



      {modal === 'Costo' && (

        <ModalBase

          titulo="Costo de producción"

          descripcion={`Referencia interna para ${nombrePeriodo(

            periodo

          )}. Queda guardada por mes y no genera ningún movimiento financiero.`}

          onCerrar={() => {

            if (!guardando) {

              setModal(null)

            }

          }}

          compacto

        >

          <Campo

            titulo="Costo por gramo"

          >

            <div className="relative">

              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">

                $

              </span>



              <input

                type="number"

                min="0"

                step="1"

                value={costoForm}

                onChange={(event) =>

                  setCostoForm(

                    event.target.value

                  )

                }

                className="campo-finanzas pl-8 pr-12"

              />



              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">

                / g

              </span>

            </div>

          </Campo>



          <div className="mt-4">

            <Campo

              titulo="Observaciones"

              opcional

            >

              <input

                value={

                  costoObsForm

                }

                onChange={(event) =>

                  setCostoObsForm(

                    event.target.value

                  )

                }

                className="campo-finanzas"

              />

            </Campo>

          </div>



          <div className="mt-5 flex justify-end gap-2 border-t border-zinc-100 pt-4">

            <button

              type="button"

              onClick={() =>

                setModal(null)

              }

              disabled={guardando}

              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-600"

            >

              Cancelar

            </button>



            <button

              type="button"

              onClick={guardarCosto}

              disabled={guardando}

              className="rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-white disabled:bg-zinc-300"

            >

              {guardando

                ? 'Guardando...'

                : 'Guardar'}

            </button>

          </div>

        </ModalBase>

      )}



      <style jsx global>{`

        .campo-finanzas {

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



        .campo-finanzas:focus {

          border-color: rgb(52 211 153);

          box-shadow: 0 0 0 4px rgb(209 250 229);

        }

      `}</style>

    </main>

  )

}



function MovimientoFilaSeria({

  item,

}: {

  item: Movimiento

}) {

  const esIngreso =

    item.tipo === 'Ingreso'



  const referencia =

    referenciaMovimiento(

      item

    )



  return (

    <div className="grid gap-2 px-4 py-3 transition hover:bg-zinc-50/60 md:grid-cols-[82px_minmax(0,1fr)_150px_128px] md:items-center lg:px-5">

      <div>

        <p className="text-[11px] font-medium text-zinc-500">

          {formatearFechaCorta(

            item.fecha

          )}

        </p>



        <p className="mt-0.5 text-[9px] text-zinc-400">

          {item.tipo}

        </p>

      </div>



      <div className="min-w-0">

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">

          <p className="truncate text-sm font-semibold text-zinc-900">

            {item.concepto}

          </p>



          <span className="text-[9px] font-medium uppercase tracking-[0.06em] text-zinc-400">

            {item.categoria}

          </span>

        </div>



        <p className="mt-1 truncate text-[10px] text-zinc-500">

          {referencia}

          {item.medio_pago

            ? ` · ${item.medio_pago}`

            : ''}

          {item.moneda ===

            'USD' &&

          item.tipo_cambio_ars_usd

            ? ` · TC ${formatearPesos(

                numero(

                  item.tipo_cambio_ars_usd

                )

              )}`

            : ''}

          {item.pagado_por

            ? item.tipo === 'Gasto'

              ? ` · pagó ${item.pagado_por}`

              : ` · aportó ${item.pagado_por}`

            : ''}

        </p>

      </div>



      <div>

        <span

          className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold ${

            item.origen ===

            'Dispensa'

              ? 'bg-emerald-50 text-emerald-700'

              : 'bg-zinc-100 text-zinc-500'

          }`}

        >

          {item.origen}

        </span>

      </div>



      <div className="md:text-right">

        <strong

          className={`text-sm font-semibold ${

            esIngreso

              ? 'text-emerald-700'

              : 'text-zinc-950'

          }`}

        >

          {esIngreso

            ? '+ '

            : '− '}

          {item.moneda === 'USD'

            ? formatearUsd(

                numero(

                  item.importe

                )

              )

            : formatearPesos(

                numero(

                  item.importe

                )

              )}

        </strong>



        {item.moneda === 'USD' &&

          item.importe_ars !== null && (

          <p className="mt-0.5 text-[9px] text-zinc-400">

            ≈{' '}

            {formatearPesos(

              numero(

                item.importe_ars

              )

            )}

          </p>

        )}

      </div>

    </div>

  )

}



function BloqueResumen({

  etiqueta,

  valor,

  detalle,

  barra,

}: {

  etiqueta: string

  valor: string

  detalle: string

  barra?: number

}) {

  return (

    <div>

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-[10px] font-medium text-zinc-500">

            {etiqueta}

          </p>



          <p className="mt-1 text-lg font-semibold tracking-tight text-zinc-950">

            {valor}

          </p>

        </div>



        <span className="mt-1 text-[10px] text-zinc-400">

          {detalle}

        </span>

      </div>



      {barra !== undefined && (

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">

          <div

            className="h-full rounded-full bg-emerald-600"

            style={{

              width: `${Math.max(

                barra > 0

                  ? 3

                  : 0,

                Math.min(

                  100,

                  barra

                )

              )}%`,

            }}

          />

        </div>

      )}

    </div>

  )

}



function Kpi({

  etiqueta,

  valor,

  detalle,

  tono,

}: {

  etiqueta: string

  valor: string

  detalle: string

  tono:

    | 'positivo'

    | 'negativo'

    | 'neutro'

}) {

  const valorClase =

    tono === 'positivo'

      ? 'text-emerald-700'

      : tono === 'negativo'

        ? 'text-zinc-950'

        : 'text-zinc-950'



  return (

    <div className="border-b border-zinc-100 px-4 py-4 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0 lg:px-5">

      <p className="text-[9px] font-bold uppercase tracking-[0.09em] text-zinc-400">

        {etiqueta}

      </p>



      <p

        className={`mt-1 text-xl font-semibold tabular-nums tracking-tight ${valorClase}`}

      >

        {valor}

      </p>



      <p className="mt-0.5 truncate text-xs text-zinc-500">

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



function Leyenda({

  texto,

  clase,

}: {

  texto: string

  clase: string

}) {

  return (

    <span className="inline-flex items-center gap-1.5">

      <span

        className={`h-1.5 w-1.5 rounded-full ${clase}`}

      />

      {texto}

    </span>

  )

}



function Barra({

  porcentaje,

  clase,

}: {

  porcentaje: number

  clase: string

}) {

  return (

    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">

      <div

        className={`h-full rounded-full ${clase}`}

        style={{

          width: `${Math.max(

            porcentaje > 0

              ? 2

              : 0,

            Math.min(

              100,

              porcentaje

            )

          )}%`,

        }}

      />

    </div>

  )

}



function MiniDato({

  etiqueta,

  valor,

}: {

  etiqueta: string

  valor: string

}) {

  return (

    <div>

      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">

        {etiqueta}

      </p>



      <p className="mt-1 text-sm font-semibold text-zinc-900">

        {valor}

      </p>

    </div>

  )

}



function MovimientoFila({

  item,

}: {

  item: Movimiento

}) {

  const esIngreso =

    item.tipo === 'Ingreso'



  return (

    <div className="grid gap-2 px-4 py-3 transition hover:bg-zinc-50/70 sm:grid-cols-[84px_minmax(0,1fr)_110px] sm:items-center lg:px-5">

      <div>

        <p className="text-[10px] font-medium text-zinc-400">

          {formatearFechaCorta(

            item.fecha

          )}

        </p>



        <span

          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${

            item.origen ===

            'Dispensa'

              ? 'bg-emerald-50 text-emerald-700'

              : 'bg-zinc-100 text-zinc-500'

          }`}

        >

          {item.origen}

        </span>

      </div>



      <div className="min-w-0">

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">

          <p className="truncate text-sm font-semibold text-zinc-900">

            {item.concepto}

          </p>



          <span className="text-[10px] text-zinc-400">

            {item.categoria}

          </span>

        </div>



        <p className="mt-1 truncate text-[10px] text-zinc-500">

          {referenciaMovimiento(

            item

          )}

          {item.medio_pago

            ? ` · ${item.medio_pago}`

            : ''}

          {item.moneda ===

            'USD' &&

          item.tipo_cambio_ars_usd

            ? ` · TC ${formatearPesos(

                numero(

                  item.tipo_cambio_ars_usd

                )

              )}`

            : ''}

          {item.pagado_por

            ? item.tipo === 'Gasto'

              ? ` · pagó ${item.pagado_por}`

              : ` · aportó ${item.pagado_por}`

            : ''}

        </p>

      </div>



      <div className="text-left sm:text-right">

        <strong

          className={`text-sm font-semibold ${

            esIngreso

              ? 'text-emerald-700'

              : 'text-zinc-950'

          }`}

        >

          {esIngreso

            ? '+ '

            : '− '}

          {item.moneda === 'USD'

            ? formatearUsd(

                numero(

                  item.importe

                )

              )

            : formatearPesos(

                numero(

                  item.importe

                )

              )}

        </strong>



        {item.moneda === 'USD' &&

          item.importe_ars !== null && (

          <p className="mt-0.5 text-[10px] text-zinc-400">

            ≈{' '}

            {formatearPesos(

              numero(

                item.importe_ars

              )

            )}

          </p>

        )}

      </div>

    </div>

  )

}



function Vacio({

  texto,

}: {

  texto: string

}) {

  return (

    <div className="mt-4 rounded-xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">

      {texto}

    </div>

  )

}



function ModalBase({

  titulo,

  descripcion,

  onCerrar,

  children,

  compacto = false,

}: {

  titulo: string

  descripcion?: string

  onCerrar: () => void

  children: ReactNode

  compacto?: boolean

}) {

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[1px]">

      <div

        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl ${

          compacto

            ? 'max-w-lg'

            : 'max-w-2xl'

        }`}

      >

        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">

          <div>

            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">

              {titulo}

            </h2>



            {descripcion && (

              <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-500">

                {descripcion}

              </p>

            )}

          </div>



          <button

            type="button"

            onClick={onCerrar}

            className="shrink-0 rounded-lg bg-zinc-100 px-3 py-2 text-[10px] font-semibold text-zinc-600 transition hover:bg-zinc-200"

          >

            Cerrar

          </button>

        </div>



        <div className="p-5">

          {children}

        </div>

      </div>

    </div>

  )

}



function Campo({

  titulo,

  opcional = false,

  children,

}: {

  titulo: string

  opcional?: boolean

  children: ReactNode

}) {

  return (

    <label className="block">

      <div className="mb-1.5 flex items-center justify-between gap-2">

        <span className="text-xs font-semibold text-zinc-600">

          {titulo}

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



function referenciaMovimiento(

  item: Movimiento

) {

  if (

    item.origen ===

      'Dispensa' &&

    item.asociado

  ) {

    return [

      item.asociado,

      item.genetica,

      item.cantidad_dispensa_g !==

      null

        ? formatearGramos(

            numero(

              item.cantidad_dispensa_g

            )

          )

        : null,

    ]

      .filter(Boolean)

      .join(' · ')

  }



  if (

    item.tipo ===

      'Ingreso' &&

    item.asociado

  ) {

    return item.asociado

  }



  return (

    item.comprobante ??

    item.observaciones ??

    'Sin referencia adicional'

  )

}



function periodoActual() {

  const hoy =

    new Date()



  return `${hoy.getFullYear()}-${String(

    hoy.getMonth() + 1

  ).padStart(2, '0')}`

}



function fechaLocal() {

  const hoy =

    new Date()



  return `${hoy.getFullYear()}-${String(

    hoy.getMonth() + 1

  ).padStart(2, '0')}-${String(

    hoy.getDate()

  ).padStart(2, '0')}`

}



function rangoPeriodo(

  periodo: string

) {

  const [

    year,

    month,

  ] =

    periodo

      .split('-')

      .map(Number)



  const desde =

    `${periodo}-01`



  const ultimo =

    new Date(

      year,

      month,

      0

    )



  const hasta =

    `${year}-${String(

      month

    ).padStart(

      2,

      '0'

    )}-${String(

      ultimo.getDate()

    ).padStart(2, '0')}`



  return {

    desde,

    hasta,

  }

}



function nombrePeriodo(

  periodo: string

) {

  const [

    year,

    month,

  ] =

    periodo

      .split('-')

      .map(Number)



  return new Intl.DateTimeFormat(

    'es-AR',

    {

      month: 'long',

      year: 'numeric',

    }

  ).format(

    new Date(

      year,

      month - 1,

      1

    )

  )

}



function mesCorto(

  fecha: string

) {

  const valor =

    String(fecha).slice(

      0,

      7

    )



  const [

    year,

    month,

  ] =

    valor

      .split('-')

      .map(Number)



  return new Intl.DateTimeFormat(

    'es-AR',

    {

      month: 'short',

    }

  )

    .format(

      new Date(

        year,

        month - 1,

        1

      )

    )

    .replace('.', '')

}



function normalizar(

  valor: unknown

) {

  return String(

    valor ?? ''

  )

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

  const n =

    Number(valor)



  return Number.isFinite(n)

    ? n

    : 0

}



function numeroPositivo(

  valor: string

) {

  const n =

    Number(

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



function numeroNoNegativo(

  valor: string

) {

  const n =

    Number(

      String(valor).replace(

        ',',

        '.'

      )

    )



  if (

    !Number.isFinite(n) ||

    n < 0

  ) {

    return null

  }



  return n

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



function formatearUsd(

  importe: number

) {

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



function formatearPesosCompacto(

  importe: number

) {

  return new Intl.NumberFormat(

    'es-AR',

    {

      notation: 'compact',

      maximumFractionDigits: 1,

    }

  ).format(importe)

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



function formatearPorcentaje(

  valor: number

) {

  return `${new Intl.NumberFormat(

    'es-AR',

    {

      maximumFractionDigits: 1,

    }

  ).format(valor)}%`

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



function describirError(

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
