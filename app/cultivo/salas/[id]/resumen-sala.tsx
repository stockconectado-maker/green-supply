'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type TabDestino =
  | 'cultivo'
  | 'riego'
  | 'produccion'
  | 'historial'

type Props = {
  salaId: number
  salaNombre: string
  capacidadMaxima: number
  onCambiarTab: (tab: TabDestino) => void
}

type CicloResumen = {
  ciclo_id: number
  sala_id: number
  numero_ciclo: number
  codigo_cosecha: string
  estado: string
  etapa_actual: 'Vegetación' | 'Floración'
  fecha_inicio: string
  fecha_inicio_floracion: string | null
  fecha_corte_planificada: string | null
  fecha_corte_real: string | null
  cantidad_total: number
  geneticas_total: number
  camas_utilizadas: number
  dia_floracion: number | null
  semana_floracion: number | null
  dia_semana_floracion: number | null
  dias_restantes_corte: number | null
  progreso_floracion_pct: number | string | null
  semanas_floracion_plan: number | null
  meta_produccion_g: number | string | null
  rendimiento_objetivo_g_m2: number | string | null
  superficie_objetivo_m2: number | string | null
}

type Distribucion = {
  genetica_id: number
  cantidad: number
}

type Genetica = {
  id: number
  nombre: string
}

type Produccion = {
  produccion_id: number
  genetica_id: number
  genetica: string
  plantas_reales: number
  peso_seco_g: number | string | null
  estado:
    | 'Por cosechar'
    | 'Secando'
    | 'Listo para cerrar'
    | 'Cerrada'
  lote_id: number | null
  codigo_lote: string | null
}

type PlanRiego = {
  id: number
  ciclo_id: number
}

type PeriodoRiego = {
  periodo_ciclo_id: number
  plan_id: number
  ciclo_id: number
  orden: number
  etiqueta: string
  semana_ref: number | string
  ec_objetivo: number | string | null
  ph_objetivo_min: number | string | null
  ph_objetivo_max: number | string | null
  riegos_dia: number | null
  ml_planta_evento: number | string | null
  litros_dia_sala: number | string | null
  plantas_ciclo: number
}

type Historial = {
  ciclo_id: number
  codigo_cosecha: string
  fecha_corte_real: string | null
  geneticas: string | null
  cantidad_total: number
  produccion_final_g: number | string
  lotes: string | null
}

type GeneticaResumen = {
  id: number
  nombre: string
  cantidad: number
}

