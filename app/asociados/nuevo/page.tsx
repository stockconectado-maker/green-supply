'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  calcularProximaAccion,
  ESTADOS_ASOCIADO,
  ESTADOS_DOCUMENTACION,
  ESTADOS_REPROCANN,
} from '@/lib/asociados'

export default function NuevoAsociadoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [guardando, setGuardando] =
    useState(false)

  const [error, setError] =
    useState('')

  const [form, setForm] = useState({
    nombre_apellido: '',
    dni: '',
    telefono: '',
    email: '',
    fecha_nacimiento: '',
    estado_asociado: 'Interesado',
    estado_reprocann: 'No iniciado',
    numero_reprocann: '',
    vencimiento_reprocann: '',
    documentacion: 'Pendiente',
    fecha_alta: '',
    fecha_seguimiento: '',
    observaciones: '',
  })

  function actualizarCampo(
    campo: keyof typeof form,
    valor: string
  ) {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor,
    }))
  }

  async function guardarAsociado(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    if (!form.nombre_apellido.trim()) {
      setError(
        'Ingresá el nombre y apellido del asociado.'
      )
      return
    }

    setGuardando(true)
    setError('')

    const proximaAccion =
      calcularProximaAccion(
        form.estado_asociado,
        form.estado_reprocann,
        form.documentacion
      )

    const { error } = await supabase
      .from('asociados')
      .insert({
        nombre_apellido:
          form.nombre_apellido.trim(),

        dni:
          form.dni || null,

        telefono:
          form.telefono || null,

        email:
          form.email || null,

        fecha_nacimiento:
          form.fecha_nacimiento || null,

        estado_asociado:
          form.estado_asociado,

        estado_reprocann:
          form.estado_reprocann,

        numero_reprocann:
          form.numero_reprocann || null,

        vencimiento_reprocann:
          form.vencimiento_reprocann ||
          null,

        documentacion:
          form.documentacion,

        fecha_alta:
          form.fecha_alta || null,

        proxima_accion:
          proximaAccion,

        fecha_seguimiento:
          form.fecha_seguimiento || null,

        observaciones:
          form.observaciones || null,
      })

    if (error) {
      console.error(error)

      setError(
        'No se pudo guardar el asociado. Revisá la información e intentá nuevamente.'
      )

      setGuardando(false)
      return
    }

    router.push('/asociados')
    router.refresh()
  }

  const accionActual =
    calcularProximaAccion(
      form.estado_asociado,
      form.estado_reprocann,
      form.documentacion
    )

  const reprocannActivo =
    form.estado_reprocann !==
    'No iniciado'

  return (
    <main className="min-h-screen bg-[#f5f6f7]">

      <div className="mx-auto max-w-[1450px] px-6 py-8 lg:px-8">

        <Link
          href="/asociados"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
        >
          <span>←</span>
          Volver a asociados
        </Link>

        <div className="mt-7">

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Alta de asociado
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Nuevo asociado
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Cargá primero la información esencial. El resto se puede completar después desde la ficha individual.
          </p>

        </div>

        <form
          onSubmit={guardarAsociado}
          className="mt-7"
        >

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">

            <div className="space-y-6">

              <Seccion
                numero="01"
                titulo="Datos principales"
                descripcion="Información básica para identificar y contactar al asociado."
              >

                <div className="grid gap-5 md:grid-cols-2">

                  <div className="md:col-span-2">

                    <Campo
                      label="Nombre y apellido"
                      value={
                        form.nombre_apellido
                      }
                      onChange={(valor) =>
                        actualizarCampo(
                          'nombre_apellido',
                          valor
                        )
                      }
                      placeholder="Nombre completo"
                      required
                      destacado
                    />

                  </div>

                  <Campo
                    label="DNI"
                    value={form.dni}
                    onChange={(valor) =>
                      actualizarCampo(
                        'dni',
                        valor
                      )
                    }
                    placeholder="Ej. 32.456.789"
                  />

                  <Campo
                    label="Teléfono / WhatsApp"
                    value={
                      form.telefono
                    }
                    onChange={(valor) =>
                      actualizarCampo(
                        'telefono',
                        valor
                      )
                    }
                    placeholder="+54 9..."
                  />

                  <Campo
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(valor) =>
                      actualizarCampo(
                        'email',
                        valor
                      )
                    }
                    placeholder="correo@email.com"
                  />

                  <Campo
                    label="Fecha de nacimiento"
                    type="date"
                    value={
                      form.fecha_nacimiento
                    }
                    onChange={(valor) =>
                      actualizarCampo(
                        'fecha_nacimiento',
                        valor
                      )
                    }
                  />

                </div>

              </Seccion>

              <Seccion
                numero="02"
                titulo="Estado del proceso"
                descripcion="Indicá en qué etapa se encuentra actualmente."
              >

                <div className="grid gap-5 md:grid-cols-2">

                  <Selector
                    label="Estado del asociado"
                    value={
                      form.estado_asociado
                    }
                    onChange={(valor) =>
                      actualizarCampo(
                        'estado_asociado',
                        valor
                      )
                    }
                    opciones={
                      ESTADOS_ASOCIADO
                    }
                  />

                  <Selector
                    label="Documentación"
                    value={
                      form.documentacion
                    }
                    onChange={(valor) =>
                      actualizarCampo(
                        'documentacion',
                        valor
                      )
                    }
                    opciones={
                      ESTADOS_DOCUMENTACION
                    }
                  />

                  <Campo
                    label="Fecha de seguimiento"
                    type="date"
                    value={
                      form.fecha_seguimiento
                    }
                    onChange={(valor) =>
                      actualizarCampo(
                        'fecha_seguimiento',
                        valor
                      )
                    }
                  />

                  <Campo
                    label="Fecha de alta"
                    type="date"
                    value={
                      form.fecha_alta
                    }
                    onChange={(valor) =>
                      actualizarCampo(
                        'fecha_alta',
                        valor
                      )
                    }
                  />

                </div>

              </Seccion>

              <Seccion
                numero="03"
                titulo="REPROCANN"
                descripcion="Completá solamente la información disponible en este momento."
              >

                <div className="grid gap-5 md:grid-cols-2">

                  <Selector
                    label="Estado REPROCANN"
                    value={
                      form.estado_reprocann
                    }
                    onChange={(valor) =>
                      actualizarCampo(
                        'estado_reprocann',
                        valor
                      )
                    }
                    opciones={
                      ESTADOS_REPROCANN
                    }
                  />

                  <div className="hidden md:block" />

                  {reprocannActivo && (
                    <>
                      <Campo
                        label="N° REPROCANN"
                        value={
                          form.numero_reprocann
                        }
                        onChange={(valor) =>
                          actualizarCampo(
                            'numero_reprocann',
                            valor
                          )
                        }
                        placeholder="Número de trámite"
                      />

                      <Campo
                        label="Vencimiento REPROCANN"
                        type="date"
                        value={
                          form.vencimiento_reprocann
                        }
                        onChange={(valor) =>
                          actualizarCampo(
                            'vencimiento_reprocann',
                            valor
                          )
                        }
                      />
                    </>
                  )}

                </div>

                {!reprocannActivo && (
                  <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">

                    <p className="text-sm font-medium text-zinc-700">
                      REPROCANN todavía no iniciado
                    </p>

                    <p className="mt-1 text-xs leading-5 text-zinc-600">
                      El número y vencimiento se podrán completar más adelante desde la ficha individual.
                    </p>

                  </div>
                )}

              </Seccion>

              <Seccion
                numero="04"
                titulo="Observaciones"
                descripcion="Agregá únicamente información que sea útil para el seguimiento."
              >

                <textarea
                  rows={4}
                  value={
                    form.observaciones
                  }
                  onChange={(e) =>
                    actualizarCampo(
                      'observaciones',
                      e.target.value
                    )
                  }
                  placeholder="Ej. Prefiere contacto por WhatsApp, enviar documentación el viernes..."
                  className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                />

              </Seccion>

            </div>

            <aside className="space-y-5">

              <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">

                <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4">

                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">
                    Próxima acción
                  </p>

                  <p className="mt-2 text-base font-semibold leading-6 text-zinc-950">
                    {accionActual}
                  </p>

                </div>

                <div className="space-y-4 p-5">

                  <Resumen
                    label="Estado"
                    valor={
                      form.estado_asociado
                    }
                  />

                  <Resumen
                    label="REPROCANN"
                    valor={
                      form.estado_reprocann
                    }
                  />

                  <Resumen
                    label="Documentación"
                    valor={
                      form.documentacion
                    }
                  />

                  <Resumen
                    label="Seguimiento"
                    valor={
                      form.fecha_seguimiento
                        ? form.fecha_seguimiento
                        : 'Sin fecha'
                    }
                  />

                </div>

              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">

                <h3 className="text-sm font-semibold text-zinc-950">
                  Alta simple
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  No es necesario completar todo ahora. Con nombre y estado ya podemos iniciar el seguimiento.
                </p>

                <div className="mt-4 border-t border-zinc-100 pt-4">

                  <p className="text-xs font-medium leading-5 text-zinc-500">
                    El número de socio se genera automáticamente al guardar.
                  </p>

                </div>

              </section>

            </aside>

          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-end">

            <Link
              href="/asociados"
              className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-center text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
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
                : 'Crear asociado'}
            </button>

          </div>

        </form>

      </div>

    </main>
  )
}

