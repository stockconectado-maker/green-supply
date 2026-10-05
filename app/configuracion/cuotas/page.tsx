'use client'

import Link from 'next/link'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createClient } from '@/lib/supabase/client'

type TipoCuota =
  | 'Ordinaria'
  | 'Ingreso'
  | 'Extraordinaria'

type Cuota = {
  id: number
  tipo: TipoCuota
  nombre: string
  importe: number | string
  periodicidad: string
  activa: boolean
}

export default function ConfiguracionCuotasPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [
    cuotas,
    setCuotas,
  ] = useState<Cuota[]>([])

  const [
    importes,
    setImportes,
  ] = useState<
    Record<TipoCuota, string>
  >({
    Ordinaria: '',
    Ingreso: '',
    Extraordinaria: '',
  })

  const [
    cargando,
    setCargando,
  ] = useState(true)

  const [
    guardando,
    setGuardando,
  ] = useState<TipoCuota | null>(
    null
  )

  const [
    error,
    setError,
  ] = useState('')

  const [
    mensaje,
    setMensaje,
  ] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    setError('')

    const {
      data,
      error: consultaError,
    } = await supabase
      .from('cuotas_configuracion')
      .select(`
        id,
        tipo,
        nombre,
        importe,
        periodicidad,
        activa
      `)
      .order(
        'created_at',
        {
          ascending: false,
        }
      )

    if (consultaError) {
      console.error(
        consultaError
      )

      setError(
        'No se pudo cargar la configuración de cuotas.'
      )

      setCargando(false)
      return
    }

    const lista =
      (data ?? []) as Cuota[]

    setCuotas(lista)

    const ordinaria =
      buscarCuota(
        lista,
        'Ordinaria'
      )

    const ingreso =
      buscarCuota(
        lista,
        'Ingreso'
      )

    const extraordinaria =
      buscarCuota(
        lista,
        'Extraordinaria'
      )

    setImportes({
      Ordinaria:
        ordinaria
          ? String(
              ordinaria.importe
            )
          : '',

      Ingreso:
        ingreso
          ? String(
              ingreso.importe
            )
          : '',

      Extraordinaria:
        extraordinaria
          ? String(
              extraordinaria.importe
            )
          : '',
    })

    setCargando(false)
  }

  function buscarCuota(
    lista: Cuota[],
    tipo: TipoCuota
  ) {
    return (
      lista.find(
        (cuota) =>
          cuota.tipo === tipo &&
          cuota.activa
      ) ||
      lista.find(
        (cuota) =>
          cuota.tipo === tipo
      )
    )
  }

  function cambiarImporte(
    tipo: TipoCuota,
    valor: string
  ) {
    setImportes(
      (actual) => ({
        ...actual,
        [tipo]: valor,
      })
    )
  }

  function convertirNumero(
    valor: string
  ) {
    return Number(
      valor
        .replace(/\./g, '')
        .replace(',', '.')
    )
  }

  async function guardarCuota(
    tipo: TipoCuota
  ) {
    setError('')
    setMensaje('')

    const importe =
      convertirNumero(
        importes[tipo]
      )

    if (
      Number.isNaN(
        importe
      ) ||
      importe < 0
    ) {
      setError(
        'Ingresá un importe válido.'
      )

      return
    }

    setGuardando(tipo)

    const existente =
      buscarCuota(
        cuotas,
        tipo
      )

    const nombre =
      tipo === 'Ordinaria'
        ? 'Cuota social ordinaria'
        : tipo === 'Ingreso'
        ? 'Cuota de ingreso'
        : 'Cuota extraordinaria'

    const periodicidad =
      tipo === 'Ordinaria'
        ? 'Mensual'
        : 'Única'

    if (existente) {
      const {
        error: updateError,
      } = await supabase
        .from(
          'cuotas_configuracion'
        )
        .update({
          importe,
          nombre,
          periodicidad,
          activa: true,
        })
        .eq(
          'id',
          existente.id
        )

      if (updateError) {
        console.error(
          updateError
        )

        setError(
          'No se pudo guardar la cuota.'
        )

        setGuardando(null)
        return
      }
    } else {
      const {
        error: insertError,
      } = await supabase
        .from(
          'cuotas_configuracion'
        )
        .insert({
          tipo,
          nombre,
          importe,
          periodicidad,
          activa: true,
        })

      if (insertError) {
        console.error(
          insertError
        )

        setError(
          'No se pudo crear la cuota.'
        )

        setGuardando(null)
        return
      }
    }

    setMensaje(
      `${nombre} actualizada correctamente.`
    )

    await cargarDatos()

    setGuardando(null)
  }

  return (
    <main className="min-h-screen bg-[#f5f6f7]">

      <div className="mx-auto max-w-[1100px] px-6 py-8 lg:px-8">

        <Link
          href="/configuracion"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
        >
          <span>
            ←
          </span>

          Volver a Configuración
        </Link>

        <div className="mt-7">

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Configuración
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Cuotas
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Definí los importes generales de las cuotas sociales.
          </p>

        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {mensaje}
          </div>
        )}

        {cargando ? (

          <div className="mt-7 rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center text-sm text-zinc-500 shadow-sm">
            Cargando cuotas...
          </div>

        ) : (

          <div className="mt-7 grid gap-4 md:grid-cols-3">

            <TarjetaCuota
              titulo="Cuota ordinaria"
              descripcion="Cuota habitual del asociado."
              aclaracion="Mensual"
              valor={
                importes.Ordinaria
              }
              guardando={
                guardando ===
                'Ordinaria'
              }
              onChange={(valor) =>
                cambiarImporte(
                  'Ordinaria',
                  valor
                )
              }
              onGuardar={() =>
                guardarCuota(
                  'Ordinaria'
                )
              }
            />

            <TarjetaCuota
              titulo="Cuota de ingreso"
              descripcion="Aporte al ingresar a la asociación."
              aclaracion="Pago único"
              valor={
                importes.Ingreso
              }
              guardando={
                guardando ===
                'Ingreso'
              }
              onChange={(valor) =>
                cambiarImporte(
                  'Ingreso',
                  valor
                )
              }
              onGuardar={() =>
                guardarCuota(
                  'Ingreso'
                )
              }
            />

            <TarjetaCuota
              titulo="Cuota extraordinaria"
              descripcion="Aporte extraordinario cuando corresponda."
              aclaracion="Pago único"
              valor={
                importes.Extraordinaria
              }
              guardando={
                guardando ===
                'Extraordinaria'
              }
              onChange={(valor) =>
                cambiarImporte(
                  'Extraordinaria',
                  valor
                )
              }
              onGuardar={() =>
                guardarCuota(
                  'Extraordinaria'
                )
              }
            />

          </div>

        )}

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">

          <p className="text-sm font-semibold text-zinc-900">
            Configuración administrativa
          </p>

          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Por ahora solo definimos los importes. Los pagos y movimientos se incorporarán más adelante en la lógica correspondiente.
          </p>

        </div>

      </div>

    </main>
  )
}