export default function ResumenSala({
  salaId,
  salaNombre,
  capacidadMaxima,
  onCambiarTab,
}: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [ciclo, setCiclo] =
    useState<CicloResumen | null>(null)
  const [distribucion, setDistribucion] =
    useState<Distribucion[]>([])
  const [catalogo, setCatalogo] =
    useState<Genetica[]>([])
  const [producciones, setProducciones] =
    useState<Produccion[]>([])
  const [periodos, setPeriodos] =
    useState<PeriodoRiego[]>([])
  const [historial, setHistorial] =
    useState<Historial | null>(null)

  useEffect(() => {
    cargarResumen()
  }, [salaId])

  async function cargarResumen() {
    setCargando(true)
    setError('')

    const [
      resultadoCiclo,
      resultadoHistorial,
    ] = await Promise.all([
      supabase
        .from('vista_ciclos_cultivo')
        .select('*')
        .eq('sala_id', salaId)
        .eq('estado', 'Activo')
        .maybeSingle(),

      supabase
        .from('vista_historial_sala')
        .select(`
          ciclo_id,
          codigo_cosecha,
          fecha_corte_real,
          geneticas,
          cantidad_total,
          produccion_final_g,
          lotes
        `)
        .eq('sala_id', salaId)
        .order('fecha_corte_real', {
          ascending: false,
          nullsFirst: false,
        })
        .limit(1)
        .maybeSingle(),
    ])

    if (resultadoCiclo.error) {
      setError(
        describirError(
          resultadoCiclo.error,
          'No se pudo cargar el ciclo actual.'
        )
      )
      setCargando(false)
      return
    }

    if (resultadoHistorial.error) {
      setError(
        describirError(
          resultadoHistorial.error,
          'No se pudo cargar el último ciclo.'
        )
      )
      setCargando(false)
      return
    }

    const cicloActual =
      (resultadoCiclo.data ??
        null) as CicloResumen | null

    setCiclo(cicloActual)
    setHistorial(
      (resultadoHistorial.data ??
        null) as Historial | null
    )

    if (!cicloActual) {
      setDistribucion([])
      setCatalogo([])
      setProducciones([])
      setPeriodos([])
      setCargando(false)
      return
    }

    const [
      resultadoDistribucion,
      resultadoCatalogo,
      resultadoProduccion,
      resultadoPlan,
    ] = await Promise.all([
      supabase
        .from('ciclo_camas_geneticas')
        .select('genetica_id, cantidad')
        .eq('ciclo_id', cicloActual.ciclo_id),

      supabase
        .from('geneticas')
        .select('id, nombre')
        .order('nombre'),

      supabase
        .from('vista_producciones_ciclo')
        .select(`
          produccion_id,
          genetica_id,
          genetica,
          plantas_reales,
          peso_seco_g,
          estado,
          lote_id,
          codigo_lote
        `)
        .eq('ciclo_id', cicloActual.ciclo_id)
        .order('genetica'),

      supabase
        .from('planes_riego_ciclo')
        .select('id, ciclo_id')
        .eq('ciclo_id', cicloActual.ciclo_id)
        .maybeSingle(),
    ])

    if (resultadoDistribucion.error) {
      setError(
        describirError(
          resultadoDistribucion.error,
          'No se pudo cargar la distribución del ciclo.'
        )
      )
      setCargando(false)
      return
    }

    if (resultadoCatalogo.error) {
      setError(
        describirError(
          resultadoCatalogo.error,
          'No se pudieron cargar las genéticas.'
        )
      )
      setCargando(false)
      return
    }

    if (resultadoProduccion.error) {
      setError(
        describirError(
          resultadoProduccion.error,
          'No se pudo cargar Producción.'
        )
      )
      setCargando(false)
      return
    }

    if (resultadoPlan.error) {
      setError(
        describirError(
          resultadoPlan.error,
          'No se pudo consultar el plan de riego.'
        )
      )
      setCargando(false)
      return
    }

    setDistribucion(
      (resultadoDistribucion.data ??
        []) as Distribucion[]
    )
    setCatalogo(
      (resultadoCatalogo.data ??
        []) as Genetica[]
    )
    setProducciones(
      (resultadoProduccion.data ??
        []) as Produccion[]
    )

    const plan =
      (resultadoPlan.data ??
        null) as PlanRiego | null

    if (!plan) {
      setPeriodos([])
      setCargando(false)
      return
    }

    const resultadoPeriodos = await supabase
      .from('vista_plan_riego_periodos_ciclo')
      .select(`
        periodo_ciclo_id,
        plan_id,
        ciclo_id,
        orden,
        etiqueta,
        semana_ref,
        ec_objetivo,
        ph_objetivo_min,
        ph_objetivo_max,
        riegos_dia,
        ml_planta_evento,
        litros_dia_sala,
        plantas_ciclo
      `)
      .eq('plan_id', plan.id)
      .order('orden')

    if (resultadoPeriodos.error) {
      setError(
        describirError(
          resultadoPeriodos.error,
          'No se pudo cargar el resumen de Riego.'
        )
      )
      setCargando(false)
      return
    }

    setPeriodos(
      (resultadoPeriodos.data ??
        []) as PeriodoRiego[]
    )

    setCargando(false)
  }

  const geneticas = useMemo<GeneticaResumen[]>(
    () => {
      const nombres = new Map(
        catalogo.map((item) => [
          item.id,
          item.nombre,
        ])
      )

      const cantidades =
        new Map<number, number>()

      distribucion.forEach((item) => {
        cantidades.set(
          item.genetica_id,
          (cantidades.get(item.genetica_id) ??
            0) + numero(item.cantidad)
        )
      })

      return [...cantidades.entries()]
        .map(([id, cantidad]) => ({
          id,
          nombre:
            nombres.get(id) ??
            `Genética #${id}`,
          cantidad,
        }))
        .sort((a, b) =>
          a.nombre.localeCompare(
            b.nombre,
            'es'
          )
        )
    },
    [catalogo, distribucion]
  )

  const periodoActual = useMemo(
    () => resolverPeriodoActual(ciclo, periodos),
    [ciclo, periodos]
  )

  const plantasActuales =
    numero(ciclo?.cantidad_total)

  const ocupacion =
    capacidadMaxima > 0
      ? Math.min(
          100,
          (plantasActuales / capacidadMaxima) *
            100
        )
      : 0

  const pesoSecoCargado =
    producciones.reduce(
      (total, item) =>
        total + numero(item.peso_seco_g),
      0
    )

  const produccionesCerradas =
    producciones.filter(
      (item) => item.estado === 'Cerrada'
    ).length

  const objetivoProduccion =
    numero(ciclo?.meta_produccion_g)

  const diasDesdeInicio = ciclo
    ? diferenciaDias(
        ciclo.fecha_inicio,
        fechaHoyLocal()
      ) + 1
    : 0

  if (cargando) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-500 shadow-sm">
        Actualizando resumen operativo...
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700 lg:px-6">
          {error}
        </div>
      )}

      <div className="border-b border-zinc-100 px-5 py-5 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              Estado operativo
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                {ciclo
                  ? ciclo.codigo_cosecha
                  : salaNombre}
              </h2>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${
                  ciclo
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-zinc-100 text-zinc-500'
                }`}
              >
                {ciclo
                  ? 'Ciclo activo'
                  : 'Sin ciclo activo'}
              </span>
            </div>

            <p className="mt-1 text-sm text-zinc-500">
              {ciclo
                ? descripcionEtapa(
                    ciclo,
                    diasDesdeInicio
                  )
                : historial
                  ? 'La sala está disponible para iniciar un nuevo ciclo.'
                  : 'La sala todavía no registra ciclos.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {ciclo ? (
              <>
                <BotonAcceso
                  texto="Cultivo actual"
                  onClick={() =>
                    onCambiarTab('cultivo')
                  }
                  principal
                />

                <BotonAcceso
                  texto="Riego"
                  onClick={() =>
                    onCambiarTab('riego')
                  }
                />

                <BotonAcceso
                  texto="Producción"
                  onClick={() =>
                    onCambiarTab(
                      'produccion'
                    )
                  }
                />
              </>
            ) : (
              <BotonAcceso
                texto="Iniciar ciclo"
                onClick={() =>
                  onCambiarTab('cultivo')
                }
                principal
              />
            )}

            {historial && (
              <BotonAcceso
                texto="Historial"
                onClick={() =>
                  onCambiarTab('historial')
                }
              />
            )}
          </div>
        </div>
      </div>

      {ciclo ? (
        <>
          <div className="grid border-b border-zinc-100 sm:grid-cols-2 xl:grid-cols-4">
            <KpiOperativo
              titulo="Etapa"
              valor={ciclo.etapa_actual}
              detalle={
                ciclo.etapa_actual ===
                  'Floración' &&
                ciclo.semana_floracion
                  ? `Semana ${ciclo.semana_floracion} · Día ${ciclo.dia_semana_floracion ?? '—'}`
                  : `Día ${Math.max(
                      1,
                      diasDesdeInicio
                    )} del ciclo`
              }
            />

            <KpiOperativo
              titulo="Plantas"
              valor={`${plantasActuales}`}
              detalle={`${capacidadMaxima} capacidad · ${formatear(
                ocupacion
              )}% ocupación`}
            />

            <KpiOperativo
              titulo="Genéticas"
              valor={`${Math.max(
                geneticas.length,
                numero(
                  ciclo.geneticas_total
                )
              )}`}
              detalle={`${numero(
                ciclo.camas_utilizadas
              )} camas en uso`}
            />

            <KpiOperativo
              titulo="Corte previsto"
              valor={formatearFechaCorta(
                ciclo.fecha_corte_planificada
              )}
              detalle={
                ciclo.dias_restantes_corte ===
                null
                  ? 'Sin cálculo'
                  : numero(
                        ciclo.dias_restantes_corte
                      ) > 0
                    ? `${ciclo.dias_restantes_corte} días restantes`
                    : numero(
                          ciclo.dias_restantes_corte
                        ) === 0
                      ? 'Hoy'
                      : `${Math.abs(
                          numero(
                            ciclo.dias_restantes_corte
                          )
                        )} días pasado`
              }
            />
          </div>

          <div className="grid gap-0 xl:grid-cols-[1.2fr_.9fr_.9fr]">
            <div className="border-b border-zinc-100 p-5 xl:border-b-0 xl:border-r lg:p-6">
              <TituloSeccion
                titulo="Genéticas del ciclo"
                subtitulo="Distribución real cargada en las camas."
              />

              {geneticas.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {geneticas.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5"
                    >
                      <p className="text-sm font-semibold text-zinc-950">
                        {item.nombre}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {item.cantidad}{' '}
                        planta
                        {item.cantidad === 1
                          ? ''
                          : 's'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <VacioPequeno texto="Sin distribución cargada." />
              )}
            </div>

            <div className="border-b border-zinc-100 p-5 xl:border-b-0 xl:border-r lg:p-6">
              <TituloSeccion
                titulo="Producción"
                subtitulo="Estado del cierre por genética."
              />

              <div className="mt-4 space-y-3">
                <LineaDato
                  titulo="Objetivo"
                  valor={
                    objetivoProduccion > 0
                      ? formatearKg(
                          objetivoProduccion
                        )
                      : '—'
                  }
                />

                <LineaDato
                  titulo="Peso seco cargado"
                  valor={
                    pesoSecoCargado > 0
                      ? formatearKg(
                          pesoSecoCargado
                        )
                      : '—'
                  }
                  destacado={
                    pesoSecoCargado > 0
                  }
                />

                <LineaDato
                  titulo="Cierres"
                  valor={
                    producciones.length
                      ? `${produccionesCerradas}/${producciones.length}`
                      : 'Sin registros'
                  }
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  onCambiarTab('produccion')
                }
                className="mt-4 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Abrir Producción →
              </button>
            </div>

            <div className="p-5 lg:p-6">
              <TituloSeccion
                titulo="Riego actual"
                subtitulo={
                  periodoActual
                    ? periodoActual.etiqueta
                    : 'Plan del ciclo'
                }
              />

              {periodoActual ? (
                <div className="mt-4 space-y-3">
                  <LineaDato
                    titulo="Riegos / día"
                    valor={
                      periodoActual.riegos_dia ??
                      '—'
                    }
                  />

                  <LineaDato
                    titulo="Por planta / evento"
                    valor={
                      numero(
                        periodoActual.ml_planta_evento
                      ) > 0
                        ? `${formatear(
                            numero(
                              periodoActual.ml_planta_evento
                            )
                          )} ml`
                        : '—'
                    }
                  />

                  <LineaDato
                    titulo="Sala / día"
                    valor={
                      numero(
                        periodoActual.litros_dia_sala
                      ) > 0
                        ? `${formatear(
                            numero(
                              periodoActual.litros_dia_sala
                            )
                          )} L`
                        : '—'
                    }
                  />

                  <LineaDato
                    titulo="EC · pH"
                    valor={`${valorEc(
                      periodoActual.ec_objetivo
                    )} · ${valorPh(
                      periodoActual
                    )}`}
                  />
                </div>
              ) : (
                <VacioPequeno texto="Abrí Riego para preparar el plan del ciclo." />
              )}

              <button
                type="button"
                onClick={() =>
                  onCambiarTab('riego')
                }
                className="mt-4 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Abrir Riego →
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
          <div className="p-5 lg:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
              <IconoCiclo />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-zinc-950">
              Sala sin ciclo activo
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              El Resumen ya está conectado con Ciclos. Cuando inicies uno,
              acá aparecerán automáticamente etapa, plantas, genéticas,
              corte previsto, Producción y Riego.
            </p>

            <button
              type="button"
              onClick={() =>
                onCambiarTab('cultivo')
              }
              className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Iniciar nuevo ciclo
            </button>
          </div>

          <div className="border-t border-zinc-100 bg-zinc-50/70 p-5 lg:border-l lg:border-t-0 lg:p-6">
            <TituloSeccion
              titulo="Última cosecha"
              subtitulo="Último ciclo finalizado de esta sala."
            />

            {historial ? (
              <div className="mt-4 space-y-3">
                <LineaDato
                  titulo="Ciclo"
                  valor={
                    historial.codigo_cosecha
                  }
                />

                <LineaDato
                  titulo="Fin"
                  valor={formatearFechaCorta(
                    historial.fecha_corte_real
                  )}
                />

                <LineaDato
                  titulo="Genéticas"
                  valor={
                    historial.geneticas ??
                    '—'
                  }
                />

                <LineaDato
                  titulo="Peso seco"
                  valor={formatearKg(
                    numero(
                      historial.produccion_final_g
                    )
                  )}
                  destacado
                />

                <LineaDato
                  titulo="Lote"
                  valor={
                    historial.lotes ?? '—'
                  }
                />
              </div>
            ) : (
              <VacioPequeno texto="Todavía no hay cosechas finalizadas." />
            )}
          </div>
        </div>
      )}

      {ciclo && historial && (
        <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-3.5 lg:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              Última cosecha:{' '}
              <strong className="font-semibold text-zinc-800">
                {historial.codigo_cosecha}
              </strong>
              {' · '}
              {formatearFechaCorta(
                historial.fecha_corte_real
              )}
              {' · '}
              {formatearKg(
                numero(
                  historial.produccion_final_g
                )
              )}
            </p>

            <button
              type="button"
              onClick={() =>
                onCambiarTab('historial')
              }
              className="text-left text-xs font-semibold text-zinc-700 hover:text-zinc-950"
            >
              Ver historial →
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function KpiOperativo({
  titulo,
  valor,
  detalle,
}: {
  titulo: string
  valor: string
  detalle: string
}) {
  return (
    <div className="border-b border-zinc-100 px-5 py-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0 lg:px-6">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400">
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
  subtitulo,
}: {
  titulo: string
  subtitulo: string
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-950">
        {titulo}
      </h3>

      <p className="mt-1 text-xs leading-5 text-zinc-500">
        {subtitulo}
      </p>
    </div>
  )
}

function LineaDato({
  titulo,
  valor,
  destacado = false,
}: {
  titulo: string
  valor: string | number
  destacado?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-2.5 last:border-b-0 last:pb-0">
      <span className="text-xs text-zinc-500">
        {titulo}
      </span>

      <strong
        className={`max-w-[190px] text-right text-xs font-semibold ${
          destacado
            ? 'text-emerald-700'
            : 'text-zinc-900'
        }`}
      >
        {valor}
      </strong>
    </div>
  )
}

function BotonAcceso({
  texto,
  onClick,
  principal = false,
}: {
  texto: string
  onClick: () => void
  principal?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
        principal
          ? 'bg-zinc-950 text-white hover:bg-zinc-800'
          : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
      }`}
    >
      {texto}
    </button>
  )
}

