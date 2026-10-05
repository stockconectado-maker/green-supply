'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  salaId: number
  salaNombre: string
}

type HistorialFila = {
  ciclo_id: number
  sala_id: number
  numero_ciclo: number
  codigo_cosecha: string
  estado: string
  fecha_inicio: string
  fecha_inicio_floracion: string | null
  fecha_corte_planificada: string | null
  fecha_corte_real: string | null
  duracion_dias: number | null
  cantidad_total: number
  geneticas: string | null
  camas_utilizadas: number
  produccion_final_g: number | string
  lotes: string | null
  snapshot_id: number | null
  cerrado_at: string | null
  observaciones_cierre: string | null
  snapshot_guardado: boolean
}

export default function HistorialSala({
  salaId,
  salaNombre,
}: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [historial, setHistorial] =
    useState<HistorialFila[]>([])

  useEffect(() => {
    cargar()
  }, [salaId])

  async function cargar() {
    setCargando(true)
    setError('')

    const resultado = await supabase
      .from('vista_historial_sala')
      .select('*')
      .eq('sala_id', salaId)
      .order('fecha_corte_real', {
        ascending: false,
        nullsFirst: false,
      })

    if (resultado.error) {
      setError(
        describirError(
          resultado.error,
          'No se pudo cargar el historial de la sala.'
        )
      )
      setCargando(false)
      return
    }

    setHistorial(
      (resultado.data ?? []) as HistorialFila[]
    )

    setCargando(false)
  }

  const produccionHistorica = historial.reduce(
    (total, item) =>
      total + numero(item.produccion_final_g),
    0
  )

  if (cargando) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">
        Cargando historial...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-5 lg:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
            Historial
          </p>

          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                {salaNombre}
              </h2>

              <p className="mt-1 text-sm leading-5 text-zinc-500">
                Los ciclos aparecen automáticamente cuando se cierra toda su producción.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Indicador
                titulo="Ciclos"
                valor={String(historial.length)}
              />

              <Indicador
                titulo="Producción histórica"
                valor={formatearKg(produccionHistorica)}
              />
            </div>
          </div>
        </div>

        {!historial.length ? (
          <div className="px-5 py-12 text-center lg:px-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
              <IconoHistorial />
            </div>

            <p className="mt-4 text-sm font-semibold text-zinc-900">
              Todavía no hay cosechas finalizadas
            </p>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-zinc-500">
              Cuando en Producción se registre el peso seco final y se genere
              el último lote del ciclo, el cierre aparecerá acá automáticamente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {historial.map((item) => (
              <article
                key={item.ciclo_id}
                className="px-5 py-5 lg:px-6"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-zinc-950">
                        {item.codigo_cosecha}
                      </h3>

                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-emerald-700">
                        Finalizada
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-medium text-zinc-700">
                      {item.geneticas || 'Sin genética registrada'}
                    </p>
                  </div>

                  <div className="text-left lg:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                      Fin de cosecha
                    </p>

                    <p className="mt-1 text-sm font-semibold text-zinc-950">
                      {formatearFecha(item.fecha_corte_real)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                  <Metrica
                    titulo="Inicio"
                    valor={formatearFecha(item.fecha_inicio)}
                  />

                  <Metrica
                    titulo="Floración"
                    valor={formatearFecha(
                      item.fecha_inicio_floracion
                    )}
                  />

                  <Metrica
                    titulo="Duración"
                    valor={
                      item.duracion_dias
                        ? `${item.duracion_dias} días`
                        : '—'
                    }
                  />

                  <Metrica
                    titulo="Plantas"
                    valor={String(
                      item.cantidad_total ?? 0
                    )}
                  />

                  <Metrica
                    titulo="Peso seco"
                    valor={formatearKg(
                      numero(item.produccion_final_g)
                    )}
                    destacado
                  />

                  <Metrica
                    titulo="Lote"
                    valor={item.lotes || '—'}
                  />
                </div>

                {item.camas_utilizadas > 0 && (
                  <p className="mt-3 text-xs text-zinc-500">
                    {item.camas_utilizadas}{' '}
                    cama
                    {item.camas_utilizadas === 1
                      ? ''
                      : 's'}{' '}
                    utilizada
                    {item.camas_utilizadas === 1
                      ? ''
                      : 's'}
                    .
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Indicador({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div className="min-w-[120px] rounded-xl bg-zinc-50 px-3.5 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">
        {titulo}
      </p>

      <p className="mt-0.5 text-sm font-semibold text-zinc-900">
        {valor}
      </p>
    </div>
  )
}

function Metrica({
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
      className={`rounded-xl px-3.5 py-3 ${
        destacado
          ? 'bg-emerald-50'
          : 'bg-zinc-50'
      }`}
    >
      <p
        className={`text-[9px] font-bold uppercase tracking-[0.08em] ${
          destacado
            ? 'text-emerald-600'
            : 'text-zinc-400'
        }`}
      >
        {titulo}
      </p>

      <p
        className={`mt-1 truncate text-sm font-semibold ${
          destacado
            ? 'text-emerald-950'
            : 'text-zinc-900'
        }`}
      >
        {valor}
      </p>
    </div>
  )
}

function IconoHistorial() {
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
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function numero(valor: unknown) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

function formatearKg(gramos: number) {
  if (!gramos) return '0 kg'

  return `${new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 3,
  }).format(gramos / 1000)} kg`
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return '—'

  return new Intl.DateTimeFormat(
    'es-AR'
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
