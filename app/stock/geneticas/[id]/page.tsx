'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Genetica = {
  id: number
  nombre: string
  activa: boolean
  observaciones: string | null
}

export default function EditarGeneticaPage() {
  const params = useParams()
  const router = useRouter()

  const idRaw = params.id
  const id = Number(
    Array.isArray(idRaw) ? idRaw[0] : idRaw
  )

  const [genetica, setGenetica] =
    useState<Genetica | null>(null)

  const [nombre, setNombre] =
    useState('')

  const [observaciones, setObservaciones] =
    useState('')

  const [activa, setActiva] =
    useState(true)

  const [cargando, setCargando] =
    useState(true)

  const [guardando, setGuardando] =
    useState(false)

  const [error, setError] =
    useState('')

  useEffect(() => {
    async function cargarGenetica() {
      if (!Number.isInteger(id)) {
        setError(
          'La genética seleccionada no es válida.'
        )

        setCargando(false)
        return
      }

      const supabase = createClient()

      const {
        data,
        error,
      } = await supabase
        .from('geneticas')
        .select(`
          id,
          nombre,
          activa,
          observaciones
        `)
        .eq('id', id)
        .single()

      if (error || !data) {
        console.error(error)

        setError(
          'No se pudo cargar la genética.'
        )

        setCargando(false)
        return
      }

      setGenetica(data)
      setNombre(data.nombre)
      setActiva(data.activa)
      setObservaciones(
        data.observaciones ?? ''
      )

      setCargando(false)
    }

    cargarGenetica()
  }, [id])

  async function guardar(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setError('')

    if (!nombre.trim()) {
      setError(
        'Ingresá el nombre de la genética.'
      )
      return
    }

    setGuardando(true)

    const supabase = createClient()

    const {
      error: updateError,
    } = await supabase
      .from('geneticas')
      .update({
        nombre: nombre.trim(),
        activa,
        observaciones:
          observaciones.trim() ||
          null,
      })
      .eq('id', id)

    if (updateError) {
      console.error(
        updateError
      )

      if (
        updateError.code ===
        '23505'
      ) {
        setError(
          'Ya existe otra genética con ese nombre.'
        )
      } else {
        setError(
          'No se pudieron guardar los cambios.'
        )
      }

      setGuardando(false)
      return
    }

    router.push('/stock')
    router.refresh()
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-[#f5f6f7]">
        <div className="mx-auto max-w-[1000px] px-6 py-8 lg:px-8">
          <p className="text-sm font-medium text-zinc-600">
            Cargando genética...
          </p>
        </div>
      </main>
    )
  }

  if (!genetica) {
    return (
      <main className="min-h-screen bg-[#f5f6f7]">
        <div className="mx-auto max-w-[1000px] px-6 py-8 lg:px-8">

          <Link
            href="/stock"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
          >
            ← Volver a Stock
          </Link>

          <div className="mt-7 rounded-2xl border border-red-200 bg-white p-6 shadow-sm">

            <p className="font-semibold text-zinc-950">
              No se pudo abrir la genética
            </p>

            <p className="mt-2 text-sm text-zinc-600">
              {error}
            </p>

          </div>

        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f6f7]">

      <div className="mx-auto max-w-[1050px] px-6 py-8 lg:px-8">

        {/* VOLVER */}

        <Link
          href="/stock"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
        >
          <span>←</span>
          Volver a Stock
        </Link>

        {/* CABECERA */}

        <div className="mt-7">

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Genética
          </p>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

            <div>

              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                {genetica.nombre}
              </h1>

              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Editá la información general y su estado dentro del sistema.
              </p>

            </div>

            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${
                activa
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-zinc-200 bg-zinc-100 text-zinc-600'
              }`}
            >
              {activa
                ? 'Activa'
                : 'Inactiva'}
            </span>

          </div>

        </div>

        <form
          onSubmit={guardar}
          className="mt-7"
        >

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">

            {/* DATOS */}

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">

              <div>

                <h2 className="text-base font-semibold text-zinc-950">
                  Información
                </h2>

                <p className="mt-1 text-sm text-zinc-600">
                  Datos generales de la genética.
                </p>

              </div>

              <div className="mt-6 space-y-5">

                {/* NOMBRE */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-zinc-800">
                    Nombre de la genética
                  </label>

                  <input
                    value={nombre}
                    onChange={(e) =>
                      setNombre(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                  />

                </div>

                {/* OBSERVACIONES */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-zinc-800">
                    Observaciones
                  </label>

                  <textarea
                    rows={5}
                    value={
                      observaciones
                    }
                    onChange={(e) =>
                      setObservaciones(
                        e.target.value
                      )
                    }
                    placeholder="Información adicional opcional..."
                    className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                  />

                </div>

              </div>

            </section>

            {/* ESTADO */}

            <aside>

              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">

                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                  Estado
                </p>

                <h2 className="mt-2 text-base font-semibold text-zinc-950">
                  Disponibilidad
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Si una genética deja de utilizarse, podés marcarla como inactiva sin perder sus lotes ni movimientos anteriores.
                </p>

                <div className="mt-5">

                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Estado actual
                  </label>

                  <select
                    value={
                      activa
                        ? 'activa'
                        : 'inactiva'
                    }
                    onChange={(e) =>
                      setActiva(
                        e.target.value ===
                          'activa'
                      )
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                  >
                    <option value="activa">
                      Activa
                    </option>

                    <option value="inactiva">
                      Inactiva
                    </option>
                  </select>

                </div>

                <div className="mt-5 rounded-xl bg-zinc-50 px-4 py-3">

                  <p className="text-xs font-semibold text-zinc-800">
                    Importante
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    Una genética inactiva conserva toda su trazabilidad histórica.
                  </p>

                </div>

              </section>

            </aside>

          </div>

          {/* ERROR */}

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* ACCIONES */}

          <div className="mt-6 flex justify-end gap-3 border-t border-zinc-200 pt-6">

            <Link
              href="/stock"
              className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? 'Guardando...'
                : 'Guardar cambios'}
            </button>

          </div>

        </form>

      </div>

    </main>
  )
}