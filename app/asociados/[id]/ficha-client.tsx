'use client'



import Link from 'next/link'

import { useRouter } from 'next/navigation'

import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'

import {

  calcularProximaAccion,

  ESTADOS_ASOCIADO,

  ESTADOS_DOCUMENTACION,

  ESTADOS_REPROCANN,

  numeroSocio,

} from '@/lib/asociados'



type Asociado = {

  id: number

  created_at: string | null

  numero_socio: string | null

  nombre_apellido: string | null

  dni: string | null

  telefono: string | null

  email: string | null

  fecha_nacimiento: string | null

  estado_asociado: string | null

  estado_reprocann: string | null

  numero_reprocann: string | null

  vencimiento_reprocann: string | null

  reprocann_pdf_path: string | null

  reprocann_pdf_nombre: string | null

  reprocann_fecha_carga: string | null

  documentacion: string | null

  fecha_alta: string | null

  proxima_accion: string | null

  fecha_seguimiento: string | null

  observaciones: string | null

}



function crearFormulario(asociado: Asociado) {

  return {

    nombre_apellido:

      asociado.nombre_apellido ?? '',



    dni:

      asociado.dni ?? '',



    telefono:

      asociado.telefono ?? '',



    email:

      asociado.email ?? '',



    fecha_nacimiento:

      asociado.fecha_nacimiento ?? '',



    estado_asociado:

      asociado.estado_asociado ??

      'Interesado',



    estado_reprocann:

      asociado.estado_reprocann ??

      'No iniciado',



    numero_reprocann:

      asociado.numero_reprocann ?? '',



    vencimiento_reprocann:

      asociado.vencimiento_reprocann ??

      '',



    documentacion:

      asociado.documentacion ??

      'Pendiente',



    fecha_alta:

      asociado.fecha_alta ?? '',



    fecha_seguimiento:

      asociado.fecha_seguimiento ??

      '',



    observaciones:

      asociado.observaciones ?? '',

  }

}



