'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NuevaGeneticaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [nombre, setNombre] =
    useState('')

  const [
    observaciones,
    setObservaciones,
  ] = useState('')

  const [guardando, setGuardando] =
    useState(false)

  const [error, setError] =
    useState('')

  async function guardar(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    if (!nombre.trim()) {
      setError(
        'Ingresá el nombre de la genética.'
      )
      return
    }

    setGuardando(true)
    setError('')

    const { error } =
      await supabase
        .from('geneticas')
        .insert({
          nombre:
            nombre.trim(),

          observaciones:
            observaciones.trim() ||
            null,

          activa: true,
        })

    if (error) {
      console.error(error)

      if (
        error.code === '23505'
      ) {
        setError(
          'Esta genética ya está registrada.'
        )
      } else {
        setError(
          'No se pudo guardar la genética.'
        )
      }

      setGuardando(false)
      return
    }

    router.push('/stock')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#f5f6f7]">

      <div className="mx-auto max-w-[900px] px-6 py-8 lg:px-8">

        <Link
          href="/stock"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
        >
          <span>←</span>
          Volver a Stock
        </Link>

        <div className="mt-7">

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Existencias
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Nueva genética
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Registrá una genética para luego asociarle lotes y movimientos de existencia.
          </p>

        </div>

        <form
          onSubmit={guardar}
          className="mt-7 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >

          <div>

            <label className="mb-2 block text-sm font-semibold text-zinc-800">
              Nombre de la genética
              <span className="ml-1 text-emerald-700">
                *
              </span>
            </label>

            <input
              autoFocus
              value={nombre}
              onChange={(e) =>
                setNombre(
                  e.target.value
                )
              }
              placeholder="Ej. Galactic Guava"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
            />

          </div>

          <div className="mt-5">

            <label className="mb-2 block text-sm font-semibold text-zinc-800">
              Observaciones
            </label>

            <textarea
              rows={4}
              value={observaciones}
              onChange={(e) =>
                setObservaciones(
                  e.target.value
                )
              }
              placeholder="Información adicional opcional..."
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
            />

          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-zinc-100 pt-6">

            <Link
              href="/stock"
              className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50"
            >
              {guardando
                ? 'Guardando...'
                : 'Crear genética'}
            </button>

          </div>

        </form>

      </div>

    </main>
  )
}