function Seccion({
  numero,
  titulo,
  descripcion,
  children,
}: {
  numero: string
  titulo: string
  descripcion: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">

      <div className="mb-5 flex items-start gap-3">

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[11px] font-bold text-emerald-700">
          {numero}
        </div>

        <div>

          <h2 className="text-base font-semibold text-zinc-950">
            {titulo}
          </h2>

          <p className="mt-1 text-sm leading-5 text-zinc-600">
            {descripcion}
          </p>

        </div>

      </div>

      {children}

    </section>
  )
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  destacado = false,
}: {
  label: string
  value: string
  onChange: (valor: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  destacado?: boolean
}) {
  return (
    <div>

      <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-700">

        {label}

        {required && (
          <span className="text-emerald-700">
            *
          </span>
        )}

      </label>

      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 ${
          destacado
            ? 'border-zinc-300'
            : 'border-zinc-200'
        }`}
      />

    </div>
  )
}

function Selector({
  label,
  value,
  onChange,
  opciones,
}: {
  label: string
  value: string
  onChange: (valor: string) => void
  opciones: string[]
}) {
  return (
    <div>

      <label className="mb-2 block text-xs font-semibold text-zinc-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
      >

        {opciones.map(
          (opcion) => (
            <option
              key={opcion}
              value={opcion}
            >
              {opcion}
            </option>
          )
        )}

      </select>

    </div>
  )
}

function Resumen({
  label,
  valor,
}: {
  label: string
  valor: string
}) {
  return (
    <div className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">

      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-zinc-900">
        {valor}
      </p>

    </div>
  )
}