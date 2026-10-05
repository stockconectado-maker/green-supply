'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const COSTO_AGUA_DEFAULT_ARS_L = 1.33

type CicloRiego = {
  ciclo_id: number
  sala_id: number
  numero_ciclo: number
  codigo_cosecha: string
  estado: string
  etapa_actual: 'Vegetación' | 'Floración'
  fecha_inicio: string
  fecha_inicio_floracion: string | null
  fecha_corte_planificada: string | null
  cantidad_total: number
  semana_floracion: number | null
  dia_semana_floracion: number | null
  dia_floracion: number | null
  semanas_floracion_plan: number | null
}

type PlanRiego = {
  id: number
  ciclo_id: number
  plantilla_id: number | null
  nombre_plantilla_snapshot: string
  fuente_agua_snapshot: string
  estado: string
  observaciones: string | null
}

type PeriodoRiego = {
  periodo_ciclo_id: number
  plan_id: number
  ciclo_id: number
  orden: number
  etiqueta: string
  semana_ref: number | string
  dias_periodo: number | string
  ec_objetivo: number | string | null
  ph_objetivo_min: number | string | null
  ph_objetivo_max: number | string | null
  bases_activas: boolean
  solo_agua_osmosis: boolean
  riegos_dia: number | null
  ml_planta_evento: number | string | null
  plantas_ciclo: number
  litros_evento_sala: number | string | null
  litros_dia_sala: number | string | null
  litros_semana_sala: number | string | null
  litros_periodo_sala: number | string | null
  cantidad_tanques_riego: number | null
  capacidad_tanque_l: number | string | null
  capacidad_total_tanques_l: number | string | null
  tanques_equivalentes_dia: number | string | null
  tanques_equivalentes_periodo: number | string | null
  autonomia_tanque_dias: number | string | null
  porcentaje_tanque_dia: number | string | null
  observaciones: string | null
}

type InsumoPeriodo = {
  periodo_ciclo_id: number
  plan_id: number
  ciclo_id: number
  orden_periodo: number
  etiqueta: string
  semana_ref: number | string
  dias_periodo: number | string
  plantas_ciclo: number
  riegos_dia: number | null
  ml_planta_evento: number | string | null
  litros_evento_sala: number | string | null
  litros_dia_sala: number | string | null
  litros_semana_sala: number | string | null
  litros_periodo_sala: number | string | null
  insumo_periodo_id: number
  insumo_id: number | null
  insumo: string
  categoria: string
  dosis_ml_l: number | string | null
  contenido_envase_ml_snapshot: number | string | null
  costo_envase_ars_snapshot: number | string | null
  costo_por_ml_ars_snapshot: number | string | null
  cantidad_por_tanque_ml: number | string | null
  consumo_estimado_ml_periodo: number | string | null
  costo_estimado_ars_periodo: number | string | null
  nota_dosis: string | null
  obligatorio: boolean
  orden_insumo: number
}

type PasoProtocolo = {
  id: number
  plantilla_id: number
  orden: number
  titulo: string
  descripcion: string | null
}

type Props = {
  salaId: number
  salaNombre?: string
}

type RiegoForm = {
  riegos_dia: string
  ml_planta_evento: string
}

type ResumenInsumo = {
  nombre: string
  categoria: string
  consumoMl: number
  costo: number
  periodos: number
}