function VacioPequeno({
  texto,
}: {
  texto: string
}) {
  return (
    <div className="mt-4 rounded-xl bg-zinc-50 px-4 py-4 text-sm text-zinc-500">
      {texto}
    </div>
  )
}

function IconoCiclo() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 22c4-3 7-7 7-12-4 0-7 1-9 4-1-4-3-6-7-7 0 7 3 12 9 15Z" />
      <path d="M12 22V11" />
    </svg>
  )
}

function resolverPeriodoActual(
  ciclo: CicloResumen | null,
  periodos: PeriodoRiego[]
) {
  if (!ciclo || !periodos.length) {
    return null
  }

  if (
    ciclo.etapa_actual !== 'Floración' ||
    !ciclo.semana_floracion
  ) {
    return periodos[0] ?? null
  }

  let semanaObjetivo =
    numero(ciclo.semana_floracion)

  const diaSemana =
    numero(
      ciclo.dia_semana_floracion
    ) || 1

  if (
    semanaObjetivo === 5 &&
    diaSemana >= 4 &&
    periodos.some(
      (periodo) =>
        numero(periodo.semana_ref) === 5.5
    )
  ) {
    semanaObjetivo = 5.5
  }

  if (
    semanaObjetivo === 7 &&
    diaSemana >= 4 &&
    periodos.some(
      (periodo) =>
        numero(periodo.semana_ref) === 7.5
    )
  ) {
    semanaObjetivo = 7.5
  }

  return (
    periodos.find(
      (periodo) =>
        numero(periodo.semana_ref) ===
        semanaObjetivo
    ) ??
    [...periodos]
      .reverse()
      .find(
        (periodo) =>
          numero(periodo.semana_ref) <=
          semanaObjetivo
      ) ??
    periodos[0]
  )
}

