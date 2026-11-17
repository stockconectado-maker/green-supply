'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  meta_produccion_g: number | string | null
  rendimiento_objetivo_g_m2: number | string | null
  superficie_objetivo_m2: number | string | null
}

type Produccion = {
  produccion_id: number
  ciclo_id: number
  sala_id: number
  sala: string
  numero_ciclo: number
  codigo_cosecha: string
  estado_ciclo: string
  genetica_id: number
  genetica: string
  plantas_reales: number
  fecha_corte: string | null
  peso_humedo_g: number | string | null
  fecha_fin_secado: string | null
  peso_seco_g: number | string | null
  peso_seco_kg: number | string | null
  dias_secado: number | null
  merma_humedo_seco_pct: number | string | null
  gramos_secos_por_planta: number | string | null
  estado:
    | 'Por cosechar'
    | 'Secando'
    | 'Listo para cerrar'
    | 'Cerrada'
  lote_id: number | null
  codigo_lote: string | null
  observaciones: string | null
  cerrado_at: string | null
}

type ProduccionForm = {
  fecha_corte: string
  peso_humedo_g: string
  fecha_fin_secado: string
  peso_seco_g: string
  observaciones: string
}

type IngresoParcial = {
  id: number
  produccion_id: number
  lote_id: number
  cantidad_g: number | string
  fecha_ingreso: string
  observaciones: string | null
  lotes?: { codigo_lote: string } | null
}

type Props = {
  salaId: number
  salaNombre?: string
}