export default function Riego({
  salaId,
  salaNombre,
}: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [ciclo, setCiclo] = useState<CicloRiego | null>(null)
  const [plan, setPlan] = useState<PlanRiego | null>(null)
  const [periodos, setPeriodos] = useState<PeriodoRiego[]>([])
  const [insumos, setInsumos] = useState<InsumoPeriodo[]>([])
  const [protocolo, setProtocolo] = useState<PasoProtocolo[]>([])

  const [semanaSeleccionada, setSemanaSeleccionada] =
    useState<number | null>(null)

  const [form, setForm] = useState<RiegoForm>({
    riegos_dia: '',
    ml_planta_evento: '',
  })

  const [guardando, setGuardando] = useState(false)
  const [copiando, setCopiando] = useState(false)
  const [protocoloAbierto, setProtocoloAbierto] =
    useState(false)

  useEffect(() => {
    cargarRiego()
  }, [salaId])

  async function cargarRiego() {
    setCargando(true)
    setError('')

    const { data: cicloData, error: cicloError } =
      await supabase
        .from('vista_ciclos_cultivo')
        .select('*')
        .eq('sala_id', salaId)
        .eq('estado', 'Activo')
        .maybeSingle()

    if (cicloError) {
      setError(
        describirErrorSupabase(
          cicloError,
          'No se pudo cargar el ciclo activo.'
        )
      )
      setCargando(false)
      return
    }

    const cicloActual = cicloData as CicloRiego | null
    setCiclo(cicloActual)

    if (!cicloActual) {
      setPlan(null)
      setPeriodos([])
      setInsumos([])
      setProtocolo([])
      setCargando(false)
      return
    }

    let { data: planData, error: planError } =
      await supabase
        .from('planes_riego_ciclo')
        .select('*')
        .eq('ciclo_id', cicloActual.ciclo_id)
        .maybeSingle()

    if (planError) {
      setError(
        describirErrorSupabase(
          planError,
          'No se pudo cargar el plan de riego.'
        )
      )
      setCargando(false)
      return
    }

    // Fallback automático para ciclos viejos:
    // nunca pedimos al usuario "iniciar plan".
    if (!planData) {
      const { error: rpcError } = await supabase.rpc(
        'crear_plan_riego_ciclo',
        {
          p_ciclo_id: cicloActual.ciclo_id,
          p_plantilla_id: null,
        }
      )

      if (rpcError) {
        setError(
          describirErrorSupabase(
            rpcError,
            'No se pudo preparar automáticamente el plan de riego.'
          )
        )
        setCargando(false)
        return
      }

      const recarga = await supabase
        .from('planes_riego_ciclo')
        .select('*')
        .eq('ciclo_id', cicloActual.ciclo_id)
        .maybeSingle()

      planData = recarga.data
      planError = recarga.error

      if (planError || !planData) {
        setError(
          describirErrorSupabase(
            planError,
            'El plan se creó, pero no se pudo volver a cargar.'
          )
        )
        setCargando(false)
        return
      }
    }

    const planActual = planData as PlanRiego
    setPlan(planActual)

    const [
      resultadoPeriodos,
      resultadoInsumos,
      resultadoProtocolo,
    ] = await Promise.all([
      supabase
        .from('vista_plan_riego_periodos_ciclo')
        .select('*')
        .eq('plan_id', planActual.id)
        .order('orden'),

      supabase
        .from('vista_plan_riego_insumos_ciclo')
        .select('*')
        .eq('plan_id', planActual.id)
        .order('orden_periodo')
        .order('orden_insumo'),

      planActual.plantilla_id
        ? supabase
            .from('plantilla_riego_protocolo_pasos')
            .select('*')
            .eq('plantilla_id', planActual.plantilla_id)
            .order('orden')
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ])

    if (resultadoPeriodos.error) {
      setError(
        describirErrorSupabase(
          resultadoPeriodos.error,
          'No se pudieron cargar las semanas de riego.'
        )
      )
      setCargando(false)
      return
    }

    if (resultadoInsumos.error) {
      setError(
        describirErrorSupabase(
          resultadoInsumos.error,
          'No se pudo cargar la fórmula de alimentación.'
        )
      )
      setCargando(false)
      return
    }

    if (resultadoProtocolo.error) {
      setError(
        describirErrorSupabase(
          resultadoProtocolo.error,
          'No se pudo cargar el protocolo del tanque.'
        )
      )
      setCargando(false)
      return
    }

    const todas = (resultadoPeriodos.data ??
      []) as PeriodoRiego[]

    const semanasPlan =
      numero(cicloActual.semanas_floracion_plan) || 8

    const visibles = todas.filter(
      (periodo) =>
        numero(periodo.semana_ref) <= semanasPlan
    )

    const ids = new Set(
      visibles.map(
        (periodo) => periodo.periodo_ciclo_id
      )
    )

    const insumosVisibles = ((
      resultadoInsumos.data ?? []
    ) as InsumoPeriodo[]).filter((item) =>
      ids.has(item.periodo_ciclo_id)
    )

    setPeriodos(visibles)
    setInsumos(insumosVisibles)
    setProtocolo(
      (resultadoProtocolo.data ??
        []) as PasoProtocolo[]
    )

    const actual = resolverPeriodoActual(
      cicloActual,
      visibles
    )

    setSemanaSeleccionada((seleccion) => {
      const sigueExistiendo = visibles.some(
        (periodo) =>
          numero(periodo.semana_ref) ===
          seleccion
      )

      return sigueExistiendo
        ? seleccion
        : numero(actual?.semana_ref) ||
            numero(visibles[0]?.semana_ref) ||
            null
    })

    setCargando(false)
  }

  const periodoActual = useMemo(
    () => resolverPeriodoActual(ciclo, periodos),
    [ciclo, periodos]
  )

  const periodoSeleccionado = useMemo(() => {
    if (!periodos.length) return null

    return (
      periodos.find(
        (periodo) =>
          numero(periodo.semana_ref) ===
          semanaSeleccionada
      ) ??
      periodoActual ??
      periodos[0]
    )
  }, [
    periodos,
    semanaSeleccionada,
    periodoActual,
  ])

  const insumosSeleccionados = useMemo(() => {
    if (!periodoSeleccionado) return []

    return insumos.filter(
      (item) =>
        item.periodo_ciclo_id ===
        periodoSeleccionado.periodo_ciclo_id
    )
  }, [insumos, periodoSeleccionado])

  useEffect(() => {
    if (!periodoSeleccionado) {
      setForm({
        riegos_dia: '',
        ml_planta_evento: '',
      })
      return
    }

    setForm({
      riegos_dia:
        periodoSeleccionado.riegos_dia === null
          ? ''
          : String(
              periodoSeleccionado.riegos_dia
            ),
      ml_planta_evento:
        periodoSeleccionado.ml_planta_evento ===
        null
          ? ''
          : String(
              periodoSeleccionado.ml_planta_evento
            ),
    })
  }, [periodoSeleccionado?.periodo_ciclo_id])

  const preview = useMemo(() => {
    const plantas =
      numero(periodoSeleccionado?.plantas_ciclo) ||
      numero(ciclo?.cantidad_total)

    const riegos = numero(form.riegos_dia)
    const ml = numero(form.ml_planta_evento)
    const dias = numero(
      periodoSeleccionado?.dias_periodo
    )

    const litrosEvento =
      plantas > 0 && ml > 0
        ? (plantas * ml) / 1000
        : 0

    const litrosDia =
      litrosEvento > 0 && riegos > 0
        ? litrosEvento * riegos
        : 0

    const litrosPeriodo =
      litrosDia > 0 && dias > 0
        ? litrosDia * dias
        : 0

    const capacidadTanque =
      numero(periodoSeleccionado?.capacidad_total_tanques_l) || 500

    return {
      plantas,
      riegos,
      ml,
      litrosEvento,
      litrosDia,
      litrosPeriodo,
      capacidadTanque,
      litrosPlantaDia:
        ml > 0 && riegos > 0
          ? (ml * riegos) / 1000
          : 0,
      porcentajeTanqueDia:
        litrosDia > 0 && capacidadTanque > 0
          ? (litrosDia / capacidadTanque) * 100
          : 0,
      autonomiaTanqueDias:
        litrosDia > 0 && capacidadTanque > 0
          ? capacidadTanque / litrosDia
          : 0,
      tanquesPeriodo:
        litrosPeriodo > 0 && capacidadTanque > 0
          ? litrosPeriodo / capacidadTanque
          : 0,
    }
  }, [
    ciclo?.cantidad_total,
    periodoSeleccionado,
    form,
  ])

  const periodosSinRiego = useMemo(
    () =>
      periodos.filter(
        (periodo) =>
          !periodo.riegos_dia ||
          numero(periodo.ml_planta_evento) <= 0
      ).length,
    [periodos]
  )

  const resumenCiclo = useMemo(
    () => agruparInsumos(insumos),
    [insumos]
  )

  const costoAditivosCiclo = useMemo(
    () =>
      resumenCiclo
        .filter(
          (item) =>
            item.categoria === 'Aditivo' ||
            item.categoria === 'Finalizador'
        )
        .reduce(
          (total, item) => total + item.costo,
          0
        ),
    [resumenCiclo]
  )

  const costoNutricionCiclo = useMemo(
    () =>
      resumenCiclo.reduce(
        (total, item) => total + item.costo,
        0
      ),
    [resumenCiclo]
  )

  const litrosPlan = useMemo(
    () =>
      periodos.reduce(
        (total, periodo) =>
          total +
          numero(periodo.litros_periodo_sala),
        0
      ),
    [periodos]
  )

  const costoAguaCiclo = useMemo(
    () =>
      litrosPlan * COSTO_AGUA_DEFAULT_ARS_L,
    [litrosPlan]
  )

  const costoTotalCiclo = useMemo(
    () =>
      costoNutricionCiclo + costoAguaCiclo,
    [costoNutricionCiclo, costoAguaCiclo]
  )

  async function guardarSemana() {
    if (!periodoSeleccionado) return

    const riegos = enteroPositivoONull(
      form.riegos_dia
    )
    const ml = numeroPositivoONull(
      form.ml_planta_evento
    )

    if (
      form.riegos_dia.trim() &&
      riegos === null
    ) {
      setError(
        'Riegos por día debe ser un número entero mayor a 0.'
      )
      return
    }

    if (
      form.ml_planta_evento.trim() &&
      ml === null
    ) {
      setError(
        'La cantidad por planta/evento debe ser mayor a 0.'
      )
      return
    }

    setError('')
    setGuardando(true)

    const { error: updateError } =
      await supabase
        .from('plan_riego_periodos_ciclo')
        .update({
          riegos_dia: riegos,
          ml_planta_evento: ml,
        })
        .eq(
          'id',
          periodoSeleccionado.periodo_ciclo_id
        )

    if (updateError) {
      setError(
        describirErrorSupabase(
          updateError,
          'No se pudo guardar el riego.'
        )
      )
      setGuardando(false)
      return
    }

    setGuardando(false)
    await cargarRiego()
  }

  async function copiarATodoElCiclo() {
    if (!plan || !periodoSeleccionado) return

    const riegos = enteroPositivoONull(
      form.riegos_dia
    )
    const ml = numeroPositivoONull(
      form.ml_planta_evento
    )

    if (riegos === null || ml === null) {
      setError(
        'Primero completá riegos por día y ml por planta/evento.'
      )
      return
    }

    const confirmar = window.confirm(
      `¿Aplicar ${riegos} riegos/día y ${formatear(
        ml
      )} ml/planta a todas las semanas del ciclo? Después podés ajustar cualquier semana por separado.`
    )

    if (!confirmar) return

    setError('')
    setCopiando(true)

    const { error: updateError } =
      await supabase
        .from('plan_riego_periodos_ciclo')
        .update({
          riegos_dia: riegos,
          ml_planta_evento: ml,
        })
        .eq('plan_id', plan.id)

    if (updateError) {
      setError(
        describirErrorSupabase(
          updateError,
          'No se pudo copiar la configuración.'
        )
      )
      setCopiando(false)
      return
    }

    setCopiando(false)
    await cargarRiego()
  }

  if (cargando) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
        <p className="text-base font-medium text-zinc-500">
          Preparando riego...
        </p>
      </section>
    )
  }

  if (!ciclo) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-2xl">
            💧
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950">
            Todavía no hay un ciclo activo
          </h2>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Cuando inicies el cultivo de esta sala, el
            plan de riego se crea automáticamente.
          </p>
        </div>
      </section>
    )
  }

  if (!plan || !periodoSeleccionado) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        {error ? (
          <ErrorBox texto={error} />
        ) : (
          <p className="text-sm text-zinc-500">
            No se pudo preparar el plan de riego.
          </p>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-5">
      {error && <ErrorBox texto={error} />}

      <Cabecera
        ciclo={ciclo}
        salaNombre={salaNombre}
        periodoActual={periodoActual}
        periodosSinRiego={periodosSinRiego}
        costoTotalCiclo={costoTotalCiclo}
      />

      <SelectorSemanas
        periodos={periodos}
        insumos={insumos}
        litrosPlan={litrosPlan}
        costoTotal={costoTotalCiclo}
        periodoActual={periodoActual}
        periodoSeleccionado={
          periodoSeleccionado
        }
        onSeleccionar={(periodo) =>
          setSemanaSeleccionada(
            numero(periodo.semana_ref)
          )
        }
      />

      <ConfiguracionRiego
        periodo={periodoSeleccionado}
        esActual={
          periodoActual?.periodo_ciclo_id ===
          periodoSeleccionado.periodo_ciclo_id
        }
        form={form}
        setForm={setForm}
        preview={preview}
        guardando={guardando}
        copiando={copiando}
        onGuardar={guardarSemana}
        onCopiar={copiarATodoElCiclo}
      />

      <FormulaSemana
        periodo={periodoSeleccionado}
        insumos={insumosSeleccionados}
      />

      <Protocolo
        pasos={protocolo}
        abierto={protocoloAbierto}
        setAbierto={setProtocoloAbierto}
        periodo={periodoSeleccionado}
        insumos={insumosSeleccionados}
      />

      <ConsumoSemana
        periodo={periodoSeleccionado}
        insumos={insumosSeleccionados}
      />

      <ProyeccionCiclo
        resumen={resumenCiclo}
        litrosPlan={litrosPlan}
        capacidadTanqueL={
          numero(periodoSeleccionado.capacidad_total_tanques_l) || 500
        }
        costoAditivos={costoAditivosCiclo}
        costoNutricion={costoNutricionCiclo}
        costoAgua={costoAguaCiclo}
        costoTotalRiego={costoTotalCiclo}
        periodosSinRiego={periodosSinRiego}
      />
    </div>
  )
}