function descripcionEtapa(
  ciclo: CicloResumen,
  diasDesdeInicio: number
) {
  if (
    ciclo.etapa_actual === 'Floración'
  ) {
    const semana =
      ciclo.semana_floracion
        ? `Semana ${ciclo.semana_floracion}`
        : 'Floración'

    const dia =
      ciclo.dia_semana_floracion
        ? ` · Día ${ciclo.dia_semana_floracion}`
        : ''

    return `${semana}${dia} · ${ciclo.cantidad_total} plantas`
  }

  return `Vegetación · Día ${Math.max(
    1,
    diasDesdeInicio
  )} · ${ciclo.cantidad_total} plantas`
}

function valorEc(
  valor: number | string | null
) {
  const n = numero(valor)

  return n > 0
    ? `EC ${formatear(n)}`
    : 'EC —'
}

function valorPh(
  periodo: PeriodoRiego
) {
  const minimo =
    numero(periodo.ph_objetivo_min)
  const maximo =
    numero(periodo.ph_objetivo_max)

  if (minimo <= 0 && maximo <= 0) {
    return 'pH —'
  }

  if (
    minimo > 0 &&
    maximo > 0 &&
    minimo !== maximo
  ) {
    return `pH ${formatear(
      minimo
    )}–${formatear(maximo)}`
  }

  return `pH ${formatear(
    minimo || maximo
  )}`
}

