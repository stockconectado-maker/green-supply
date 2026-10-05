'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type SalaGestion = {
  id: number
  nombre: string
  tipo: string
  ancho: number | string | null
  largo: number | string | null
  alto: number | string | null
  observaciones: string | null
  archivada?: boolean | null
  archivada_at?: string | null
}

type Props = {
  sala: SalaGestion
  onActualizada: () => Promise<void> | void
}

export default function GestionSala({
  sala,
  onActualizada,
}: Props) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState(sala.nombre)
  const [tipo, setTipo] = useState(sala.tipo)
  const [ancho, setAncho] = useState(valorInput(sala.ancho))
  const [largo, setLargo] = useState(valorInput(sala.largo))
  const [alto, setAlto] = useState(valorInput(sala.alto))
  const [observaciones, setObservaciones] = useState(
    sala.observaciones ?? ''
  )

  const [guardando, setGuardando] = useState(false)
  const [accionando, setAccionando] = useState(false)
  const [error, setError] = useState('')
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  useEffect(() => {
    setNombre(sala.nombre)
    setTipo(sala.tipo)
    setAncho(valorInput(sala.ancho))
    setLargo(valorInput(sala.largo))
    setAlto(valorInput(sala.alto))
    setObservaciones(sala.observaciones ?? '')
  }, [sala])

  async function guardar() {
    if (!nombre.trim()) {
      setError('Ingresá un nombre para la sala.')
      return
    }

    if (!tipo.trim()) {
      setError('Ingresá un tipo de sala.')
      return
    }

    const anchoNumero = numeroOpcional(ancho)
    const largoNumero = numeroOpcional(largo)
    const altoNumero = numeroOpcional(alto)

    if (ancho && (!anchoNumero || anchoNumero <= 0)) {
      setError('Revisá el ancho de la sala.')
      return
    }

    if (largo && (!largoNumero || largoNumero <= 0)) {
      setError('Revisá el largo de la sala.')
      return
    }

    if (alto && (!altoNumero || altoNumero <= 0)) {
      setError('Revisá el alto de la sala.')
      return
    }

    setGuardando(true)
    setError('')

    const resultado = await supabase.rpc(
      'actualizar_datos_sala',
      {
        p_sala_id: sala.id,
        p_nombre: nombre.trim(),
        p_tipo: tipo.trim(),
        p_ancho: anchoNumero,
        p_largo: largoNumero,
        p_alto: altoNumero,
        p_observaciones:
          observaciones.trim() || null,
      }
    )

    if (resultado.error) {
      setError(describirError(resultado.error))
      setGuardando(false)
      return
    }

    setGuardando(false)
    setEditando(false)
    await onActualizada()
  }

  async function archivar() {
    const confirmar = window.confirm(
      `¿Archivar "${sala.nombre}"?\n\nNo se borra información. La sala y su historial quedan conservados.`
    )

    if (!confirmar) return

    setAccionando(true)
    setError('')

    const resultado = await supabase.rpc(
      'archivar_sala',
      {
        p_sala_id: sala.id,
      }
    )

    if (resultado.error) {
      setError(describirError(resultado.error))
      setAccionando(false)
      return
    }

    setAccionando(false)
    await onActualizada()
  }

  async function restaurar() {
    setAccionando(true)
    setError('')

    const resultado = await supabase.rpc(
      'restaurar_sala',
      {
        p_sala_id: sala.id,
      }
    )

    if (resultado.error) {
      setError(describirError(resultado.error))
      setAccionando(false)
      return
    }

    setAccionando(false)
    await onActualizada()
  }

  async function eliminar() {
    setAccionando(true)
    setError('')

    const resultado = await supabase.rpc(
      'eliminar_sala_vacia',
      {
        p_sala_id: sala.id,
      }
    )

    if (resultado.error) {
      setError(describirError(resultado.error))
      setAccionando(false)
      setConfirmarEliminar(false)
      return
    }

    router.push('/cultivo')
    router.refresh()
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between lg:px-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">
            Sala
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-950">
            Datos y administración
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Corregí datos de la sala o administrá su estado sin tocar los ciclos.
          </p>
        </div>

        {!editando && (
          <button
            type="button"
            onClick={() => {
              setError('')
              setEditando(true)
            }}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Editar sala
          </button>
        )}
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 lg:mx-6">
          {error}
        </div>
      )}

      {editando ? (
        <div className="p-5 lg:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Campo
              titulo="Nombre"
              valor={nombre}
              onChange={setNombre}
              placeholder="Sala 1"
            />

            <Campo
              titulo="Tipo"
              valor={tipo}
              onChange={setTipo}
              placeholder="Floración"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Campo
              titulo="Ancho"
              valor={ancho}
              onChange={setAncho}
              tipo="number"
              unidad="m"
            />

            <Campo
              titulo="Largo"
              valor={largo}
              onChange={setLargo}
              tipo="number"
              unidad="m"
            />

            <Campo
              titulo="Alto"
              valor={alto}
              onChange={setAlto}
              tipo="number"
              unidad="m"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Observaciones
            </label>
            <textarea
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Opcional"
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <p className="mt-3 text-xs leading-5 text-zinc-500">
            Las camas, capacidad y superficie productiva se administran desde el
            Setup; no se modifican desde este formulario.
          </p>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditando(false)
                setError('')
                setNombre(sala.nombre)
                setTipo(sala.tipo)
                setAncho(valorInput(sala.ancho))
                setLargo(valorInput(sala.largo))
                setAlto(valorInput(sala.alto))
                setObservaciones(
                  sala.observaciones ?? ''
                )
              }}
              disabled={guardando}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {guardando
                ? 'Guardando...'
                : 'Guardar cambios'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 lg:p-6">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Dato
              titulo="Nombre"
              valor={sala.nombre}
            />
            <Dato
              titulo="Tipo"
              valor={sala.tipo}
            />
            <Dato
              titulo="Ancho"
              valor={unidad(sala.ancho, 'm')}
            />
            <Dato
              titulo="Largo"
              valor={unidad(sala.largo, 'm')}
            />
            <Dato
              titulo="Alto"
              valor={unidad(sala.alto, 'm')}
            />
          </div>
        </div>
      )}

      <div className="border-t border-zinc-100 bg-zinc-50/70 px-5 py-4 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-700">
              Administración
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Archivar conserva todo. Eliminar definitivamente solo está permitido
              si la sala nunca tuvo ciclos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {sala.archivada ? (
              <button
                type="button"
                onClick={restaurar}
                disabled={accionando}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800"
              >
                Restaurar sala
              </button>
            ) : (
              <button
                type="button"
                onClick={archivar}
                disabled={accionando}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100"
              >
                Archivar sala
              </button>
            )}

            {!confirmarEliminar ? (
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setConfirmarEliminar(true)
                }}
                disabled={accionando}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700"
              >
                Eliminar definitivamente
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-white p-2">
                <span className="px-1 text-xs font-semibold text-red-700">
                  ¿Eliminar si está vacía?
                </span>
                <button
                  type="button"
                  onClick={eliminar}
                  disabled={accionando}
                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Sí, eliminar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmarEliminar(false)
                  }
                  disabled={accionando}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Campo({
  titulo,
  valor,
  onChange,
  placeholder = '',
  tipo = 'text',
  unidad,
}: {
  titulo: string
  valor: string
  onChange: (valor: string) => void
  placeholder?: string
  tipo?: 'text' | 'number'
  unidad?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
        {titulo}
      </span>

      <div className="relative">
        <input
          type={tipo}
          min={tipo === 'number' ? '0' : undefined}
          step={tipo === 'number' ? '0.01' : undefined}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 ${
            unidad ? 'pr-10' : ''
          }`}
        />

        {unidad && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">
            {unidad}
          </span>
        )}
      </div>
    </label>
  )
}

function Dato({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div className="rounded-xl bg-zinc-50 px-3.5 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
        {titulo}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-zinc-900">
        {valor}
      </p>
    </div>
  )
}

function valorInput(valor: number | string | null) {
  return valor === null || valor === undefined
    ? ''
    : String(valor)
}

function numeroOpcional(valor: string) {
  if (!valor.trim()) return null

  const n = Number(valor.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function unidad(
  valor: number | string | null,
  sufijo: string
) {
  if (valor === null || valor === undefined || valor === '') {
    return '—'
  }

  return `${new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 2,
  }).format(Number(valor))} ${sufijo}`
}

function describirError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return 'No se pudo completar la operación.'
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
    .join(' · ')
}