export default function Produccion({
  salaId,
  salaNombre,
}: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ciclo, setCiclo] =
    useState<CicloResumen | null>(null)
  const [producciones, setProducciones] =
    useState<Produccion[]>([])
  const [forms, setForms] = useState<
    Record<number, ProduccionForm>
  >({})
  const [guardando, setGuardando] = useState<
    Record<number, boolean>
  >({})
  const [cerrandoId, setCerrandoId] =
    useState<number | null>(null)
  const [ciclosDisponibles, setCiclosDisponibles] = useState<CicloResumen[]>([])
  const [cicloSeleccionadoId, setCicloSeleccionadoId] = useState<number | null>(null)
  const [ingresos, setIngresos] = useState<IngresoParcial[]>([])
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<Record<number, string>>({})

  useEffect(() => {
    setCicloSeleccionadoId(null)
  }, [salaId])

  useEffect(() => {
    void cargar()
  }, [salaId, cicloSeleccionadoId])

  async function cargar() {
    setCargando(true)
    setError('')

    const ciclosRes = await supabase
      .from('vista_ciclos_cultivo')
      .select('*')
      .eq('sala_id', salaId)
      .order('ciclo_id', { ascending: false })

    if (ciclosRes.error) {
      setError(describirErrorSupabase(ciclosRes.error, 'No se pudieron cargar los ciclos.'))
      setCargando(false)
      return
    }

    const ciclosSala = (ciclosRes.data ?? []) as CicloResumen[]
    const produccionesRes = await supabase
      .from('vista_producciones_ciclo')
      .select('ciclo_id, estado')
      .eq('sala_id', salaId)

    if (produccionesRes.error) {
      setError(describirErrorSupabase(produccionesRes.error, 'No se pudieron localizar las producciones.'))
      setCargando(false)
      return
    }

    const idsPendientes = new Set(
      (produccionesRes.data ?? [])
        .filter((p) => p.estado !== 'Cerrada')
        .map((p) => Number(p.ciclo_id))
    )
    const elegibles = ciclosSala.filter(
      (c) => c.estado === 'Activo' || idsPendientes.has(c.ciclo_id)
    )
    setCiclosDisponibles(elegibles)
    const cicloActual = elegibles.find((c) => c.ciclo_id === cicloSeleccionadoId)
      ?? elegibles.find((c) => c.estado === 'Finalizado')
      ?? elegibles[0]
      ?? null
    setCicloSeleccionadoId(cicloActual?.ciclo_id ?? null)

    setCiclo(cicloActual)

    if (!cicloActual) {
      setProducciones([])
      setForms({})
      setIngresos([])
      setCargando(false)
      return
    }

    const preparar = await supabase.rpc(
      'preparar_produccion_ciclo',
      {
        p_ciclo_id: cicloActual.ciclo_id,
      }
    )

    if (preparar.error) {
      setError(
        describirErrorSupabase(
          preparar.error,
          'No se pudo preparar la producción del ciclo.'
        )
      )
      setCargando(false)
      return
    }

    const resultado = await supabase
      .from('vista_producciones_ciclo')
      .select('*')
      .eq('ciclo_id', cicloActual.ciclo_id)
      .order('genetica')

    if (resultado.error) {
      setError(
        describirErrorSupabase(
          resultado.error,
          'No se pudo cargar la producción.'
        )
      )
      setCargando(false)
      return
    }

    const registros =
      (resultado.data ?? []) as Produccion[]

    setProducciones(registros)

    const ingresoRes = await supabase
      .from('produccion_ingresos')
      .select('id, produccion_id, lote_id, cantidad_g, fecha_ingreso, observaciones, lotes(codigo_lote)')
      .in('produccion_id', registros.map((p) => p.produccion_id).length
        ? registros.map((p) => p.produccion_id) : [-1])
      .order('id', { ascending: false })
    if (ingresoRes.error) {
      setError(describirErrorSupabase(ingresoRes.error, 'No se pudieron cargar los ingresos parciales.'))
    }
    setIngresos((ingresoRes.data ?? []) as unknown as IngresoParcial[])

    const hoy = fechaHoyLocal()
    const nuevosForms: Record<
      number,
      ProduccionForm
    > = {}

    for (const item of registros) {
      nuevosForms[item.produccion_id] = {
        fecha_corte:
          item.fecha_corte ??
          cicloActual.fecha_corte_planificada ??
          hoy,
        peso_humedo_g:
          item.peso_humedo_g === null
            ? ''
            : String(item.peso_humedo_g),
        fecha_fin_secado:
          item.fecha_fin_secado ?? hoy,
        peso_seco_g:
          '',
        observaciones:
          item.observaciones ?? '',
      }
    }

    setForms(nuevosForms)
    setCargando(false)
  }

  const totalPlantas = useMemo(
    () =>
      producciones.reduce(
        (total, item) =>
          total + numero(item.plantas_reales),
        0
      ),
    [producciones]
  )

  const pesoSecoTotal = useMemo(
    () =>
      producciones.reduce((total, item) => {
        const parciales = ingresos.filter((i) => i.produccion_id === item.produccion_id)
        return total + (parciales.length
          ? parciales.reduce((s, i) => s + numero(i.cantidad_g), 0)
          : item.lote_id ? numero(item.peso_seco_g) : 0)
      }, 0),
    [producciones, ingresos]
  )

  const cerradas = producciones.filter(
    (item) => item.estado === 'Cerrada'
  ).length

  const metaProduccion =
    numero(ciclo?.meta_produccion_g)

  const avance =
    metaProduccion > 0
      ? Math.min(
          100,
          (pesoSecoTotal / metaProduccion) * 100
        )
      : 0

  function actualizarForm(
    produccionId: number,
    campo: keyof ProduccionForm,
    valor: string
  ) {
    setForms((actual) => ({
      ...actual,
      [produccionId]: {
        ...(actual[produccionId] ?? formVacio()),
        [campo]: valor,
      },
    }))
  }

  async function guardarBorrador(
    item: Produccion,
    forzarFechas = false
  ) {
    const actual =
      forms[item.produccion_id] ?? formVacio()

    const pesoHumedo =
      numeroOpcionalPositivo(
        actual.peso_humedo_g
      )

    if (
      actual.peso_humedo_g.trim() &&
      pesoHumedo === null
    ) {
      setError(
        `${item.genetica}: el peso húmedo debe ser mayor a 0 o quedar vacío.`
      )
      return false
    }

    const fechaCorte =
      actual.fecha_corte ||
      (forzarFechas
        ? ciclo?.fecha_corte_planificada ??
          fechaHoyLocal()
        : null)

    const fechaFinSecado =
      actual.fecha_fin_secado ||
      (forzarFechas ? fechaHoyLocal() : null)

    if (
      fechaCorte &&
      fechaFinSecado &&
      fechaFinSecado < fechaCorte
    ) {
      setError(
        `${item.genetica}: la fecha final de secado no puede ser anterior a la fecha de corte.`
      )
      return false
    }

    setError('')
    setGuardando((actual) => ({
      ...actual,
      [item.produccion_id]: true,
    }))

    const resultado = await supabase
      .from('producciones_ciclo')
      .update({
        fecha_corte: fechaCorte,
        peso_humedo_g: pesoHumedo,
        fecha_fin_secado: actual.fecha_fin_secado ? fechaFinSecado : null,
        observaciones:
          actual.observaciones.trim() || null,
      })
      .eq('id', item.produccion_id)

    setGuardando((actual) => ({
      ...actual,
      [item.produccion_id]: false,
    }))

    if (resultado.error) {
      setError(
        describirErrorSupabase(
          resultado.error,
          `No se pudo guardar ${item.genetica}.`
        )
      )
      return false
    }

    // Reflejamos fechas forzadas en pantalla.
    if (forzarFechas) {
      setForms((anterior) => ({
        ...anterior,
        [item.produccion_id]: {
          ...actual,
          fecha_corte:
            fechaCorte ?? actual.fecha_corte,
          fecha_fin_secado:
            fechaFinSecado ??
            actual.fecha_fin_secado,
        },
      }))
    }

    return true
  }

  async function cerrarProduccion(
    item: Produccion
  ) {
    const form =
      forms[item.produccion_id] ?? formVacio()

    const pesoSeco =
      numeroOpcionalPositivo(
        form.peso_seco_g
      )

    if (pesoSeco === null) {
      setError(
        `${item.genetica}: ingresá los gramos de esta partida.`
      )
      return
    }

    const confirmar = window.confirm(
      `Registrar un ingreso de ${item.genetica} de ${formatearPeso(
        pesoSeco
      )} y generar un lote disponible en Stock?`
    )

    if (!confirmar) return

    setError('')
    setCerrandoId(item.produccion_id)

    const guardado = await guardarBorrador(
      item,
      true
    )

    if (!guardado) {
      setCerrandoId(null)
      return
    }

    const solicitudId = solicitudesPendientes[item.produccion_id] ?? crypto.randomUUID()
    setSolicitudesPendientes((prev) => ({ ...prev, [item.produccion_id]: solicitudId }))

    const resultado = await supabase.rpc(
      'registrar_ingreso_parcial_produccion',
      {
        p_produccion_id: item.produccion_id,
        p_cantidad_g: pesoSeco,
        p_solicitud_id: solicitudId,
        p_observaciones:
          form.observaciones.trim() || null,
      }
    )

    if (resultado.error) {
      setError(
        describirErrorSupabase(
          resultado.error,
          'No se pudo registrar el ingreso. No cambies la cantidad antes de reintentar.'
        )
      )
      setCerrandoId(null)
      return
    }

    setCerrandoId(null)
    setSolicitudesPendientes((prev) => {
      const copia = { ...prev }
      delete copia[item.produccion_id]
      return copia
    })
    await cargar()
  }

  async function cerrarProcesamiento(item: Produccion) {
    if (!window.confirm(`¿Finalizar definitivamente el procesamiento de ${item.genetica}? Después no se podrán registrar más partidas.`)) return
    setCerrandoId(item.produccion_id)
    setError('')
    const res = await supabase.rpc('cerrar_procesamiento_produccion', {
      p_produccion_id: item.produccion_id,
    })
    setCerrandoId(null)
    if (res.error) {
      setError(describirErrorSupabase(res.error, 'No se pudo cerrar el procesamiento.'))
      return
    }
    await cargar()
  }

  if (cargando) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
        <p className="text-base font-medium text-zinc-500">
          Cargando producción...
        </p>
      </section>
    )
  }

  if (!ciclo) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
            ⚖️
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950">
            Sin producción activa
          </h2>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Cuando exista un ciclo con genéticas
            asignadas, Producción se prepara
            automáticamente.
          </p>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      {error && <ErrorBox texto={error} />}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label htmlFor="ciclo-produccion" className="mb-2 block text-sm font-semibold text-zinc-700">
          Cosecha / ciclo de trabajo
        </label>
        <select
          id="ciclo-produccion"
          value={ciclo.ciclo_id}
          onChange={(e) => {
            setCicloSeleccionadoId(Number(e.target.value))
            // cargar() usa el identificador seleccionado de la proxima renderizacion.
          }}
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900"
        >
          {ciclosDisponibles.map((c) => (
            <option key={c.ciclo_id} value={c.ciclo_id}>
              {c.codigo_cosecha} · Ciclo {c.numero_ciclo} · {c.estado}
            </option>
          ))}
        </select>
        {ciclo.estado === 'Activo' && (
          <p className="mt-2 text-sm text-amber-700">
            Primero finalizá la cosecha en Cultivo. Los ingresos a Stock se habilitan después del corte.
          </p>
        )}
      </section>

      <CabeceraProduccion
        ciclo={ciclo}
        salaNombre={salaNombre}
        totalPlantas={totalPlantas}
        totalGeneticas={producciones.length}
        pesoSecoTotal={pesoSecoTotal}
        metaProduccion={metaProduccion}
        avance={avance}
        cerradas={cerradas}
      />

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-zinc-950">
              Carga por genética
            </h3>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
              Completá los datos directamente.
              Registrá cada partida procesada por separado. Cada ingreso confirmado
              genera un nuevo lote disponible en Stock.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <PillInfo
              texto={`${producciones.length} genética${
                producciones.length === 1
                  ? ''
                  : 's'
              }`}
            />
            <PillInfo
              texto={`${totalPlantas} plantas reales`}
            />
            <PillInfo
              texto={`${cerradas} lote${
                cerradas === 1 ? '' : 's'
              } cerrado${
                cerradas === 1 ? '' : 's'
              }`}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {producciones.map((item) => (
            <TarjetaGenetica
              key={item.produccion_id}
              item={item}
              form={
                forms[item.produccion_id] ??
                formVacio()
              }
              onChange={(campo, valor) =>
                actualizarForm(
                  item.produccion_id,
                  campo,
                  valor
                )
              }
              onBlur={() =>
                guardarBorrador(item)
              }
              onCerrar={() =>
                cerrarProduccion(item)
              }
              onFinalizar={() => cerrarProcesamiento(item)}
              ingresos={ingresos.filter((i) => i.produccion_id === item.produccion_id)}
              permiteIngresos={ciclo.estado === 'Finalizado'}
              guardando={
                Boolean(
                  guardando[
                    item.produccion_id
                  ]
                )
              }
              cerrando={
                cerrandoId ===
                item.produccion_id
              }
            />
          ))}

          {!producciones.length && (
            <div className="col-span-full rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-10 text-center">
              <p className="text-sm font-medium text-zinc-600">
                El ciclo todavía no tiene genéticas
                para producir.
              </p>
            </div>
          )}
        </div>
      </section>

      <ResumenCiclo
        producciones={producciones}
        metaProduccion={metaProduccion}
        ingresos={ingresos}
      />
    </div>
  )
}

