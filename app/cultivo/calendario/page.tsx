'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Sala = {
  id: number
  nombre: string
  archivada: boolean | null
}

type Ciclo = {
  ciclo_id: number
  sala_id: number
  numero_ciclo: number | null
  estado: string | null
  etapa_actual: string | null
  cantidad_total: number | null
  camas_utilizadas: number | null
  semana_floracion: number | null
  dia_semana_floracion: number | null
  fecha_corte_planificada: string | null
  rendimiento_objetivo_g_m2: number | string | null
  superficie_objetivo_m2: number | string | null
  meta_produccion_g: number | string | null
}

type RelacionGenetica = {
  ciclo_id: number
  genetica_id: number
}

type Genetica = {
  id: number
  nombre: string
}

type Corte = {
  ciclo_id: number
  sala_id: number
  sala: string
  fecha: string
  etapa: string
  numero_ciclo: number | null
  plantas: number
  camas: number
  semana_floracion: number | null
  dia_semana_floracion: number | null
  peso_estimado_g: number
  geneticas: string[]
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function numero(valor: number | string | null | undefined) {
  if (valor === null || valor === undefined) return 0
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

function esActivo(valor: string | null) {
  return (valor ?? '').trim().toLowerCase() === 'activo'
}

function fechaClave(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function pesoEstimado(ciclo: Ciclo) {
  const meta = numero(ciclo.meta_produccion_g)
  if (meta > 0) return meta

  const rendimiento = numero(ciclo.rendimiento_objetivo_g_m2)
  const superficie = numero(ciclo.superficie_objetivo_m2)

  if (rendimiento > 0 && superficie > 0) {
    return rendimiento * superficie
  }

  return 0
}

function formatearPeso(gramos: number) {
  if (gramos >= 1000) {
    return `${new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(gramos / 1000)} kg`
  }

  return `${new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(gramos)} g`
}

function fechaLarga(valor: string) {
  const [y, m, d] = valor.split('-').map(Number)

  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(y, m - 1, d, 12))
}

function textoFloracion(corte: Corte) {
  if (!corte.semana_floracion) return corte.etapa

  const partes = [`Sem. ${corte.semana_floracion}`]
  if (corte.dia_semana_floracion) partes.push(`día ${corte.dia_semana_floracion}`)
  return partes.join(' · ')
}

export default function CalendarioCortesPage() {
  const supabase = useMemo(() => createClient(), [])
  const hoy = useMemo(() => new Date(), [])

  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth())
  const [cortes, setCortes] = useState<Corte[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')

    const [rs, rc] = await Promise.all([
      supabase.from('salas').select('id,nombre,archivada').order('nombre'),
      supabase.from('vista_ciclos_cultivo').select('*'),
    ])

    if (rs.error || rc.error) {
      console.error({ salas: rs.error, ciclos: rc.error })
      setError('No se pudo cargar el calendario de cortes.')
      setCargando(false)
      return
    }

    const salas = (rs.data ?? []) as Sala[]
    const ciclos = ((rc.data ?? []) as Ciclo[]).filter(
      (ciclo) => esActivo(ciclo.estado) && Boolean(ciclo.fecha_corte_planificada)
    )

    const idsCiclos = ciclos.map((ciclo) => ciclo.ciclo_id)
    let relaciones: RelacionGenetica[] = []
    let geneticas: Genetica[] = []

    if (idsCiclos.length > 0) {
      const [rr, rg] = await Promise.all([
        supabase
          .from('ciclo_geneticas')
          .select('ciclo_id,genetica_id')
          .in('ciclo_id', idsCiclos),
        supabase.from('geneticas').select('id,nombre'),
      ])

      if (!rr.error) relaciones = (rr.data ?? []) as RelacionGenetica[]
      if (!rg.error) geneticas = (rg.data ?? []) as Genetica[]
    }

    const nombreSala = new Map(
      salas.filter((sala) => !sala.archivada).map((sala) => [sala.id, sala.nombre])
    )

    const nombreGenetica = new Map(
      geneticas.map((genetica) => [genetica.id, genetica.nombre])
    )

    const geneticasPorCiclo = new Map<number, string[]>()

    for (const relacion of relaciones) {
      const nombre = nombreGenetica.get(relacion.genetica_id)
      if (!nombre) continue

      const lista = geneticasPorCiclo.get(relacion.ciclo_id) ?? []
      if (!lista.includes(nombre)) lista.push(nombre)
      geneticasPorCiclo.set(relacion.ciclo_id, lista)
    }

    const proximos: Corte[] = ciclos
      .filter((ciclo) => nombreSala.has(ciclo.sala_id))
      .map((ciclo) => ({
        ciclo_id: ciclo.ciclo_id,
        sala_id: ciclo.sala_id,
        sala: nombreSala.get(ciclo.sala_id) ?? `Sala ${ciclo.sala_id}`,
        fecha: String(ciclo.fecha_corte_planificada).slice(0, 10),
        etapa: ciclo.etapa_actual || 'En curso',
        numero_ciclo: ciclo.numero_ciclo,
        plantas: numero(ciclo.cantidad_total),
        camas: numero(ciclo.camas_utilizadas),
        semana_floracion: ciclo.semana_floracion,
        dia_semana_floracion: ciclo.dia_semana_floracion,
        peso_estimado_g: pesoEstimado(ciclo),
        geneticas: geneticasPorCiclo.get(ciclo.ciclo_id) ?? [],
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))

    setCortes(proximos)
    setCargando(false)
  }, [supabase])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const cortesMes = useMemo(
    () =>
      cortes.filter((corte) => {
        const [y, m] = corte.fecha.split('-').map(Number)
        return y === anio && m === mes + 1
      }),
    [cortes, anio, mes]
  )

  const totalEstimado = cortesMes.reduce(
    (total, corte) => total + corte.peso_estimado_g,
    0
  )

  const totalPlantas = cortesMes.reduce((total, corte) => total + corte.plantas, 0)
  const pesoPromedio = cortesMes.length > 0 ? totalEstimado / cortesMes.length : 0

  const cortesPorDia = useMemo(() => {
    const mapa = new Map<string, Corte[]>()

    for (const corte of cortesMes) {
      const actual = mapa.get(corte.fecha) ?? []
      actual.push(corte)
      mapa.set(corte.fecha, actual)
    }

    return mapa
  }, [cortesMes])

  const celdas = useMemo(() => {
    const primerDia = new Date(anio, mes, 1, 12)
    const diasMes = new Date(anio, mes + 1, 0, 12).getDate()
    const desplazamiento = (primerDia.getDay() + 6) % 7

    const resultado: Array<{ dia: number | null; fecha: string | null }> = []

    for (let i = 0; i < desplazamiento; i += 1) {
      resultado.push({ dia: null, fecha: null })
    }

    for (let dia = 1; dia <= diasMes; dia += 1) {
      resultado.push({ dia, fecha: fechaClave(anio, mes, dia) })
    }

    while (resultado.length % 7 !== 0) {
      resultado.push({ dia: null, fecha: null })
    }

    return resultado
  }, [anio, mes])

  function cambiarMes(delta: number) {
    const nueva = new Date(anio, mes + delta, 1, 12)
    setAnio(nueva.getFullYear())
    setMes(nueva.getMonth())
  }

  function irHoy() {
    setAnio(hoy.getFullYear())
    setMes(hoy.getMonth())
  }

  return (
    <main className="min-h-screen bg-[#f6f7f7] text-zinc-900">
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-7 lg:px-9 lg:py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/cultivo"
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 transition hover:text-zinc-950"
            >
              ← Volver a Cultivo
            </Link>

            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-[28px] font-semibold tracking-tight text-zinc-950 sm:text-[32px]">
                Calendario de cortes
              </h1>
              <span className="text-xs font-medium capitalize text-zinc-400">
                {MESES[mes]} {anio}
              </span>
            </div>

            <p className="mt-1 text-[12px] text-zinc-500">
              Fechas de corte y producción estimada combinando todas las salas activas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={irHoy}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
            >
              Hoy
            </button>

            <button
              type="button"
              onClick={() => void cargar()}
              disabled={cargando}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              Actualizar
            </button>
          </div>
        </header>

        <section className="mt-5 grid overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-2 lg:grid-cols-4">
          <Indicador
            titulo="Producción estimada"
            valor={cargando ? '—' : formatearPeso(totalEstimado)}
            detalle="Total del mes"
            destacado
          />
          <Indicador
            titulo="Cortes"
            valor={cargando ? '—' : String(cortesMes.length)}
            detalle="Salas programadas"
          />
          <Indicador
            titulo="Plantas"
            valor={cargando ? '—' : String(totalPlantas)}
            detalle="En esos ciclos"
          />
          <Indicador
            titulo="Promedio por corte"
            valor={cargando ? '—' : formatearPeso(pesoPromedio)}
            detalle="Estimación mensual"
          />
        </section>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
              <button
                type="button"
                onClick={() => cambiarMes(-1)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50"
                aria-label="Mes anterior"
              >
                ←
              </button>

              <p className="text-sm font-semibold capitalize text-zinc-950">
                {MESES[mes]} {anio}
              </p>

              <button
                type="button"
                onClick={() => cambiarMes(1)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50"
                aria-label="Mes siguiente"
              >
                →
              </button>
            </div>

            <div className="hidden md:block">
              <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/80">
                {DIAS.map((dia) => (
                  <div
                    key={dia}
                    className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-[.08em] text-zinc-400"
                  >
                    {dia}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {celdas.map((celda, index) => {
                  const delDia = celda.fecha ? cortesPorDia.get(celda.fecha) ?? [] : []
                  const esHoy =
                    celda.fecha ===
                    fechaClave(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

                  return (
                    <div
                      key={`${celda.fecha ?? 'vacio'}-${index}`}
                      className={`min-h-[102px] border-b border-r border-zinc-100 p-2 ${
                        celda.dia === null ? 'bg-zinc-50/40' : 'bg-white'
                      }`}
                    >
                      {celda.dia !== null && (
                        <>
                          <div
                            className={`mb-1.5 grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold ${
                              esHoy ? 'bg-zinc-950 text-white' : 'text-zinc-500'
                            }`}
                          >
                            {celda.dia}
                          </div>

                          <div className="space-y-1.5">
                            {delDia.slice(0, 2).map((corte) => (
                              <Link
                                key={corte.ciclo_id}
                                href={`/cultivo/salas/${corte.sala_id}`}
                                className="block rounded-md border border-emerald-100 bg-emerald-50/70 px-2 py-1.5 transition hover:border-emerald-200 hover:bg-emerald-50"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-[10px] font-semibold text-zinc-900">
                                    {corte.sala}
                                  </p>
                                  <span className="shrink-0 text-[9px] font-bold text-emerald-700">
                                    {corte.peso_estimado_g > 0
                                      ? formatearPeso(corte.peso_estimado_g)
                                      : '—'}
                                  </span>
                                </div>

                                <p className="mt-0.5 truncate text-[9px] text-zinc-500">
                                  {corte.plantas > 0 ? `${corte.plantas} plantas` : textoFloracion(corte)}
                                </p>
                              </Link>
                            ))}

                            {delDia.length > 2 && (
                              <p className="px-1 text-[9px] font-semibold text-zinc-400">
                                +{delDia.length - 2} corte{delDia.length - 2 === 1 ? '' : 's'}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="md:hidden">
              {cargando ? (
                <div className="p-7 text-center text-sm text-zinc-500">Cargando cortes...</div>
              ) : cortesMes.length === 0 ? (
                <div className="p-7 text-center text-sm text-zinc-500">
                  No hay cortes previstos este mes.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {cortesMes.map((corte) => (
                    <Link
                      key={corte.ciclo_id}
                      href={`/cultivo/salas/${corte.sala_id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-zinc-50"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold capitalize text-emerald-700">
                          {fechaLarga(corte.fecha)}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
                          {corte.sala}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                          {textoFloracion(corte)}
                          {corte.geneticas.length > 0 ? ` · ${corte.geneticas.join(', ')}` : ''}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-zinc-950">
                          {corte.peso_estimado_g > 0
                            ? formatearPeso(corte.peso_estimado_g)
                            : '—'}
                        </p>
                        <p className="mt-0.5 text-[9px] text-zinc-400">
                          {corte.plantas > 0 ? `${corte.plantas} plantas` : 'estimado'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="rounded-xl border border-zinc-200 bg-white p-4 xl:self-start">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.1em] text-zinc-400">
                  Agenda del mes
                </p>
                <h2 className="mt-1 text-base font-semibold text-zinc-950">
                  Próximos cortes
                </h2>
              </div>

              <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                {cortesMes.length}
              </span>
            </div>

            {cargando ? (
              <p className="mt-5 text-xs text-zinc-500">Cargando...</p>
            ) : cortesMes.length === 0 ? (
              <div className="mt-5 rounded-lg bg-zinc-50 px-3.5 py-4 text-xs text-zinc-500">
                No hay cortes programados este mes.
              </div>
            ) : (
              <div className="mt-3 divide-y divide-zinc-100">
                {cortesMes.map((corte) => (
                  <article key={`agenda-${corte.ciclo_id}`} className="py-3.5 first:pt-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold capitalize text-emerald-700">
                          {fechaLarga(corte.fecha)}
                        </p>
                        <Link
                          href={`/cultivo/salas/${corte.sala_id}`}
                          className="mt-0.5 block truncate text-sm font-semibold text-zinc-950 hover:text-emerald-800"
                        >
                          {corte.sala}
                        </Link>
                      </div>

                      <strong className="shrink-0 text-sm font-semibold text-zinc-950">
                        {corte.peso_estimado_g > 0
                          ? formatearPeso(corte.peso_estimado_g)
                          : '—'}
                      </strong>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-500">
                      {corte.numero_ciclo != null && <span>Ciclo {corte.numero_ciclo}</span>}
                      {corte.plantas > 0 && <span>{corte.plantas} plantas</span>}
                      {corte.camas > 0 && <span>{corte.camas} camas</span>}
                      <span>{textoFloracion(corte)}</span>
                    </div>

                    {corte.geneticas.length > 0 && (
                      <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-zinc-400">
                        {corte.geneticas.join(' · ')}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}

function Indicador({
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
    <div className="border-b border-zinc-100 px-4 py-4 last:border-b-0 sm:border-r sm:px-5 lg:border-b-0 lg:last:border-r-0">
      <p className="text-[10px] font-medium text-zinc-500">{titulo}</p>
      <p
        className={`mt-1 text-[22px] font-semibold leading-none tracking-tight ${
          destacado ? 'text-emerald-700' : 'text-zinc-950'
        }`}
      >
        {valor}
      </p>
      <p className="mt-1.5 text-[10px] text-zinc-400">{detalle}</p>
    </div>
  )
}