function Cabecera({
  ciclo,
  salaNombre,
  periodoActual,
  periodosSinRiego,
  costoTotalCiclo,
}: {
  ciclo: CicloRiego
  salaNombre?: string
  periodoActual: PeriodoRiego | null
  periodosSinRiego: number
  costoTotalCiclo: number
}) {
  const litrosDia = numero(
    periodoActual?.litros_dia_sala
  )
  const litrosPeriodo = numero(
    periodoActual?.litros_periodo_sala
  )
  const capacidadTanque =
    numero(
      periodoActual?.capacidad_total_tanques_l
    ) || 500

  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="flex min-h-[210px] flex-col justify-between rounded-3xl bg-zinc-50 p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-sky-700">
                Riego
              </span>

              <span className="text-sm font-semibold text-zinc-600">
                {salaNombre ?? `Sala ${ciclo.sala_id}`}
              </span>

              <span className="text-zinc-300">
                ·
              </span>

              <span className="font-mono text-xs font-semibold text-zinc-500">
                {ciclo.codigo_cosecha}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
              <h2 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
                {periodoActual?.etiqueta ??
                  'Plan de riego'}
              </h2>

              {ciclo.etapa_actual ===
                'Floración' &&
                ciclo.dia_semana_floracion && (
                  <span className="pb-1 text-xl font-semibold text-sky-700">
                    Día {ciclo.dia_semana_floracion}
                  </span>
                )}
            </div>

            <p className="mt-3 text-base leading-6 text-zinc-600">
              <span className="font-semibold text-zinc-950">
                {ciclo.cantidad_total} plantas reales
              </span>
              {' · '}
              cálculo según la ocupación real de
              las camas.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-sm font-semibold text-sky-700">
              1 tanque · {formatear(capacidadTanque)} L
            </span>

            <span
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                periodosSinRiego === 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {periodosSinRiego === 0
                ? 'Plan completo'
                : `${periodosSinRiego} sin configurar`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricaCabecera
            titulo="Agua / día"
            valor={
              litrosDia > 0
                ? `${formatear(litrosDia)} L`
                : '—'
            }
            detalle="consumo diario"
            destacada
          />

          <MetricaCabecera
            titulo="Agua / período"
            valor={
              litrosPeriodo > 0
                ? `${formatear(litrosPeriodo)} L`
                : '—'
            }
            detalle={
              periodoActual
                ? `${formatear(
                    numero(periodoActual.dias_periodo)
                  )} días`
                : 'sin período'
            }
          />

          <MetricaCabecera
            titulo="Costo del ciclo"
            valor={
              costoTotalCiclo > 0
                ? moneda(costoTotalCiclo)
                : '—'
            }
            detalle="nutrición + agua"
          />

          <MetricaCabecera
            titulo="EC objetivo"
            valor={
              periodoActual?.ec_objetivo !==
                null &&
              periodoActual?.ec_objetivo !==
                undefined
                ? formatear(
                    numero(
                      periodoActual.ec_objetivo
                    )
                  )
                : '—'
            }
            detalle="objetivo actual"
          />

          <MetricaCabecera
            titulo="pH objetivo"
            valor={phLabel(periodoActual)}
            detalle="objetivo actual"
          />

          <MetricaCabecera
            titulo="Uso del tanque"
            valor={
              numero(
                periodoActual?.porcentaje_tanque_dia
              ) > 0
                ? `${formatear(
                    numero(
                      periodoActual?.porcentaje_tanque_dia
                    )
                  )}%`
                : '—'
            }
            detalle={
              numero(
                periodoActual?.autonomia_tanque_dias
              ) > 0
                ? `${formatear(
                    numero(
                      periodoActual?.autonomia_tanque_dias
                    )
                  )} días autonomía`
                : 'tanque de 500 L'
            }
          />
        </div>
      </div>
    </section>
  )
}

