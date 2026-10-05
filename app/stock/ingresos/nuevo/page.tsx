'use client'

import Link from 'next/link'
import {
  FormEvent,
  useEffect,
  useState,
} from 'react'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Genetica = {
  id: number
  nombre: string
}

export default function NuevoIngresoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [
    geneticas,
    setGeneticas,
  ] = useState<Genetica[]>([])

  const [
    cargando,
    setCargando,
  ] = useState(true)

  const [
    geneticaId,
    setGeneticaId,
  ] = useState('')

  const [
    cantidad,
    setCantidad,
  ] = useState('')

  const [
    fechaCosecha,
    setFechaCosecha,
  ] = useState('')

  const [
    observaciones,
    setObservaciones,
  ] = useState('')

  const [
    guardando,
    setGuardando,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  useEffect(() => {
    cargarGeneticas()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargarGeneticas() {
    setCargando(true)

    const {
      data,
      error,
    } = await supabase
      .from('geneticas')
      .select('id, nombre')
      .eq('activa', true)
      .order('nombre')

    if (error) {
      console.error(error)

      setError(
        'No se pudieron cargar las genéticas.'
      )

      setCargando(false)
      return
    }

    setGeneticas(
      data ?? []
    )

    setCargando(false)
  }

  async function guardar(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setError('')

    if (!geneticaId) {
      setError(
        'Seleccioná una genética.'
      )
      return
    }

    const cantidadNumerica =
      Number(
        cantidad.replace(',', '.')
      )

    if (
      !cantidadNumerica ||
      cantidadNumerica <= 0
    ) {
      setError(
        'Ingresá una cantidad válida mayor a cero.'
      )
      return
    }

    setGuardando(true)

    const {
      data,
      error,
    } = await supabase.rpc(
      'crear_ingreso_stock',
      {
        p_genetica_id:
          Number(geneticaId),

        p_cantidad:
          cantidadNumerica,

        p_fecha_cosecha:
          fechaCosecha ||
          null,

        p_observaciones:
          observaciones.trim() ||
          null,
      }
    )

    if (error) {
      console.error(error)

      setError(
        'No se pudo registrar el ingreso.'
      )

      setGuardando(false)
      return
    }

    console.log(
      'Ingreso creado:',
      data
    )

    router.push('/stock')
    router.refresh()
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

        {/* TITULO */}

        <div className="mt-7">

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Existencias
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Nuevo ingreso
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Registrá material vegetal ingresado a Stock. El lote se genera automáticamente.
          </p>

        </div>

        {/* CONTENIDO */}

        <form
          onSubmit={guardar}
          className="mt-7"
        >

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">

            {/* FORMULARIO */}

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">

              <div>

                <h2 className="text-base font-semibold text-zinc-950">
                  Datos del ingreso
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Seleccioná la genética e indicá la cantidad que ingresa.
                </p>

              </div>

              <div className="mt-6 space-y-5">

                {/* GENETICA */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-zinc-800">
                    Genética
                    <span className="ml-1 text-emerald-700">
                      *
                    </span>
                  </label>

                  <select
                    value={
                      geneticaId
                    }
                    disabled={
                      cargando
                    }
                    onChange={(e) =>
                      setGeneticaId(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                  >

                    <option value="">
                      {cargando
                        ? 'Cargando...'
                        : 'Seleccionar genética'}
                    </option>

                    {geneticas.map(
                      (genetica) => (
                        <option
                          key={
                            genetica.id
                          }
                          value={
                            genetica.id
                          }
                        >
                          {
                            genetica.nombre
                          }
                        </option>
                      )
                    )}

                  </select>

                </div>

                {/* CANTIDAD */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-zinc-800">
                    Cantidad
                    <span className="ml-1 text-emerald-700">
                      *
                    </span>
                  </label>

                  <div className="relative">

                    <input
                      value={
                        cantidad
                      }
                      onChange={(e) =>
                        setCantidad(
                          e.target.value
                        )
                      }
                      inputMode="decimal"
                      placeholder="Ej. 1850"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-14 text-lg font-semibold text-zinc-950 outline-none transition placeholder:text-zinc-300 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                    />

                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">

                      <span className="text-sm font-semibold text-zinc-500">
                        g
                      </span>

                    </div>

                  </div>

                </div>

                {/* FECHA */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-zinc-800">
                    Fecha de cosecha
                  </label>

                  <input
                    type="date"
                    value={
                      fechaCosecha
                    }
                    onChange={(e) =>
                      setFechaCosecha(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                  />

                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Opcional en esta etapa. Más adelante podrá venir directamente desde Cultivo.
                  </p>

                </div>

                {/* OBSERVACIONES */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-zinc-800">
                    Observaciones
                  </label>

                  <textarea
                    rows={4}
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

            {/* RESUMEN */}

            <aside>

              <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">

                <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4">

                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">
                    Lote automático
                  </p>

                  <p className="mt-2 text-lg font-semibold text-zinc-950">
                    Se genera al guardar
                  </p>

                </div>

                <div className="space-y-4 p-5">

                  <Resumen
                    titulo="Código"
                    valor="GS-L000X"
                  />

                  <Resumen
                    titulo="Genética"
                    valor={
                      geneticas.find(
                        (g) =>
                          String(
                            g.id
                          ) ===
                          geneticaId
                      )?.nombre ||
                      'Sin seleccionar'
                    }
                  />

                  <Resumen
                    titulo="Cantidad"
                    valor={
                      cantidad
                        ? `${cantidad} g`
                        : '0 g'
                    }
                  />

                  <Resumen
                    titulo="Movimiento"
                    valor="Ingreso"
                  />

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
              disabled={
                guardando ||
                cargando
              }
              className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? 'Registrando...'
                : 'Registrar ingreso'}
            </button>

          </div>

        </form>

      </div>

    </main>
  )
}

function Resumen({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">

      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
        {titulo}
      </p>

      <p className="mt-1 text-sm font-semibold text-zinc-950">
        {valor}
      </p>

    </div>
  )
}