function CabeceraProduccion({
  ciclo,
  salaNombre,
  totalPlantas,
  totalGeneticas,
  pesoSecoTotal,
  metaProduccion,
  avance,
  cerradas,
}: {
  ciclo: CicloResumen
  salaNombre?: string
  totalPlantas: number
  totalGeneticas: number
  pesoSecoTotal: number
  metaProduccion: number
  avance: number
  cerradas: number
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="flex min-h-[205px] flex-col justify-between rounded-3xl bg-zinc-950 p-6 text-white">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-emerald-300">
                Producción
              </span>

              <span className="text-sm font-semibold text-zinc-300">
                {salaNombre ??
                  `Sala ${ciclo.sala_id}`}
              </span>

              <span className="text-zinc-600">
                ·
              </span>

              <span className="font-mono text-xs font-semibold text-zinc-400">
                {ciclo.codigo_cosecha}
              </span>
            </div>

            <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              Producción del ciclo
            </h2>

            <p className="mt-3 text-base leading-6 text-zinc-300">
              <strong className="text-white">
                {totalPlantas} plantas reales
              </strong>
              {' · '}
              {totalGeneticas} genética
              {totalGeneticas === 1
                ? ''
                : 's'}
            </p>
          </div>

          <p className="mt-5 text-sm text-zinc-400">
            Cargá los datos por genética y cerrá
            cuando tengas el peso seco final.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Metrica
            titulo="Objetivo"
            valor={
              metaProduccion > 0
                ? formatearPeso(
                    metaProduccion
                  )
                : '—'
            }
            detalle="meta del ciclo"
          />

          <Metrica
            titulo="Peso seco"
            valor={
              pesoSecoTotal > 0
                ? formatearPeso(
                    pesoSecoTotal
                  )
                : '—'
            }
            detalle="registrado"
            destacada
          />

          <Metrica
            titulo="Cumplimiento"
            valor={
              metaProduccion > 0
                ? `${formatear(avance)}%`
                : '—'
            }
            detalle="sobre objetivo"
          />

          <Metrica
            titulo="Plantas"
            valor={String(totalPlantas)}
            detalle="ocupación real"
          />

          <Metrica
            titulo="Genéticas"
            valor={String(totalGeneticas)}
            detalle="carga separada"
          />

          <Metrica
            titulo="Lotes"
            valor={String(cerradas)}
            detalle="generados en Stock"
          />
        </div>
      </div>

      {metaProduccion > 0 && (
        <div className="border-t border-zinc-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-zinc-600">
              Avance de producción
            </span>

            <span className="font-semibold text-zinc-950">
              {formatearPeso(
                pesoSecoTotal
              )}{' '}
              /{' '}
              {formatearPeso(
                metaProduccion
              )}
            </span>
          </div>

          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(100, avance)
                )}%`,
              }}
            />
          </div>
        </div>
      )}
    </section>
  )
}

function TarjetaGenetica({
  item,
  form,
  onChange,
  onBlur,
  onCerrar,
  onFinalizar,
  ingresos,
  permiteIngresos,
  guardando,
  cerrando,
}: {
  item: Produccion
  form: ProduccionForm
  onChange: (
    campo: keyof ProduccionForm,
    valor: string
  ) => void
  onBlur: () => void
  onCerrar: () => void
  onFinalizar: () => void
  ingresos: IngresoParcial[]
  permiteIngresos: boolean
  guardando: boolean
  cerrando: boolean
}) {
  if (item.estado === 'Cerrada') {
    return (
      <article className="overflow-hidden rounded-3xl border border-emerald-200 bg-white">
        <div className="flex items-start justify-between gap-4 bg-emerald-50/70 px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xl font-semibold tracking-tight text-zinc-950">
                {item.genetica}
              </h4>

              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Cerrada
              </span>
            </div>

            <p className="mt-1 text-sm text-zinc-500">
              {item.plantas_reales}{' '}
              plantas reales
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-700">
              Lote
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-emerald-950">
              {item.codigo_lote ?? `${ingresos.length} lotes`}
            </p>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-3">
          <DatoResultado
            titulo="Peso seco"
            valor={formatearPeso(
              numero(item.peso_seco_g)
            )}
          />

          <DatoResultado
            titulo="Por planta"
            valor={
              item.gramos_secos_por_planta !==
              null
                ? `${formatear(
                    numero(
                      item.gramos_secos_por_planta
                    )
                  )} g`
                : '—'
            }
          />

          <DatoResultado
            titulo="Días secado"
            valor={
              item.dias_secado !== null
                ? String(item.dias_secado)
                : '—'
            }
          />

        </div>

        <div className="border-t border-emerald-100 bg-emerald-50/40 px-5 py-3 text-sm font-medium text-emerald-800">
          Ingresado a Stock ·{' '}
          {formatearPeso(
            numero(item.peso_seco_g)
          )}
        </div>
      </article>
    )
  }

  const pesoSeco =
    numeroOpcionalPositivo(
      form.peso_seco_g
    )

  const listo = pesoSeco !== null && permiteIngresos

  const pesoHumedo =
    numeroOpcionalPositivo(
      form.peso_humedo_g
    )

  const porPlanta =
    pesoSeco !== null &&
    item.plantas_reales > 0
      ? pesoSeco / item.plantas_reales
      : null

  return (
    <article
      className={`overflow-hidden rounded-3xl border bg-white transition ${
        listo
          ? 'border-emerald-200 shadow-sm'
          : 'border-zinc-200'
      }`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-zinc-100 bg-zinc-50/60 px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xl font-semibold tracking-tight text-zinc-950">
              {item.genetica}
            </h4>
          </div>

          <p className="mt-1 text-sm text-zinc-500">
            <strong className="font-semibold text-zinc-800">
              {item.plantas_reales}
            </strong>{' '}
            plantas reales
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-zinc-400">
            Guardado
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              guardando
                ? 'text-amber-600'
                : 'text-emerald-700'
            }`}
          >
            {guardando
              ? 'Guardando...'
              : 'Automático'}
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo
            label="Fecha de corte"
            type="date"
            value={form.fecha_corte}
            onChange={(valor) =>
              onChange(
                'fecha_corte',
                valor
              )
            }
            onBlur={onBlur}
          />

          <Campo
            label="Último día de secado"
            type="date"
            value={form.fecha_fin_secado}
            onChange={(valor) =>
              onChange(
                'fecha_fin_secado',
                valor
              )
            }
            onBlur={onBlur}
          />

          <CampoPeso
            label="Peso húmedo"
            ayuda="Opcional"
            value={form.peso_humedo_g}
            onChange={(valor) =>
              onChange(
                'peso_humedo_g',
                valor
              )
            }
            onBlur={onBlur}
          />

          <CampoPeso
            label="Gramos de esta partida"
            ayuda="Cada confirmación crea un lote nuevo"
            value={form.peso_seco_g}
            onChange={(valor) =>
              onChange(
                'peso_seco_g',
                valor
              )
            }
            onBlur={onBlur}
            requerido
          />
        </div>

        <label className="mt-3 block">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-zinc-700">
              Observación
            </span>
            <span className="text-xs text-zinc-400">
              opcional
            </span>
          </div>

          <input
            type="text"
            value={form.observaciones}
            onChange={(event) =>
              onChange(
                'observaciones',
                event.target.value
              )
            }
            onBlur={onBlur}
            placeholder="Nota breve de esta genética"
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniResultado
            titulo="Seco / planta"
            valor={
              porPlanta !== null
                ? `${formatear(
                    porPlanta
                  )} g`
                : '—'
            }
          />

          <MiniResultado
            titulo="Peso seco"
            valor={
              pesoSeco !== null
                ? formatearPeso(
                    pesoSeco
                  )
                : 'Sin partida cargada'
            }
            destacado={listo}
          />
        </div>
      </div>

      <div
        className={`flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
          listo
            ? 'border-emerald-100 bg-emerald-50/50'
            : 'border-zinc-100 bg-zinc-50/60'
        }`}
      >
        <div>
          <p className="text-sm font-semibold text-zinc-800">
            {listo
              ? `Partida a ingresar: ${formatearPeso(pesoSeco ?? 0)}`
              : 'Ingresá los gramos de la próxima partida'}
          </p>

          <p className="mt-0.5 text-xs text-zinc-500">
            Cada partida genera un lote independiente. El cierre final se realiza por separado.
          </p>
        </div>

        <button
          type="button"
          onClick={onCerrar}
          disabled={!listo || cerrando || guardando}
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
        >
          {cerrando
            ? 'Generando lote...'
            : 'Ingresar a Stock'}
        </button>
      </div>
      <div className="border-t border-zinc-100 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-zinc-800">Ingresos confirmados</p>
            <p className="text-xs text-zinc-500">
              {ingresos.length} partidas · {formatearPeso(ingresos.reduce((s, i) => s + numero(i.cantidad_g), 0))}
            </p>
          </div>
          <button type="button" onClick={onFinalizar}
            disabled={cerrando || guardando || ingresos.length === 0}
            className="rounded-xl border border-emerald-700 px-4 py-2 text-xs font-semibold text-emerald-800 disabled:opacity-40">
            Finalizar procesamiento
          </button>
        </div>
        {ingresos.length > 0 && (
          <ul className="mt-3 space-y-2">
            {ingresos.map((i) => (
              <li key={i.id} className="flex justify-between rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                <span>{i.fecha_ingreso} · {i.lotes?.codigo_lote ?? `Lote #${i.lote_id}`}</span>
                <strong>{formatearPeso(numero(i.cantidad_g))}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

function ResumenCiclo({
  producciones,
  metaProduccion,
  ingresos,
}: {
  producciones: Produccion[]
  metaProduccion: number
  ingresos: IngresoParcial[]
}) {
  const pesoSeco = producciones.reduce(
    (total, item) => {
      const parciales = ingresos.filter((i) => i.produccion_id === item.produccion_id)
      return total + (parciales.length
        ? parciales.reduce((s, i) => s + numero(i.cantidad_g), 0)
        : item.lote_id ? numero(item.peso_seco_g) : 0)
    },
    0
  )

  const plantas = producciones.reduce(
    (total, item) =>
      total + numero(item.plantas_reales),
    0
  )

  const cerradas = producciones.filter(
    (item) => item.estado === 'Cerrada'
  ).length

  const diferencia =
    metaProduccion > 0
      ? pesoSeco - metaProduccion
      : 0

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-zinc-950">
            Resultado del ciclo
          </h3>

          <p className="mt-1 text-sm text-zinc-500">
            Se actualiza automáticamente con cada
            genética.
          </p>
        </div>

        <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-600">
          {cerradas}/{producciones.length}{' '}
          genéticas finalizadas
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <DatoGrande
          titulo="Objetivo"
          valor={
            metaProduccion > 0
              ? formatearPeso(
                  metaProduccion
                )
              : '—'
          }
        />

        <DatoGrande
          titulo="Peso seco"
          valor={
            pesoSeco > 0
              ? formatearPeso(pesoSeco)
              : '—'
          }
        />

        <DatoGrande
          titulo="Plantas reales"
          valor={String(plantas)}
        />

        <DatoGrande
          titulo="Promedio / planta"
          valor={
            pesoSeco > 0 && plantas > 0
              ? `${formatear(
                  pesoSeco / plantas
                )} g`
              : '—'
          }
        />

        <DatoGrande
          titulo="Vs. objetivo"
          valor={
            metaProduccion > 0 &&
            pesoSeco > 0
              ? `${diferencia >= 0 ? '+' : ''}${formatearPeso(
                  diferencia
                )}`
              : '—'
          }
        />
      </div>
    </section>
  )
}

function Campo({
  label,
  type,
  value,
  onChange,
  onBlur,
}: {
  label: string
  type: 'date'
  value: string
  onChange: (valor: string) => void
  onBlur: () => void
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-zinc-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        onBlur={onBlur}
        className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base font-medium text-zinc-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  )
}

function CampoPeso({
  label,
  ayuda,
  value,
  onChange,
  onBlur,
  requerido = false,
}: {
  label: string
  ayuda: string
  value: string
  onChange: (valor: string) => void
  onBlur: () => void
  requerido?: boolean
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-zinc-700">
          {label}
        </span>

        <span
          className={`text-xs font-semibold ${
            requerido
              ? 'text-emerald-700'
              : 'text-zinc-400'
          }`}
        >
          {ayuda}
        </span>
      </div>

      <div className="relative mt-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          onBlur={onBlur}
          placeholder={
            requerido
              ? 'Ej. 1500'
              : 'Opcional'
          }
          className={`w-full rounded-xl border bg-white px-4 py-3 pr-12 text-lg font-semibold text-zinc-950 outline-none transition ${
            requerido
              ? 'border-emerald-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100'
              : 'border-zinc-200 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100'
          }`}
        />

        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">
          g
        </span>
      </div>
    </label>
  )
}

function Metrica({
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
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-zinc-200 bg-white'
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-[0.07em] ${
          destacada
            ? 'text-emerald-700'
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

function MiniResultado({
  titulo,
  valor,
  destacado = false,
}: {
  titulo: string
  valor: string
  destacado?: boolean
}) {
  return (
    <div
      className={`rounded-xl border px-3.5 py-3 ${
        destacado
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-zinc-200 bg-zinc-50/60'
      }`}
    >
      <p className="text-xs text-zinc-500">
        {titulo}
      </p>

      <p
        className={`mt-1 text-base font-semibold ${
          destacado
            ? 'text-emerald-800'
            : 'text-zinc-900'
        }`}
      >
        {valor}
      </p>
    </div>
  )
}

function DatoResultado({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-medium text-zinc-500">
        {titulo}
      </p>

      <p className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">
        {valor}
      </p>
    </div>
  )
}

function DatoGrande({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.07em] text-zinc-500">
        {titulo}
      </p>

      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
        {valor}
      </p>
    </div>
  )
}

function PillInfo({
  texto,
}: {
  texto: string
}) {
  return (
    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-semibold text-zinc-600">
      {texto}
    </span>
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

function formVacio(): ProduccionForm {
  return {
    fecha_corte: '',
    peso_humedo_g: '',
    fecha_fin_secado: '',
    peso_seco_g: '',
    observaciones: '',
  }
}

function fechaHoyLocal() {
  const hoy = new Date()
  const year = hoy.getFullYear()
  const month = String(
    hoy.getMonth() + 1
  ).padStart(2, '0')
  const day = String(
    hoy.getDate()
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function numero(valor: unknown) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

function numeroOpcionalPositivo(
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

function formatear(valor: number) {
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 1,
  }).format(valor)
}

function formatearPeso(
  gramos: number
) {
  if (!Number.isFinite(gramos)) {
    return '—'
  }

  if (Math.abs(gramos) >= 1000) {
    return `${new Intl.NumberFormat(
      'es-AR',
      {
        maximumFractionDigits: 2,
      }
    ).format(gramos / 1000)} kg`
  }

  return `${new Intl.NumberFormat(
    'es-AR',
    {
      maximumFractionDigits: 0,
    }
  ).format(gramos)} g`
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