function MetricaCabecera({
  titulo,
  valor,
  detalle,
  destacada = false,
}: {
  titulo: string
  valor: string
  detalle: string
  destacada?: boolean
}) {
  return (
    <div
      className={`flex min-h-[100px] flex-col justify-between rounded-2xl border p-4 ${
        destacada
          ? 'border-sky-200 bg-sky-50'
          : 'border-zinc-200 bg-white'
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-[0.07em] ${
          destacada
            ? 'text-sky-700'
            : 'text-zinc-500'
        }`}
      >
        {titulo}
      </p>

      <div className="mt-3">
        <p className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
          {valor}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {detalle}
        </p>
      </div>
    </div>
  )
}

function SelectorSemanas({
  periodos,
  insumos,
  litrosPlan,
  costoTotal,
  periodoActual,
  periodoSeleccionado,
  onSeleccionar,
}: {
  periodos: PeriodoRiego[]
  insumos: InsumoPeriodo[]
  litrosPlan: number
  costoTotal: number
  periodoActual: PeriodoRiego | null
  periodoSeleccionado: PeriodoRiego
  onSeleccionar: (
    periodo: PeriodoRiego
  ) => void
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-zinc-950">
            Plan por semana
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            EC, pH y costo estimado de cada etapa.
            Seleccioná una tarjeta para ver el detalle.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <DatoResumen
            titulo="Agua del ciclo"
            valor={
              litrosPlan > 0
                ? `${formatear(litrosPlan)} L`
                : 'Pendiente'
            }
          />

          <DatoResumen
            titulo="Costo total"
            valor={
              costoTotal > 0
                ? moneda(costoTotal)
                : 'Pendiente'
            }
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {periodos.map((periodo) => {
          const seleccionado =
            periodo.periodo_ciclo_id ===
            periodoSeleccionado.periodo_ciclo_id

          const actual =
            periodo.periodo_ciclo_id ===
            periodoActual?.periodo_ciclo_id

          const configurado =
            Boolean(periodo.riegos_dia) &&
            numero(
              periodo.ml_planta_evento
            ) > 0

          const costo = costoPeriodoTotal(
            insumos,
            periodo
          )

          return (
            <button
              key={periodo.periodo_ciclo_id}
              type="button"
              onClick={() =>
                onSeleccionar(periodo)
              }
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                seleccionado
                  ? 'border-sky-400 bg-sky-50 shadow-sm ring-2 ring-sky-100'
                  : 'border-zinc-200 bg-white hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-sm'
              }`}
            >
              {actual && (
                <div className="absolute inset-x-0 top-0 h-1 bg-sky-500" />
              )}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-zinc-950">
                    {periodo.etiqueta}
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    {actual && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                        ACTUAL
                      </span>
                    )}

                    {!actual && (
                      <span
                        className={`text-[11px] font-semibold ${
                          configurado
                            ? 'text-emerald-600'
                            : 'text-zinc-400'
                        }`}
                      >
                        {configurado
                          ? 'Configurada'
                          : 'Pendiente'}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                    configurado
                      ? 'bg-emerald-500'
                      : 'bg-zinc-300'
                  }`}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
                    EC
                  </p>
                  <p className="mt-1 text-xl font-semibold text-zinc-950">
                    {periodo.ec_objetivo !== null
                      ? formatear(
                          numero(
                            periodo.ec_objetivo
                          )
                        )
                      : '—'}
                  </p>
                </div>

                <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
                    pH
                  </p>
                  <p className="mt-1 text-lg font-semibold text-zinc-950">
                    {phLabel(periodo)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between gap-3 border-t border-zinc-100 pt-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
                    Costo
                  </p>
                  <p className="mt-1 text-base font-semibold text-emerald-700">
                    {costo > 0
                      ? moneda(costo)
                      : '—'}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-zinc-400">
                    Agua
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-700">
                    {numero(
                      periodo.litros_periodo_sala
                    ) > 0
                      ? `${formatear(
                          numero(
                            periodo.litros_periodo_sala
                          )
                        )} L`
                      : '—'}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-zinc-950 px-4 py-3 text-white">
        <div>
          <p className="text-xs font-medium text-zinc-400">
            Total estimado del plan
          </p>
          <p className="mt-0.5 text-sm font-semibold">
            {periodos.length} etapas ·{' '}
            {litrosPlan > 0
              ? `${formatear(litrosPlan)} L de agua`
              : 'agua pendiente'}
          </p>
        </div>

        <p className="text-xl font-semibold tracking-tight">
          {costoTotal > 0
            ? moneda(costoTotal)
            : 'Costo pendiente'}
        </p>
      </div>
    </section>
  )
}

function ConfiguracionRiego({
  periodo,
  esActual,
  form,
  setForm,
  preview,
  guardando,
  copiando,
  onGuardar,
  onCopiar,
}: {
  periodo: PeriodoRiego
  esActual: boolean
  form: RiegoForm
  setForm: React.Dispatch<
    React.SetStateAction<RiegoForm>
  >
  preview: {
    plantas: number
    riegos: number
    ml: number
    litrosEvento: number
    litrosDia: number
    litrosPeriodo: number
    litrosPlantaDia: number
    capacidadTanque: number
    porcentajeTanqueDia: number
    autonomiaTanqueDias: number
    tanquesPeriodo: number
  }
  guardando: boolean
  copiando: boolean
  onGuardar: () => void
  onCopiar: () => void
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-sm">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
              {periodo.etiqueta}
            </span>

            {esActual && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Semana actual
              </span>
            )}
          </div>

          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950">
            Configurar riego
          </h3>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Solo necesitamos dos datos: cuántos
            riegos hacemos y cuánto recibe cada
            planta en cada evento.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <CampoNumero
              label="Riegos por día"
              value={form.riegos_dia}
              onChange={(valor) =>
                setForm((actual) => ({
                  ...actual,
                  riegos_dia: valor,
                }))
              }
              step="1"
              placeholder="Ej. 4"
            />

            <CampoNumero
              label="ml por planta / evento"
              value={form.ml_planta_evento}
              onChange={(valor) =>
                setForm((actual) => ({
                  ...actual,
                  ml_planta_evento: valor,
                }))
              }
              step="1"
              placeholder="Ej. 350"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onGuardar}
              disabled={guardando || copiando}
              className="rounded-xl bg-sky-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-40"
            >
              {guardando
                ? 'Guardando...'
                : `Guardar ${periodo.etiqueta}`}
            </button>

            <button
              type="button"
              onClick={onCopiar}
              disabled={guardando || copiando}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40"
            >
              {copiando
                ? 'Copiando...'
                : 'Usar este riego en todo el ciclo'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-sky-50/70 p-4">
          <MetricaAgua
            titulo="Por evento"
            valor={
              preview.litrosEvento > 0
                ? `${formatear(
                    preview.litrosEvento
                  )} L`
                : '—'
            }
            detalle={`${preview.plantas} plantas reales`}
          />

          <MetricaAgua
            titulo="Por día"
            valor={
              preview.litrosDia > 0
                ? `${formatear(
                    preview.litrosDia
                  )} L`
                : '—'
            }
            detalle={
              preview.riegos > 0
                ? `${preview.riegos} eventos`
                : 'sin frecuencia'
            }
          />

          <MetricaAgua
            titulo="En el período"
            valor={
              preview.litrosPeriodo > 0
                ? `${formatear(
                    preview.litrosPeriodo
                  )} L`
                : '—'
            }
            detalle={`${formatear(
              numero(periodo.dias_periodo)
            )} días`}
          />

          <MetricaAgua
            titulo="Por planta / día"
            valor={
              preview.litrosPlantaDia > 0
                ? `${formatear(
                    preview.litrosPlantaDia
                  )} L`
                : '—'
            }
            detalle="referencia individual"
          />
        </div>
      </div>

      <div className="border-t border-sky-100 bg-sky-50/40 px-5 py-4">
        <div className="grid gap-3 md:grid-cols-4">
          <DatoTanque
            titulo="Tanque de la sala"
            valor={`${formatear(preview.capacidadTanque)} L`}
            detalle="1 tanque fijo"
          />
          <DatoTanque
            titulo="Uso diario"
            valor={
              preview.porcentajeTanqueDia > 0
                ? `${formatear(preview.porcentajeTanqueDia)}%`
                : '—'
            }
            detalle="de la capacidad"
          />
          <DatoTanque
            titulo="Autonomía"
            valor={
              preview.autonomiaTanqueDias > 0
                ? `${formatear(preview.autonomiaTanqueDias)} días`
                : '—'
            }
            detalle="con tanque lleno"
          />
          <DatoTanque
            titulo="Tanques del período"
            valor={
              preview.tanquesPeriodo > 0
                ? `${formatear(preview.tanquesPeriodo)} eq.`
                : '—'
            }
            detalle="equivalentes de 500 L"
          />
        </div>

        {preview.litrosDia > preview.capacidadTanque && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            La demanda diaria supera los {formatear(preview.capacidadTanque)} L
            disponibles en el tanque de esta sala.
          </p>
        )}
      </div>
    </section>
  )
}

function FormulaSemana({
  periodo,
  insumos,
}: {
  periodo: PeriodoRiego
  insumos: InsumoPeriodo[]
}) {
  const ordenados = ordenarInsumos(insumos)

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold tracking-tight text-zinc-950">
              Qué toca esta semana
            </h3>

            {numero(periodo.semana_ref) ===
              5.5 && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                mismo EC · cambia el aditivo
              </span>
            )}

            {periodo.solo_agua_osmosis && (
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                lavado / finalización
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-zinc-500">
            Fórmula Green Supply precargada. Se
            repite automáticamente en todos los
            ciclos.
          </p>
        </div>

        <div className="flex gap-5 rounded-2xl bg-zinc-50 px-4 py-3">
          <div>
            <p className="text-xs text-zinc-500">
              EC objetivo
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">
              {periodo.ec_objetivo !== null
                ? formatear(
                    numero(periodo.ec_objetivo)
                  )
                : '—'}
            </p>
          </div>

          <div>
            <p className="text-xs text-zinc-500">
              pH objetivo
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">
              {phLabel(periodo)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
        <div className="flex items-center gap-4 border-b border-zinc-100 bg-sky-50 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-700 text-sm font-bold text-white">
            1
          </div>

          <div>
            <p className="text-sm font-semibold text-zinc-900">
              Agua de ósmosis
            </p>
            <p className="text-xs text-zinc-500">
              Cargar primero el volumen de agua.
            </p>
          </div>
        </div>

        {ordenados.map((item, index) => (
          <div
            key={item.insumo_periodo_id}
            className="flex items-center justify-between gap-4 border-b border-zinc-100 px-4 py-3 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600">
                {index + 2}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {item.insumo}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {etiquetaCategoria(
                    item.categoria
                  )}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-base font-semibold text-emerald-700">
                {item.dosis_ml_l !== null
                  ? `${formatear(
                      numero(item.dosis_ml_l)
                    )} ml/L`
                  : '—'}
              </p>

              <p className="mt-0.5 text-xs font-medium text-zinc-500">
                Tanque {formatear(
                  numero(periodo.capacidad_total_tanques_l) || 500
                )} L:{' '}
                <span className="font-semibold text-zinc-800">
                  {item.cantidad_por_tanque_ml !== null
                    ? formatoConsumo(
                        numero(item.cantidad_por_tanque_ml)
                      )
                    : '—'}
                </span>
              </p>

              {item.costo_envase_ars_snapshot !== null && (
                <p className="mt-0.5 text-xs text-zinc-400">
                  1 L ref. {moneda(
                    numero(item.costo_envase_ars_snapshot)
                  )}
                </p>
              )}
            </div>
          </div>
        ))}

        <div className="grid gap-2 bg-zinc-50 px-4 py-4 sm:grid-cols-2">
          <div className="rounded-xl bg-white px-4 py-3">
            <p className="text-xs text-zinc-500">
              Después de mezclar
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">
              Ajustar EC a{' '}
              {periodo.ec_objetivo !== null
                ? formatear(
                    numero(periodo.ec_objetivo)
                  )
                : '—'}
            </p>
          </div>

          <div className="rounded-xl bg-white px-4 py-3">
            <p className="text-xs text-zinc-500">
              Último control
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">
              Ajustar pH a {phLabel(periodo)}
            </p>
          </div>
        </div>
      </div>

      {periodo.observaciones && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800">
          {periodo.observaciones}
        </p>
      )}
    </section>
  )
}

function ConsumoSemana({
  periodo,
  insumos,
}: {
  periodo: PeriodoRiego
  insumos: InsumoPeriodo[]
}) {
  const costoNutricion = insumos.reduce(
    (total, item) =>
      total +
      numero(
        item.costo_estimado_ars_periodo
      ),
    0
  )

  const litrosPeriodo =
    numero(periodo.litros_periodo_sala)

  const costoAgua =
    litrosPeriodo * COSTO_AGUA_DEFAULT_ARS_L

  const costo =
    costoNutricion + costoAgua

  const tieneAgua =
    litrosPeriodo > 0

  const capacidadTanque =
    numero(periodo.capacidad_total_tanques_l) || 500

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-zinc-950">
            Consumo de {periodo.etiqueta.toLowerCase()}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Agua, cantidad por tanque de {formatear(capacidadTanque)} L,
            consumo del período y costo aproximado.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <DatoResumen
            titulo="Agua"
            valor={
              tieneAgua
                ? `${formatear(
                    numero(
                      periodo.litros_periodo_sala
                    )
                  )} L`
                : 'Pendiente'
            }
          />

          <DatoResumen
            titulo="Tanques equiv."
            valor={
              periodo.tanques_equivalentes_periodo !== null
                ? formatear(
                    numero(
                      periodo.tanques_equivalentes_periodo
                    )
                  )
                : 'Pendiente'
            }
          />

          <DatoResumen
            titulo="Costo aprox."
            valor={
              costo > 0
                ? moneda(costo)
                : 'Pendiente'
            }
          />
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[minmax(180px,1fr)_90px_120px_130px_120px_130px] gap-3 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500">
            <span>Insumo</span>
            <span className="text-right">Dosis</span>
            <span className="text-right">Tanque 500 L</span>
            <span className="text-right">Precio 1 L</span>
            <span className="text-right">Consumo</span>
            <span className="text-right">Costo período</span>
          </div>

          {ordenarInsumos(insumos).map(
            (item) => (
              <div
                key={item.insumo_periodo_id}
                className="grid grid-cols-[minmax(180px,1fr)_90px_120px_130px_120px_130px] gap-3 border-t border-zinc-100 px-4 py-3.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-900">
                    {item.insumo}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {etiquetaCategoria(item.categoria)}
                  </p>
                </div>

                <p className="text-right font-medium text-zinc-700">
                  {item.dosis_ml_l !== null
                    ? `${formatear(
                        numero(item.dosis_ml_l)
                      )}`
                    : '—'}
                </p>

                <p className="text-right font-semibold text-sky-700">
                  {item.cantidad_por_tanque_ml !== null
                    ? formatoConsumo(
                        numero(item.cantidad_por_tanque_ml)
                      )
                    : '—'}
                </p>

                <p className="text-right font-semibold text-zinc-900">
                  {item.costo_envase_ars_snapshot !== null
                    ? moneda(
                        numero(item.costo_envase_ars_snapshot)
                      )
                    : '—'}
                </p>

                <p className="text-right font-medium text-zinc-700">
                  {item.consumo_estimado_ml_periodo !==
                  null
                    ? formatoConsumo(
                        numero(
                          item.consumo_estimado_ml_periodo
                        )
                      )
                    : '—'}
                </p>

                <p className="text-right font-semibold text-emerald-700">
                  {item.costo_estimado_ars_periodo !==
                  null
                    ? moneda(
                        numero(
                          item.costo_estimado_ars_periodo
                        )
                      )
                    : '—'}
                </p>
              </div>
            )
          )}

          {tieneAgua && (
            <div className="grid grid-cols-[minmax(180px,1fr)_90px_120px_130px_120px_130px] gap-3 border-t border-zinc-100 bg-sky-50/40 px-4 py-3.5 text-sm">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900">
                  Agua AySA
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  residencial · valor promedio
                </p>
              </div>

              <p className="text-right text-zinc-400">—</p>
              <p className="text-right text-zinc-400">—</p>

              <p className="text-right font-medium text-zinc-700">
                {moneda(COSTO_AGUA_DEFAULT_ARS_L)} / L
              </p>

              <p className="text-right font-medium text-zinc-700">
                {formatear(litrosPeriodo)} L
              </p>

              <p className="text-right font-semibold text-sky-700">
                {moneda(costoAgua)}
              </p>
            </div>
          )}

          {!insumos.length && (
            <div className="border-t border-zinc-100 px-4 py-6 text-center text-sm text-zinc-500">
              Esta etapa no tiene alimentación configurada.
            </div>
          )}
        </div>
      </div>

      {tieneAgua && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-sm">
          <span className="text-zinc-500">
            Nutrición {moneda(costoNutricion)}
          </span>
          <span className="text-zinc-300">+</span>
          <span className="text-zinc-500">
            Agua {moneda(costoAgua)}
          </span>
          <span className="text-zinc-300">=</span>
          <span className="rounded-xl bg-zinc-950 px-3 py-2 font-semibold text-white">
            Total {moneda(costo)}
          </span>
        </div>
      )}
    </section>
  )
}