export default function FichaAsociadoClient({

  asociado,

}: {

  asociado: Asociado

}) {

  const router = useRouter()

  const supabase = createClient()



  const [datos, setDatos] =

    useState<Asociado>(asociado)



  const [form, setForm] =

    useState(

      crearFormulario(asociado)

    )



  const [editando, setEditando] =

    useState(false)



  const [guardando, setGuardando] =

    useState(false)



  const [mensaje, setMensaje] =

    useState('')



  const [error, setError] =

    useState('')

  const [subiendoReprocann, setSubiendoReprocann] =
    useState(false)



  function actualizarCampo(

    campo: keyof typeof form,

    valor: string

  ) {

    setForm((anterior) => ({

      ...anterior,

      [campo]: valor,

    }))

  }



  function cancelarEdicion() {

    setForm(

      crearFormulario(datos)

    )



    setEditando(false)

    setError('')

    setMensaje('')

  }



  async function guardarCambios() {

    setGuardando(true)

    setError('')

    setMensaje('')



    const proximaAccion =

      calcularProximaAccion(

        form.estado_asociado,

        form.estado_reprocann,

        form.documentacion

      )



    const cambios = {

      nombre_apellido:

        form.nombre_apellido,



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



      fecha_seguimiento:

        form.fecha_seguimiento ||

        null,



      observaciones:

        form.observaciones || null,



      proxima_accion:

        proximaAccion,

    }



    const { error } =

      await supabase

        .from('asociados')

        .update(cambios)

        .eq('id', datos.id)



    if (error) {

      console.error(error)



      setError(

        'No se pudieron guardar los cambios.'

      )



      setGuardando(false)

      return

    }



    setDatos((anterior) => ({

      ...anterior,

      ...cambios,

    }))



    setForm((anterior) => ({

      ...anterior,

    }))



    setMensaje(

      'Cambios guardados correctamente.'

    )



    setEditando(false)

    setGuardando(false)



    router.refresh()

  }

  async function cargarReprocann(file: File | null) {
    if (!file) return

    setError('')
    setMensaje('')

    if (file.type !== 'application/pdf') {
      setError('El archivo debe ser un PDF.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('El PDF no puede superar los 10 MB.')
      return
    }

    setSubiendoReprocann(true)

    const path = `${datos.id}/reprocann.pdf`

    const { error: uploadError } = await supabase.storage
      .from('reprocann')
      .upload(path, file, {
        upsert: true,
        contentType: 'application/pdf',
      })

    if (uploadError) {
      console.error(uploadError)
      setError('No se pudo subir el PDF de REPROCANN.')
      setSubiendoReprocann(false)
      return
    }

    const fechaCarga = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('asociados')
      .update({
        reprocann_pdf_path: path,
        reprocann_pdf_nombre: file.name,
        reprocann_fecha_carga: fechaCarga,
      })
      .eq('id', datos.id)

    if (updateError) {
      console.error(updateError)
      setError('El PDF se subió, pero no se pudo vincular a la ficha.')
      setSubiendoReprocann(false)
      return
    }

    setDatos((anterior) => ({
      ...anterior,
      reprocann_pdf_path: path,
      reprocann_pdf_nombre: file.name,
      reprocann_fecha_carga: fechaCarga,
    }))

    setMensaje(
      datos.reprocann_pdf_path
        ? 'REPROCANN reemplazado correctamente.'
        : 'REPROCANN cargado correctamente.'
    )

    setSubiendoReprocann(false)
    router.refresh()
  }

  async function verReprocann() {
    if (!datos.reprocann_pdf_path) return

    setError('')

    const { data, error: signedError } = await supabase.storage
      .from('reprocann')
      .createSignedUrl(datos.reprocann_pdf_path, 60)

    if (signedError || !data?.signedUrl) {
      console.error(signedError)
      setError('No se pudo abrir el PDF de REPROCANN.')
      return
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }



  function formatFecha(

    fecha: string | null

  ) {

    if (!fecha) {

      return '—'

    }



    return new Intl.DateTimeFormat(

      'es-AR'

    ).format(

      new Date(

        `${fecha}T12:00:00`

      )

    )

  }



  function formatFechaHora(fecha: string | null) {
    if (!fecha) return '—'

    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(fecha))
  }



  function badgeEstado(

    valor: string | null

  ) {

    const texto =

      (valor ?? '')

        .toLowerCase()



    if (

      texto.includes('inactivo') ||

      texto.includes('baja') ||

      texto.includes('vencido')

    ) {

      return 'border-red-200 bg-red-50 text-red-700'

    }



    if (

      texto.includes('activo') ||

      texto.includes('completa')

    ) {

      return 'border-emerald-200 bg-emerald-50 text-emerald-700'

    }



    if (

      texto.includes('aprobado')

    ) {

      return 'border-blue-200 bg-blue-50 text-blue-700'

    }



    if (

      texto.includes('trámite') ||

      texto.includes('pendiente')

    ) {

      return 'border-amber-200 bg-amber-50 text-amber-700'

    }



    return 'border-zinc-200 bg-zinc-100 text-zinc-700'

  }



  const accionActual =

    calcularProximaAccion(

      editando

        ? form.estado_asociado

        : datos.estado_asociado,



      editando

        ? form.estado_reprocann

        : datos.estado_reprocann,



      editando

        ? form.documentacion

        : datos.documentacion

    )



  return (

    <main className="min-h-screen bg-[#f5f6f7]">



      <div className="mx-auto max-w-[1500px] px-6 py-8 lg:px-8">



        {/* VOLVER */}



        <Link

          href="/asociados"

          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-950"

        >

          <span>←</span>

          Volver a asociados

        </Link>



        {/* CABECERA */}



        <div className="mt-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">



          <div>



            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">

              {numeroSocio(

                datos.id

              )}

            </p>



            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">

              {datos.nombre_apellido ||

                'Sin nombre'}

            </h1>



            <div className="mt-3 flex flex-wrap items-center gap-2">



              <span

                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeEstado(

                  datos.estado_asociado

                )}`}

              >

                {datos.estado_asociado ||

                  'Sin estado'}

              </span>



              <span className="text-sm text-zinc-600">

                DNI{' '}



                <span className="font-medium text-zinc-800">

                  {datos.dni ||

                    '—'}

                </span>



              </span>



            </div>



          </div>



          <div className="flex flex-wrap gap-3">



            {!editando ? (

              <button

                type="button"

                onClick={() => {

                  setEditando(true)

                  setMensaje('')

                  setError('')

                }}

                className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"

              >

                Editar asociado

              </button>

            ) : (

              <>

                <button

                  type="button"

                  onClick={

                    cancelarEdicion

                  }

                  className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"

                >

                  Cancelar

                </button>



                <button

                  type="button"

                  disabled={

                    guardando

                  }

                  onClick={

                    guardarCambios

                  }

                  className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50"

                >

                  {guardando

                    ? 'Guardando...'

                    : 'Guardar cambios'}

                </button>

              </>

            )}



          </div>



        </div>



        {/* MENSAJES */}



        {mensaje && (

          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">

            {mensaje}

          </div>

        )}



        {error && (

          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">

            {error}

          </div>

        )}



        {/* RESUMEN */}



        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">



          <TarjetaResumen

            titulo="Estado"

            valor={

              editando

                ? form.estado_asociado

                : datos.estado_asociado ||

                  '—'

            }

          />



          <TarjetaResumen

            titulo="REPROCANN"

            valor={

              editando

                ? form.estado_reprocann

                : datos.estado_reprocann ||

                  '—'

            }

          />



          <TarjetaResumen

            titulo="Documentación"

            valor={

              editando

                ? form.documentacion

                : datos.documentacion ||

                  '—'

            }

          />



          <TarjetaResumen

            titulo="Seguimiento"

            valor={

              formatFecha(

                editando

                  ? form.fecha_seguimiento

                  : datos.fecha_seguimiento

              )

            }

          />



        </div>



        {/* CONTENIDO */}



        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">



          {/* IZQUIERDA */}



          <div className="space-y-6">



            {/* DATOS PERSONALES */}



            <Seccion

              titulo="Datos personales"

              descripcion="Información básica de identificación y contacto."

            >



              <div className="grid gap-6 md:grid-cols-2">



                {editando ? (

                  <>

                    <CampoEdit

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

                    />



                    <CampoEdit

                      label="DNI"

                      value={

                        form.dni

                      }

                      onChange={(valor) =>

                        actualizarCampo(

                          'dni',

                          valor

                        )

                      }

                    />



                    <CampoEdit

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

                    />



                    <CampoEdit

                      label="Email"

                      type="email"

                      value={

                        form.email

                      }

                      onChange={(valor) =>

                        actualizarCampo(

                          'email',

                          valor

                        )

                      }

                    />



                    <CampoEdit

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



                    <CampoEdit

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

                  </>

                ) : (

                  <>

                    <Dato

                      label="Nombre y apellido"

                      valor={

                        datos.nombre_apellido

                      }

                    />



                    <Dato

                      label="DNI"

                      valor={

                        datos.dni

                      }

                    />



                    <Dato

                      label="Teléfono / WhatsApp"

                      valor={

                        datos.telefono

                      }

                    />



                    <Dato

                      label="Email"

                      valor={

                        datos.email

                      }

                    />



                    <Dato

                      label="Fecha de nacimiento"

                      valor={

                        formatFecha(

                          datos.fecha_nacimiento

                        )

                      }

                    />



                    <Dato

                      label="Fecha de alta"

                      valor={

                        formatFecha(

                          datos.fecha_alta

                        )

                      }

                    />

                  </>

                )}



              </div>



            </Seccion>



            {/* REPROCANN */}



            <Seccion

              titulo="REPROCANN"

              descripcion="Estado, número y vigencia del trámite."

            >



              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">



                {editando ? (

                  <>

                    <SelectorEdit

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



                    <CampoEdit

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

                    />



                    <CampoEdit

                      label="Vencimiento"

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

                ) : (

                  <>

                    <DatoBadge

                      label="Estado"

                      valor={

                        datos.estado_reprocann

                      }

                      clase={badgeEstado(

                        datos.estado_reprocann

                      )}

                    />



                    <Dato

                      label="N° REPROCANN"

                      valor={

                        datos.numero_reprocann

                      }

                    />



                    <Dato

                      label="Vencimiento"

                      valor={

                        formatFecha(

                          datos.vencimiento_reprocann

                        )

                      }

                    />

                  </>

                )}



              </div>

              <div className="mt-6 border-t border-zinc-100 pt-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-zinc-700">
                      Documento REPROCANN
                    </p>

                    {datos.reprocann_pdf_path ? (
                      <>
                        <p className="mt-1 text-sm font-medium text-zinc-900">
                          {datos.reprocann_pdf_nombre || 'REPROCANN.pdf'}
                        </p>

                        <p className="mt-1 text-[11px] text-zinc-500">
                          Cargado {formatFechaHora(datos.reprocann_fecha_carga)}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-zinc-500">
                        Todavía no hay un PDF cargado.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {datos.reprocann_pdf_path && (
                      <button
                        type="button"
                        onClick={verReprocann}
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                      >
                        Ver PDF
                      </button>
                    )}

                    <label
                      className={`inline-flex cursor-pointer items-center rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                        subiendoReprocann
                          ? 'cursor-not-allowed bg-zinc-200 text-zinc-500'
                          : 'bg-emerald-700 text-white hover:bg-emerald-800'
                      }`}
                    >
                      {subiendoReprocann
                        ? 'Subiendo...'
                        : datos.reprocann_pdf_path
                          ? 'Reemplazar PDF'
                          : 'Cargar REPROCANN'}

                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        disabled={subiendoReprocann}
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null
                          void cargarReprocann(file)
                          event.currentTarget.value = ''
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>



            </Seccion>



            {/* OBSERVACIONES */}



            <Seccion

              titulo="Observaciones"

              descripcion="Información general relevante del asociado."

            >



              {editando ? (

                <textarea

                  rows={5}

                  value={

                    form.observaciones

                  }

                  onChange={(e) =>

                    actualizarCampo(

                      'observaciones',

                      e.target.value

                    )

                  }

                  placeholder="Observaciones importantes..."

                  className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"

                />

              ) : (

                <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-800">

                  {datos.observaciones ||

                    'Sin observaciones.'}

                </p>

              )}



            </Seccion>



          </div>



          {/* DERECHA */}



          <aside className="space-y-6">



            {/* PRÓXIMA ACCIÓN */}



            <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">



              <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4">



                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">

                  Próxima acción

                </p>



                <p className="mt-2 text-lg font-semibold leading-7 text-zinc-950">

                  {accionActual}

                </p>



              </div>



              <div className="p-5">



                {editando ? (

                  <CampoEdit

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

                ) : (

                  <Dato

                    label="Fecha de seguimiento"

                    valor={

                      formatFecha(

                        datos.fecha_seguimiento

                      )

                    }

                  />

                )}



                <p className="mt-4 text-xs leading-6 text-zinc-600">

                  La próxima acción se calcula automáticamente según el estado, REPROCANN y documentación.

                </p>



              </div>



            </section>



            {/* ESTADO */}



            <Seccion

              titulo="Estado y documentación"

              descripcion="Situación administrativa actual."

            >



              <div className="space-y-5">



                {editando ? (

                  <>

                    <SelectorEdit

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



                    <SelectorEdit

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

                  </>

                ) : (

                  <>

                    <DatoBadge

                      label="Estado del asociado"

                      valor={

                        datos.estado_asociado

                      }

                      clase={badgeEstado(

                        datos.estado_asociado

                      )}

                    />



                    <DatoBadge

                      label="Documentación"

                      valor={

                        datos.documentacion

                      }

                      clase={badgeEstado(

                        datos.documentacion

                      )}

                    />

                  </>

                )}



              </div>



            </Seccion>



            {/* FUTURA DISPENSA */}



            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">



              <p className="text-sm font-semibold text-zinc-950">

                Dispensas

              </p>



              <p className="mt-2 text-sm leading-6 text-zinc-600">

                El historial de dispensas aparecerá automáticamente aquí cuando el módulo Dispensa esté conectado.

              </p>



            </section>



          </aside>



        </div>



      </div>



    </main>

  )

}



function Seccion({

  titulo,

  descripcion,

  children,

}: {

  titulo: string

  descripcion: string

  children: React.ReactNode

}) {

  return (

    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">



      <div className="mb-5">



        <h2 className="text-base font-semibold text-zinc-950">

          {titulo}

        </h2>



        <p className="mt-1.5 text-sm leading-6 text-zinc-600">

          {descripcion}

        </p>



      </div>



      {children}



    </section>

  )

}



function TarjetaResumen({

  titulo,

  valor,

}: {

  titulo: string

  valor: string

}) {

  return (

    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5 shadow-sm">



      <div className="mb-2.5 h-[3px] w-6 rounded-full bg-emerald-600" />



      <p className="text-[13px] font-semibold text-zinc-700">

        {titulo}

      </p>



      <p className="mt-1.5 truncate text-sm font-semibold text-zinc-950">

        {valor}

      </p>



    </div>

  )

}



function Dato({

  label,

  valor,

}: {

  label: string

  valor: string | null

}) {

  return (

    <div>



      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">

        {label}

      </p>



      <p className="mt-1.5 text-sm font-semibold text-zinc-900">

        {valor || '—'}

      </p>



    </div>

  )

}



function DatoBadge({

  label,

  valor,

  clase,

}: {

  label: string

  valor: string | null

  clase: string

}) {

  return (

    <div>



      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">

        {label}

      </p>



      <span

        className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${clase}`}

      >

        {valor || '—'}

      </span>



    </div>

  )

}



function CampoEdit({

  label,

  value,

  onChange,

  type = 'text',

}: {

  label: string

  value: string

  onChange: (valor: string) => void

  type?: string

}) {

  return (

    <div>



      <label className="mb-2 block text-xs font-semibold text-zinc-700">

        {label}

      </label>



      <input

        type={type}

        value={value}

        onChange={(e) =>

          onChange(

            e.target.value

          )

        }

        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"

      />



    </div>

  )

}



function SelectorEdit({

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