function TarjetaCuota({
  titulo,
  descripcion,
  aclaracion,
  valor,
  guardando,
  onChange,
  onGuardar,
}: {
  titulo: string
  descripcion: string
  aclaracion: string
  valor: string
  guardando: boolean
  onChange: (
    valor: string
  ) => void
  onGuardar: () => void
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">

      <div className="h-[3px] w-7 rounded-full bg-emerald-600" />

      <h2 className="mt-4 text-base font-semibold text-zinc-950">
        {titulo}
      </h2>

      <p className="mt-1 min-h-[40px] text-sm leading-5 text-zinc-500">
        {descripcion}
      </p>

      <span className="mt-3 inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
        {aclaracion}
      </span>

      <div className="mt-5">

        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
          Importe
        </label>

        <div className="relative">

          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg font-semibold text-zinc-500">
            $
          </span>

          <input
            value={valor}
            onChange={(e) =>
              onChange(
                e.target.value
              )
            }
            inputMode="decimal"
            placeholder="0"
            className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-9 pr-4 text-xl font-semibold text-zinc-950 outline-none transition placeholder:text-zinc-300 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
          />

        </div>

      </div>

      <button
        type="button"
        disabled={guardando}
        onClick={onGuardar}
        className="mt-5 w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {guardando
          ? 'Guardando...'
          : 'Guardar'}
      </button>

    </section>
  )
}