function ProyeccionCiclo({
  resumen,
  litrosPlan,
  capacidadTanqueL,
  costoAditivos,
  costoNutricion,
  costoAgua,
  costoTotalRiego,
  periodosSinRiego,
}: {
  resumen: ResumenInsumo[]
  litrosPlan: number
  capacidadTanqueL: number
  costoAditivos: number
  costoNutricion: number
  costoAgua: number
  costoTotalRiego: number
  periodosSinRiego: number
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-zinc-950">
            Proyección del ciclo
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Una vez configuradas las semanas,
            vemos cuánto agua y cuánto dinero
            aproximadamente requiere este ciclo.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <DatoResumen
            titulo="Agua ciclo"
            valor={
              litrosPlan > 0
                ? `${formatear(
                    litrosPlan
                  )} L`
                : 'Pendiente'
            }
          />

          <DatoResumen
            titulo="Costo agua"
            valor={
              costoAgua > 0
                ? moneda(costoAgua)
                : 'Pendiente'
            }
          />

          <DatoResumen
            titulo="Tanques 500 L"
            valor={
              litrosPlan > 0 && capacidadTanqueL > 0
                ? `${formatear(
                    litrosPlan / capacidadTanqueL
                  )} eq.`
                : 'Pendiente'
            }
          />

          <DatoResumen
            titulo="Aditivos"
            valor={
              costoAditivos > 0
                ? moneda(costoAditivos)
                : 'Pendiente'
            }
          />

          <DatoResumen
            titulo="Nutrición"
            valor={
              costoNutricion > 0
                ? moneda(costoNutricion)
                : 'Pendiente'
            }
          />

          <DatoResumen
            titulo="Costo riego"
            valor={
              costoTotalRiego > 0
                ? moneda(costoTotalRiego)
                : 'Pendiente'
            }
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {resumen.map((item) => (
          <div
            key={item.nombre}
            className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {item.nombre}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {etiquetaCategoria(
                    item.categoria
                  )}
                </p>
              </div>

              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-500 ring-1 ring-zinc-200">
                {item.periodos} etapa
                {item.periodos === 1 ? '' : 's'}
              </span>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-500">
                  Consumo
                </p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">
                  {item.consumoMl > 0
                    ? formatoConsumo(
                        item.consumoMl
                      )
                    : '—'}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-zinc-500">
                  Costo
                </p>
                <p className="mt-1 text-lg font-semibold text-emerald-700">
                  {item.costo > 0
                    ? moneda(item.costo)
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {periodosSinRiego > 0 && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800">
          La proyección todavía es parcial:
          faltan configurar{' '}
          <strong>{periodosSinRiego}</strong>{' '}
          período
          {periodosSinRiego === 1 ? '' : 's'} de
          riego.
        </p>
      )}
    </section>
  )
}

function Protocolo({
  pasos,
  abierto,
  setAbierto,
  periodo,
  insumos,
}: {
  pasos: PasoProtocolo[]
  abierto: boolean
  setAbierto: (valor: boolean) => void
  periodo: PeriodoRiego
  insumos: InsumoPeriodo[]
}) {
  const capacidad =
    numero(periodo.capacidad_total_tanques_l) || 500

  const ordenados = ordenarInsumos(insumos)

  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-zinc-50/60"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-xl">
            💧
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold tracking-tight text-zinc-950">
                Preparación del tanque
              </h3>
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                1 tanque · {formatear(capacidad)} L
              </span>
            </div>

            <p className="mt-1 text-sm text-zinc-500">
              Orden de mezcla y cantidades exactas para un tanque lleno.
            </p>
          </div>
        </div>

        <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-600">
          {abierto ? 'Cerrar' : 'Preparar tanque'}
        </span>
      </button>

      {abierto && (
        <div className="border-t border-zinc-100 p-5">
          <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
            <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-sky-700">
                Tanque de esta sala
              </p>

              <div className="mt-5 flex items-end justify-center">
                <div className="relative h-52 w-36 overflow-hidden rounded-[28px] border-4 border-sky-200 bg-white shadow-inner">
                  <div className="absolute inset-x-0 bottom-0 h-full bg-sky-100" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-semibold tracking-tight text-sky-900">
                      {formatear(capacidad)}
                    </span>
                    <span className="mt-1 text-sm font-semibold text-sky-700">
                      litros
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <DatoTanque
                  titulo="EC final"
                  valor={
                    periodo.ec_objetivo !== null
                      ? formatear(
                          numero(periodo.ec_objetivo)
                        )
                      : '—'
                  }
                  detalle="objetivo"
                />
                <DatoTanque
                  titulo="pH final"
                  valor={phLabel(periodo)}
                  detalle="objetivo"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-zinc-950">
                    {periodo.etiqueta}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Seguí este orden. Las cantidades están calculadas para
                    {` ${formatear(capacidad)} L`}.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <PasoTanque
                  numeroPaso={1}
                  titulo="Agua de ósmosis"
                  detalle="Cargar primero el tanque."
                  cantidad={`${formatear(capacidad)} L`}
                  destacado
                />

                {ordenados.map((item, index) => (
                  <PasoTanque
                    key={item.insumo_periodo_id}
                    numeroPaso={index + 2}
                    titulo={item.insumo}
                    detalle={
                      item.nota_dosis ||
                      `${etiquetaCategoria(item.categoria)} · ${formatear(
                        numero(item.dosis_ml_l)
                      )} ml/L`
                    }
                    cantidad={
                      item.cantidad_por_tanque_ml !== null
                        ? formatoConsumo(
                            numero(item.cantidad_por_tanque_ml)
                          )
                        : '—'
                    }
                  />
                ))}

                <PasoTanque
                  numeroPaso={ordenados.length + 2}
                  titulo="Controlar EC"
                  detalle="Medir después de mezclar todos los insumos."
                  cantidad={
                    periodo.ec_objetivo !== null
                      ? `EC ${formatear(
                          numero(periodo.ec_objetivo)
                        )}`
                      : '—'
                  }
                />

                <PasoTanque
                  numeroPaso={ordenados.length + 3}
                  titulo="Ajustar pH"
                  detalle="Último ajuste antes de dejar el tanque listo."
                  cantidad={`pH ${phLabel(periodo)}`}
                  destacado
                />
              </div>

              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900">
                  Orden importante
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Agua → CalMag → mezclar → Sensi A → mezclar → Sensi B →
                  mezclar → aditivos de la semana → EC → pH. No agregar
                  Sensi A y B juntos.
                </p>
              </div>

              {pasos.length > 0 && (
                <p className="mt-3 text-xs text-zinc-400">
                  Protocolo Green Supply guardado en el sistema · {pasos.length}{' '}
                  pasos de referencia.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function PasoTanque({
  numeroPaso,
  titulo,
  detalle,
  cantidad,
  destacado = false,
}: {
  numeroPaso: number
  titulo: string
  detalle: string
  cantidad: string
  destacado?: boolean
}) {
  return (
    <div
      className={`grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-4 py-3 ${
        destacado
          ? 'border-sky-200 bg-sky-50/70'
          : 'border-zinc-200 bg-white'
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
          destacado
            ? 'bg-sky-700 text-white'
            : 'bg-zinc-100 text-zinc-600'
        }`}
      >
        {numeroPaso}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-900">
          {titulo}
        </p>
        <p className="mt-0.5 text-xs leading-5 text-zinc-500">
          {detalle}
        </p>
      </div>

      <div className="rounded-xl bg-zinc-950 px-3 py-2 text-right text-sm font-semibold text-white">
        {cantidad}
      </div>
    </div>
  )
}

function CampoNumero({
  label,
  value,
  onChange,
  step,
  placeholder,
}: {
  label: string
  value: string
  onChange: (valor: string) => void
  step: string
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-zinc-700">
        {label}
      </span>

      <input
        type="number"
        min="0"
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-lg font-semibold text-zinc-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      />
    </label>
  )
}

function MetricaAgua({
  titulo,
  valor,
  detalle,
}: {
  titulo: string
  valor: string
  detalle: string
}) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-4">
      <p className="text-sm font-medium text-sky-700">
        {titulo}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
        {valor}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        {detalle}
      </p>
    </div>
  )
}

function DatoTanque({
  titulo,
  valor,
  detalle,
}: {
  titulo: string
  valor: string
  detalle: string
}) {
  return (
    <div className="rounded-xl border border-sky-100 bg-white px-3.5 py-3">
      <p className="text-xs font-medium text-sky-700">
        {titulo}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-zinc-950">
        {valor}
      </p>
      <p className="mt-0.5 text-xs text-zinc-400">
        {detalle}
      </p>
    </div>
  )
}

function DatoResumen({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div className="min-w-[112px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
      <p className="text-xs text-zinc-500">
        {titulo}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-900">
        {valor}
      </p>
    </div>
  )
}

function ErrorBox({
  texto,
}: {
  texto: string
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {texto}
    </div>
  )
}

function resolverPeriodoActual(
  ciclo: CicloRiego | null,
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
    numero(ciclo.dia_semana_floracion) || 1

  // "Media semana" se usa para marcar un cambio
  // de fórmula dentro de la misma semana.
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

function costoNutricionPeriodo(
  insumos: InsumoPeriodo[],
  periodoId: number
) {
  return insumos
    .filter(
      (item) =>
        item.periodo_ciclo_id === periodoId
    )
    .reduce(
      (total, item) =>
        total +
        numero(
          item.costo_estimado_ars_periodo
        ),
      0
    )
}

function costoPeriodoTotal(
  insumos: InsumoPeriodo[],
  periodo: PeriodoRiego
) {
  const costoNutricion =
    costoNutricionPeriodo(
      insumos,
      periodo.periodo_ciclo_id
    )

  const costoAgua =
    numero(periodo.litros_periodo_sala) *
    COSTO_AGUA_DEFAULT_ARS_L

  return costoNutricion + costoAgua
}

function ordenarInsumos(
  items: InsumoPeriodo[]
) {
  const prioridad = (nombre: string) => {
    const n = nombre.toLowerCase()

    if (n.includes('calmag')) return 10
    if (n === 'sensi a') return 20
    if (n === 'sensi b') return 30
    if (n.includes('big bud')) return 40
    if (n.includes('bud candy')) return 50
    if (n.includes('overdrive')) return 60
    if (n.includes('flawless')) return 70

    return 100
  }

  return [...items].sort(
    (a, b) =>
      prioridad(a.insumo) -
      prioridad(b.insumo)
  )
}

function agruparInsumos(
  items: InsumoPeriodo[]
): ResumenInsumo[] {
  const mapa = new Map<
    string,
    ResumenInsumo
  >()

  for (const item of items) {
    const actual =
      mapa.get(item.insumo) ?? {
        nombre: item.insumo,
        categoria: item.categoria,
        consumoMl: 0,
        costo: 0,
        periodos: 0,
      }

    actual.consumoMl += numero(
      item.consumo_estimado_ml_periodo
    )
    actual.costo += numero(
      item.costo_estimado_ars_periodo
    )
    actual.periodos += 1

    mapa.set(item.insumo, actual)
  }

  return ordenarResumen([
    ...mapa.values(),
  ])
}

function ordenarResumen(
  items: ResumenInsumo[]
) {
  const prioridad = (nombre: string) => {
    const n = nombre.toLowerCase()

    if (n.includes('calmag')) return 10
    if (n === 'sensi a') return 20
    if (n === 'sensi b') return 30
    if (n.includes('big bud')) return 40
    if (n.includes('bud candy')) return 50
    if (n.includes('overdrive')) return 60
    if (n.includes('flawless')) return 70

    return 100
  }

  return [...items].sort(
    (a, b) =>
      prioridad(a.nombre) -
      prioridad(b.nombre)
  )
}

function etiquetaCategoria(
  categoria: string
) {
  if (categoria === 'CalMag') {
    return 'Calcio + magnesio'
  }

  if (categoria === 'Base') {
    return 'Base'
  }

  if (categoria === 'Aditivo') {
    return 'Aditivo'
  }

  if (categoria === 'Finalizador') {
    return 'Finalización'
  }

  return categoria
}

function phLabel(
  periodo:
    | Pick<
        PeriodoRiego,
        | 'ph_objetivo_min'
        | 'ph_objetivo_max'
      >
    | null
    | undefined
) {
  if (!periodo) return '—'

  const minimo =
    periodo.ph_objetivo_min === null
      ? null
      : numero(periodo.ph_objetivo_min)

  const maximo =
    periodo.ph_objetivo_max === null
      ? null
      : numero(periodo.ph_objetivo_max)

  if (
    minimo !== null &&
    maximo !== null &&
    minimo === maximo
  ) {
    return formatear(minimo)
  }

  if (
    minimo !== null &&
    maximo !== null
  ) {
    return `${formatear(
      minimo
    )}–${formatear(maximo)}`
  }

  if (minimo !== null) {
    return `≥ ${formatear(minimo)}`
  }

  if (maximo !== null) {
    return `≤ ${formatear(maximo)}`
  }

  return '—'
}

function numero(valor: unknown) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

function numeroPositivoONull(
  valor: string
) {
  if (!valor.trim()) return null

  const n = Number(
    valor.replace(',', '.')
  )

  return Number.isFinite(n) && n > 0
    ? n
    : null
}

function enteroPositivoONull(
  valor: string
) {
  if (!valor.trim()) return null

  const n = Number(valor)

  return Number.isInteger(n) && n > 0
    ? n
    : null
}

function formatear(valor: number) {
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 2,
  }).format(valor)
}

function moneda(valor: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor)
}

function formatoConsumo(ml: number) {
  if (ml >= 1000) {
    return `${formatear(
      ml / 1000
    )} L`
  }

  return `${formatear(ml)} ml`
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

  const e = error as {
    message?: string
    details?: string
    hint?: string
    code?: string
  }

  const partes = [
    e.message,
    e.details,
    e.hint,
    e.code ? `Código ${e.code}` : '',
  ].filter(Boolean)

  return partes.length
    ? partes.join(' · ')
    : fallback
}
