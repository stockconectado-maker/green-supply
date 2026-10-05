
'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Sala = {
  id: number
  nombre: string
  tipo: string | null
  estado: string | null
  superficie_productiva: number | string | null
  capacidad_maxima: number | null
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
  fecha_inicio: string | null
}

type SalaVista = Sala & {
  ciclo: Ciclo | null
  geneticas: string[]
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 1,
  }).format(n)

function fecha(valor: string | null) {
  if (!valor) return null

  const [y, m, d] = valor
    .substring(0, 10)
    .split('-')
    .map(Number)

  if (!y || !m || !d) return null

  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(y, m - 1, d, 12))
}

function numero(valor: number | string | null | undefined) {
  if (valor === null || valor === undefined) return 0
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

function esActivo(valor: string | null) {
  return (valor ?? '').trim().toLowerCase() === 'activo'
}

export default function CultivoPage() {
  const supabase = useMemo(() => createClient(), [])

  const [salas, setSalas] = useState<SalaVista[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [buscar, setBuscar] = useState('')
  const [filtro, setFiltro] = useState<
    'actuales' | 'todas' | 'archivadas'
  >('actuales')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    setAviso('')

    try {
      const [rs, rc] = await Promise.all([
        supabase
          .from('salas')
          .select(
            'id,nombre,tipo,estado,superficie_productiva,capacidad_maxima,archivada'
          )
          .order('nombre'),

        supabase
          .from('vista_ciclos_cultivo')
          .select('*'),
      ])

      if (rs.error) throw rs.error
      if (rc.error) throw rc.error

      const base = (rs.data ?? []) as Sala[]
      const activos = ((rc.data ?? []) as Ciclo[])
        .filter((c) => esActivo(c.estado))

      const porSala = new Map<number, Ciclo>()
      let duplicados = false

      for (const ciclo of activos) {
        if (porSala.has(ciclo.sala_id)) {
          duplicados = true
        } else {
          porSala.set(ciclo.sala_id, ciclo)
        }
      }

      if (duplicados) {
        setAviso(
          'Se detectaron salas con varios ciclos activos. Revisá sus registros.'
        )
      }

      const nombresPorCiclo = new Map<number, string[]>()
      const ids = [...new Set(activos.map((c) => c.ciclo_id))]

      if (ids.length) {
        const [rv, rg] = await Promise.all([
          supabase
            .from('ciclo_geneticas')
            .select('ciclo_id,genetica_id')
            .in('ciclo_id', ids),

          supabase
            .from('geneticas')
            .select('id,nombre'),
        ])

        if (rv.error || rg.error) {
          setAviso((anterior) =>
            [
              anterior,
              'No se pudieron cargar todas las genéticas.',
            ].filter(Boolean).join(' ')
          )
        } else {
          const catalogo = new Map(
            (rg.data ?? []).map((g) => [
              Number(g.id),
              String(g.nombre ?? ''),
            ])
          )

          for (const relacion of rv.data ?? []) {
            const nombre = catalogo.get(
              Number(relacion.genetica_id)
            )
            if (!nombre) continue

            const id = Number(relacion.ciclo_id)
            const lista = nombresPorCiclo.get(id) ?? []

            if (!lista.includes(nombre)) lista.push(nombre)
            nombresPorCiclo.set(id, lista)
          }
        }
      }

      setSalas(
        base.map((sala) => {
          const ciclo = porSala.get(sala.id) ?? null

          return {
            ...sala,
            ciclo,
            geneticas: ciclo
              ? nombresPorCiclo.get(ciclo.ciclo_id) ?? []
              : [],
          }
        })
      )
    } catch (e) {
      console.error(e)
      setError(
        'No fue posible cargar las salas. Revisá la conexión y las consultas de Supabase.'
      )
    } finally {
      setCargando(false)
    }
  }, [supabase])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const actuales = salas.filter((s) => !s.archivada)
  const enCurso = actuales.filter((s) => s.ciclo !== null)

  const plantas = enCurso.reduce(
    (total, sala) =>
      total + numero(sala.ciclo?.cantidad_total),
    0
  )

  const capacidad = actuales.reduce(
    (total, sala) =>
      total + numero(sala.capacidad_maxima),
    0
  )

  const visibles = salas.filter((s) => {
    if (filtro === 'actuales' && s.archivada) return false
    if (filtro === 'archivadas' && !s.archivada) return false

    const texto = [
      s.nombre,
      s.tipo ?? '',
      s.ciclo?.etapa_actual ?? '',
      ...s.geneticas,
    ].join(' ').toLowerCase()

    return texto.includes(buscar.trim().toLowerCase())
  })

  return (
    <main className="min-h-screen bg-[#f6f7f7] text-zinc-900">
      <div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-7 lg:px-9 lg:py-9">

        {/* CABECERA */}

        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.15em]">
              <span className="text-emerald-700">Green Supply</span>
              <span className="text-zinc-300">/</span>
              <span className="text-zinc-400">Producción</span>
            </div>

            <h1 className="text-[30px] font-semibold tracking-tight text-zinc-950 sm:text-[34px]">
              Cultivo
            </h1>

            <p className="mt-1 text-[13px] text-zinc-500">
              Control general de salas y ciclos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void cargar()}
              disabled={cargando}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              Actualizar
            </button>

            <Link
              href="/cultivo/salas/nueva"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-zinc-800"
            >
              <span className="text-base leading-none">+</span>
              Nueva sala
            </Link>
          </div>
        </header>

        {/* RESUMEN COMPACTO */}

        <section className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            <Indicador
              titulo="Salas"
              valor={cargando ? '—' : String(actuales.length)}
              detalle="Registradas"
            />
            <Indicador
              titulo="Ciclos activos"
              valor={cargando ? '—' : String(enCurso.length)}
              detalle="En desarrollo"
            />
            <Indicador
              titulo="Plantas"
              valor={cargando ? '—' : fmt(plantas)}
              detalle="En ciclos activos"
              destacado
            />
            <Indicador
              titulo="Capacidad"
              valor={cargando ? '—' : fmt(capacidad)}
              detalle="Total registrada"
            />
          </div>
        </section>

        {/* MENSAJES */}

        {error && (
          <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {aviso && (
          <div role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {aviso}
          </div>
        )}

        {/* CONTROLES */}

        <section className="mt-9">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
                Salas de cultivo
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Estado operativo y acceso a cada sala.
              </p>
            </div>

            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <input
                aria-label="Buscar salas"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Buscar sala..."
                className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-[13px] outline-none focus:border-emerald-500 sm:w-48"
              />

              <select
                aria-label="Filtrar salas"
                value={filtro}
                onChange={(e) =>
                  setFiltro(e.target.value as typeof filtro)
                }
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-emerald-500"
              >
                <option value="actuales">Actuales</option>
                <option value="todas">Todas</option>
                <option value="archivadas">Archivadas</option>
              </select>
            </div>
          </div>

          {/* LISTADO */}

          {cargando ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-14 text-center text-sm text-zinc-500">
              Cargando salas...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
              No se pudo mostrar la información.
            </div>
          ) : visibles.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
              No hay salas para mostrar.
            </div>
          ) : (
            <div className="space-y-3">
              {visibles.map((sala) => (
                <FilaSala key={sala.id} sala={sala} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

/* INDICADORES */

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
    <div className="border-b border-r border-zinc-100 px-5 py-5 last:border-r-0 sm:px-6">
      <p className="text-[11px] font-medium text-zinc-500">
        {titulo}
      </p>

      <p className={`mt-1.5 text-[28px] font-semibold leading-none tracking-tight ${
        destacado ? 'text-emerald-700' : 'text-zinc-950'
      }`}>
        {valor}
      </p>

      <p className="mt-2 text-[11px] text-zinc-400">
        {detalle}
      </p>
    </div>
  )
}

/* SALA HORIZONTAL */

function FilaSala({ sala }: { sala: SalaVista }) {
  const ciclo = sala.ciclo
  const plantas = ciclo?.cantidad_total
  const capacidad = numero(sala.capacidad_maxima)

  const ocupacion =
    ciclo && plantas !== null && plantas !== undefined && capacidad > 0
      ? Math.round((numero(plantas) / capacidad) * 100)
      : null

  const semana =
    ciclo?.semana_floracion != null &&
    ciclo.semana_floracion > 0
      ? `Semana ${ciclo.semana_floracion}`
      : null

  const dia =
    ciclo?.dia_semana_floracion != null &&
    ciclo.dia_semana_floracion > 0
      ? `Día ${ciclo.dia_semana_floracion}`
      : null

  return (
    <article className="group overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:border-emerald-200 hover:shadow-sm">

      <div className="flex flex-col xl:flex-row">

        {/* IDENTIDAD */}

        <div className="min-w-0 border-b border-zinc-100 p-5 xl:w-[255px] xl:shrink-0 xl:border-b-0 xl:border-r xl:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${
                  sala.archivada
                    ? 'bg-zinc-300'
                    : ciclo
                      ? 'bg-emerald-500'
                      : 'bg-amber-400'
                }`} />

                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {sala.archivada
                    ? 'Archivada'
                    : ciclo
                      ? 'Ciclo activo'
                      : 'Sin ciclo activo'}
                </span>
              </div>

              <h3 className="mt-2 truncate text-xl font-semibold tracking-tight text-zinc-950">
                {sala.nombre}
              </h3>

              <p className="mt-1 text-xs text-zinc-500">
                {sala.tipo || 'Sala'}
                {sala.estado ? ` · ${sala.estado}` : ''}
              </p>
            </div>
          </div>

          {ciclo?.numero_ciclo != null && (
            <p className="mt-4 text-[11px] text-zinc-400">
              Ciclo {ciclo.numero_ciclo}
            </p>
          )}
        </div>

        {/* OPERACIÓN */}

        <div className="min-w-0 flex-1 p-5 xl:px-6 xl:py-5">

          {ciclo ? (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[15px] font-semibold text-zinc-900">
                  {ciclo.etapa_actual || 'Etapa no registrada'}
                </span>

                {(semana || dia) && (
                  <span className="text-[12px] font-medium text-emerald-700">
                    {[semana, dia].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <Dato
                  titulo="Plantas"
                  valor={
                    plantas == null
                      ? '—'
                      : fmt(numero(plantas))
                  }
                  detalle={
                    capacidad > 0
                      ? `de ${fmt(capacidad)} posibles`
                      : undefined
                  }
                />

                <Dato
                  titulo="Camas utilizadas"
                  valor={
                    ciclo.camas_utilizadas == null
                      ? '—'
                      : String(ciclo.camas_utilizadas)
                  }
                />

                <Dato
                  titulo="Corte previsto"
                  valor={
                    fecha(ciclo.fecha_corte_planificada) ?? 'Sin fecha'
                  }
                />
              </div>

              {/* BARRA DE OCUPACIÓN */}

              {ocupacion !== null && (
                <div className="mt-5 max-w-xl">
                  <div className="mb-2 flex justify-between text-[11px]">
                    <span className="text-zinc-500">
                      Ocupación de la sala
                    </span>
                    <span className="font-semibold text-zinc-700">
                      {ocupacion}%
                    </span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={`h-full rounded-full ${
                        ocupacion > 100
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{
                        width: `${Math.min(100, ocupacion)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* GENÉTICAS */}

              {sala.geneticas.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-[11px] text-zinc-400">
                    Genéticas
                  </span>

                  {sala.geneticas.map((nombre) => (
                    <span
                      key={nombre}
                      className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600"
                    >
                      {nombre}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full min-h-28 flex-col justify-center">
              <p className="text-sm font-medium text-zinc-600">
                Sin actividad registrada
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                {capacidad > 0
                  ? `Capacidad: ${fmt(capacidad)} plantas`
                  : 'Consultá la ficha para revisar su configuración.'}
              </p>

              {numero(sala.superficie_productiva) > 0 && (
                <p className="mt-1 text-xs text-zinc-400">
                  {fmt(numero(sala.superficie_productiva))} m² productivos
                </p>
              )}
            </div>
          )}
        </div>

        {/* ACCIÓN */}

        <div className="flex items-center justify-end border-t border-zinc-100 px-5 py-3 xl:w-[150px] xl:shrink-0 xl:justify-center xl:border-l xl:border-t-0">
          <Link
            href={`/cultivo/salas/${sala.id}`}
            className="inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Abrir sala
            <span aria-hidden="true">↗</span>
          </Link>
        </div>

      </div>
    </article>
  )
}

function Dato({
  titulo,
  valor,
  detalle,
}: {
  titulo: string
  valor: string
  detalle?: string
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-zinc-400">
        {titulo}
      </p>

      <p className="mt-1 truncate text-[17px] font-semibold tracking-tight text-zinc-900">
        {valor}
      </p>

      {detalle && (
        <p className="mt-0.5 text-[10px] text-zinc-400">
          {detalle}
        </p>
      )}
    </div>
  )
}