function diferenciaDias(
  desde: string,
  hasta: string
) {
  const inicio = new Date(
    `${desde}T12:00:00`
  )
  const fin = new Date(
    `${hasta}T12:00:00`
  )

  return Math.floor(
    (fin.getTime() - inicio.getTime()) /
      86400000
  )
}

function fechaHoyLocal() {
  const ahora = new Date()

  const year = ahora.getFullYear()
  const month = String(
    ahora.getMonth() + 1
  ).padStart(2, '0')
  const day = String(
    ahora.getDate()
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function numero(valor: unknown) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

function formatear(valor: number) {
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 2,
  }).format(valor)
}

function formatearKg(gramos: number) {
  if (!gramos) return '0 kg'

  return `${new Intl.NumberFormat(
    'es-AR',
    {
      maximumFractionDigits: 3,
    }
  ).format(gramos / 1000)} kg`
}

function formatearFechaCorta(
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
    new Date(`${fecha}T12:00:00`)
  )
}

function describirError(
  error: unknown,
  fallback: string
) {
  if (!error || typeof error !== 'object') {
    return fallback
  }

  const e = error as {
    message?: string
    details?: string
    hint?: string
    code?: string
  }

  return [
    e.message,
    e.details,
    e.hint,
    e.code ? `Código ${e.code}` : '',
  ]
    .filter(Boolean)
    .join(' · ') || fallback
}
