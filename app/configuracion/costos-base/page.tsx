'use client'

import Link from 'next/link'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createClient } from '@/lib/supabase/client'

type CostoBase = {
  id: number
  tipo: 'energia' | 'agua' | 'nutriente'
  nombre: string
  valor: number | string
  unidad: string
  vigente_desde: string
  observaciones: string | null
  activo: boolean
  created_at: string
}

type Modal =
  | 'energia'
  | 'agua'
  | 'nutriente'
  | null

export default function CostosBasePage() {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [costos, setCostos] =
    useState<CostoBase[]>([])

  const [cargando, setCargando] =
    useState(true)

  const [guardando, setGuardando] =
    useState(false)

  const [error, setError] =
    useState('')

  const [mensaje, setMensaje] =
    useState('')

  const [modal, setModal] =
    useState<Modal>(null)

  const [nombre, setNombre] =
    useState('')

  const [valor, setValor] =
    useState('')

  const [unidad, setUnidad] =
    useState('')

  const [vigenteDesde, setVigenteDesde] =
    useState(fechaLocal())

  const [observaciones, setObservaciones] =
    useState('')

  useEffect(() => {
    void cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    setError('')

    const { data, error } =
      await supabase
        .from('costos_base')
        .select('*')
        .order(
          'vigente_desde',
          {
            ascending: false,
          }
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )

    if (error) {
      setError(
        'No se pudieron cargar los costos base.'
      )
      setCargando(false)
      return
    }

    setCostos(
      (data ?? []) as CostoBase[]
    )

    setCargando(false)
  }

  const energiaActual =
    costos.find(
      (item) =>
        item.tipo === 'energia' &&
        item.activo
    ) ?? null

  const aguaActual =
    costos.find(
      (item) =>
        item.tipo === 'agua' &&
        item.activo
    ) ?? null

  const nutrientesActuales =
    costos.filter(
      (item) =>
        item.tipo === 'nutriente' &&
        item.activo
    )

  const historial =
    [...costos].sort(
      (a, b) =>
        new Date(
          b.vigente_desde
        ).getTime() -
        new Date(
          a.vigente_desde
        ).getTime()
    )

  function abrirEnergia() {
    setModal('energia')
    setNombre(
      'Energía eléctrica'
    )
    setValor('')
    setUnidad('ARS / kWh')
    setVigenteDesde(
      fechaLocal()
    )
    setObservaciones('')
    setError('')
    setMensaje('')
  }

  function abrirAgua() {
    setModal('agua')
    setNombre('Agua')
    setValor('')
    setUnidad('ARS / m³')
    setVigenteDesde(
      fechaLocal()
    )
    setObservaciones('')
    setError('')
    setMensaje('')
  }

  function abrirNutriente() {
    setModal('nutriente')
    setNombre('')
    setValor('')
    setUnidad('ARS / L')
    setVigenteDesde(
      fechaLocal()
    )
    setObservaciones('')
    setError('')
    setMensaje('')
  }

  async function guardar() {
    if (!modal) return

    const valorNumerico =
      numeroPositivo(valor)

    if (!nombre.trim()) {
      setError(
        'Ingresá un nombre.'
      )
      return
    }

    if (valorNumerico <= 0) {
      setError(
        'Ingresá un valor válido.'
      )
      return
    }

    if (!unidad.trim()) {
      setError(
        'Ingresá una unidad.'
      )
      return
    }

    if (!vigenteDesde) {
      setError(
        'Seleccioná una fecha de vigencia.'
      )
      return
    }

    setGuardando(true)
    setError('')
    setMensaje('')

    if (
      modal === 'energia' ||
      modal === 'agua'
    ) {
      const {
        error:
          errorDesactivar,
      } = await supabase
        .from('costos_base')
        .update({
          activo: false,
        })
        .eq(
          'tipo',
          modal
        )
        .eq(
          'activo',
          true
        )

      if (errorDesactivar) {
        setError(
          errorDesactivar.message
        )
        setGuardando(false)
        return
      }
    }

    const {
      error: errorInsertar,
    } = await supabase
      .from('costos_base')
      .insert({
        tipo: modal,
        nombre:
          nombre.trim(),
        valor:
          valorNumerico,
        unidad:
          unidad.trim(),
        vigente_desde:
          vigenteDesde,
        observaciones:
          observaciones.trim() ||
          null,
        activo: true,
      })

    if (errorInsertar) {
      setError(
        errorInsertar.message
      )
      setGuardando(false)
      return
    }

    setModal(null)

    setMensaje(
      'Costo base guardado correctamente.'
    )

    setGuardando(false)

    await cargar()
  }

  async function desactivar(
    item: CostoBase
  ) {
    const confirmar =
      window.confirm(
        `¿Desactivar "${item.nombre}"?`
      )

    if (!confirmar) return

    setError('')
    setMensaje('')

    const { error } =
      await supabase
        .from('costos_base')
        .update({
          activo: false,
        })
        .eq(
          'id',
          item.id
        )

    if (error) {
      setError(
        error.message
      )
      return
    }

    setMensaje(
      'Costo desactivado.'
    )

    await cargar()
  }

  return (
    <main className="min-h-screen bg-[#f5f6f7]">
      <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-8">

        {/* CABECERA */}

        <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div>
            <Link
              href="/configuracion"
              className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
            >
              ← Volver a Configuración
            </Link>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Configuración
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
              Costos base
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-500">
              Valores de referencia utilizados para calcular costos operativos y de producción.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={
                abrirNutriente
              }
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              + Nutriente
            </button>

            <button
              type="button"
              onClick={
                abrirAgua
              }
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              Actualizar agua
            </button>

            <button
              type="button"
              onClick={
                abrirEnergia
              }
              className="rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800"
            >
              Actualizar kWh
            </button>

          </div>
        </header>

        {mensaje && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {cargando ? (
          <section className="rounded-2xl border border-zinc-200 bg-white px-5 py-14 text-center text-sm text-zinc-500 shadow-sm">
            Cargando costos base...
          </section>
        ) : (
          <>

            {/* ENERGIA + AGUA */}

            <div className="grid gap-4 lg:grid-cols-2">

              <CostoPrincipal
                categoria="Energía"
                titulo="Electricidad"
                costo={energiaActual}
                unidadCorta="por kWh"
                vacioTitulo="Sin valor de electricidad"
                vacioDescripcion="Cargá el valor actual del kWh para comenzar a calcular costos."
              />

              <CostoPrincipal
                categoria="Servicios"
                titulo="Agua"
                costo={aguaActual}
                unidadCorta="por m³"
                vacioTitulo="Sin valor de agua"
                vacioDescripcion="Cargá el valor de referencia del agua para incorporarlo a los costos."
              />

            </div>

            {/* NUTRIENTES */}

            <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

              <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4">

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                    Cultivo
                  </p>

                  <h2 className="mt-0.5 text-base font-semibold text-zinc-950">
                    Nutrientes
                  </h2>
                </div>

                <span className="text-[11px] text-zinc-400">
                  {
                    nutrientesActuales.length
                  }{' '}
                  activos
                </span>

              </div>

              {!nutrientesActuales.length ? (
                <div className="p-5">
                  <EstadoVacio
                    titulo="Sin nutrientes configurados"
                    descripcion="Podés agregar los productos principales que quieras utilizar como referencia de costos."
                  />
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">

                  {nutrientesActuales.map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >

                        <div>
                          <p className="text-sm font-semibold text-zinc-950">
                            {
                              item.nombre
                            }
                          </p>

                          <p className="mt-1 text-[11px] text-zinc-400">
                            Vigente desde{' '}
                            {formatearFecha(
                              item.vigente_desde
                            )}
                          </p>

                          {item.observaciones && (
                            <p className="mt-1 text-xs text-zinc-500">
                              {
                                item.observaciones
                              }
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-4">

                          <div className="sm:text-right">

                            <p className="text-sm font-semibold text-zinc-950">
                              {formatearPesos(
                                numero(
                                  item.valor
                                )
                              )}
                            </p>

                            <p className="text-[10px] text-zinc-400">
                              {
                                item.unidad
                              }
                            </p>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              desactivar(
                                item
                              )
                            }
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[10px] font-semibold text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            Desactivar
                          </button>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </section>

            {/* HISTORIAL */}

            <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

              <div className="border-b border-zinc-100 px-5 py-4">

                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                  Historial
                </p>

                <h2 className="mt-0.5 text-base font-semibold text-zinc-950">
                  Valores registrados
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Los valores anteriores se conservan para no modificar costos históricos.
                </p>

              </div>

              {!historial.length ? (
                <div className="px-5 py-10 text-center text-sm text-zinc-500">
                  Todavía no hay valores registrados.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">

                  {historial
                    .slice(
                      0,
                      20
                    )
                    .map(
                      (item) => (
                        <div
                          key={
                            item.id
                          }
                          className="grid gap-3 px-5 py-3.5 sm:grid-cols-[110px_130px_minmax(0,1fr)_150px_80px] sm:items-center"
                        >

                          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                            {nombreTipo(
                              item.tipo
                            )}
                          </span>

                          <span className="text-xs text-zinc-500">
                            {formatearFecha(
                              item.vigente_desde
                            )}
                          </span>

                          <span className="text-sm font-medium text-zinc-900">
                            {
                              item.nombre
                            }
                          </span>

                          <span className="text-sm font-semibold text-zinc-950 sm:text-right">
                            {formatearPesos(
                              numero(
                                item.valor
                              )
                            )}
                          </span>

                          <span
                            className={`text-[10px] font-semibold ${
                              item.activo
                                ? 'text-emerald-700'
                                : 'text-zinc-400'
                            }`}
                          >
                            {item.activo
                              ? 'Vigente'
                              : 'Histórico'}
                          </span>

                        </div>
                      )
                    )}

                </div>
              )}

            </section>

          </>
        )}

      </div>

      {/* MODAL */}

      {modal && (
        <ModalBase
          titulo={
            modal ===
            'energia'
              ? 'Actualizar valor del kWh'
              : modal ===
                  'agua'
                ? 'Actualizar valor del agua'
                : 'Agregar nutriente'
          }
          descripcion={
            modal ===
            'nutriente'
              ? 'Registrá un producto y su valor de referencia.'
              : 'El valor anterior se conserva en el historial.'
          }
          onCerrar={() => {
            if (
              !guardando
            ) {
              setModal(
                null
              )
            }
          }}
        >

          {modal ===
            'nutriente' && (
            <Campo titulo="Nombre">
              <input
                value={
                  nombre
                }
                onChange={(
                  event
                ) =>
                  setNombre(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Ej. Advanced Nutrients A+B"
                className="campo-costos"
              />
            </Campo>
          )}

          <div
            className={`grid gap-4 ${
              modal ===
              'nutriente'
                ? 'mt-4 sm:grid-cols-2'
                : ''
            }`}
          >

            <Campo
              titulo={
                modal ===
                'energia'
                  ? 'Valor por kWh'
                  : modal ===
                      'agua'
                    ? 'Valor por m³'
                    : 'Precio'
              }
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  valor
                }
                onChange={(
                  event
                ) =>
                  setValor(
                    event
                      .target
                      .value
                  )
                }
                className="campo-costos"
              />
            </Campo>

            {modal ===
              'nutriente' && (
              <Campo titulo="Unidad">
                <select
                  value={
                    unidad
                  }
                  onChange={(
                    event
                  ) =>
                    setUnidad(
                      event
                        .target
                        .value
                    )
                  }
                  className="campo-costos"
                >
                  <option value="ARS / L">
                    ARS / L
                  </option>

                  <option value="ARS / ml">
                    ARS / ml
                  </option>

                  <option value="ARS / kg">
                    ARS / kg
                  </option>

                  <option value="ARS / g">
                    ARS / g
                  </option>

                  <option value="ARS / unidad">
                    ARS / unidad
                  </option>
                </select>
              </Campo>
            )}

          </div>

          <div className="mt-4">

            <Campo titulo="Vigente desde">
              <input
                type="date"
                value={
                  vigenteDesde
                }
                onChange={(
                  event
                ) =>
                  setVigenteDesde(
                    event
                      .target
                      .value
                  )
                }
                className="campo-costos"
              />
            </Campo>

          </div>

          <div className="mt-4">

            <Campo titulo="Observaciones">
              <input
                value={
                  observaciones
                }
                onChange={(
                  event
                ) =>
                  setObservaciones(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Opcional"
                className="campo-costos"
              />
            </Campo>

          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4">

            <button
              type="button"
              disabled={
                guardando
              }
              onClick={() =>
                setModal(
                  null
                )
              }
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={
                guardando
              }
              onClick={
                guardar
              }
              className="rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:bg-zinc-300"
            >
              {guardando
                ? 'Guardando...'
                : 'Guardar'}
            </button>

          </div>

        </ModalBase>
      )}

      <style jsx global>{`
        .campo-costos {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(228 228 231);
          background: white;
          padding: 0.72rem 0.85rem;
          font-size: 0.875rem;
          color: rgb(24 24 27);
          outline: none;
          transition: all 150ms ease;
        }

        .campo-costos:focus {
          border-color: rgb(52 211 153);
          box-shadow: 0 0 0 4px rgb(209 250 229);
        }
      `}</style>

    </main>
  )
}

function CostoPrincipal({
  categoria,
  titulo,
  costo,
  unidadCorta,
  vacioTitulo,
  vacioDescripcion,
}: {
  categoria: string
  titulo: string
  costo: CostoBase | null
  unidadCorta: string
  vacioTitulo: string
  vacioDescripcion: string
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

      <div className="border-b border-zinc-100 px-5 py-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400">
          {categoria}
        </p>

        <h2 className="mt-0.5 text-base font-semibold text-zinc-950">
          {titulo}
        </h2>
      </div>

      <div className="p-5">

        {costo ? (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-400">
                Valor vigente
              </p>

              <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
                {formatearPesos(
                  numero(
                    costo.valor
                  )
                )}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {unidadCorta}
              </p>
            </div>

            <div className="rounded-xl bg-zinc-50 px-4 py-3 sm:text-right">

              <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-400">
                Vigente desde
              </p>

              <p className="mt-1 text-sm font-semibold text-zinc-900">
                {formatearFecha(
                  costo.vigente_desde
                )}
              </p>

            </div>

          </div>
        ) : (
          <EstadoVacio
            titulo={
              vacioTitulo
            }
            descripcion={
              vacioDescripcion
            }
          />
        )}

      </div>

    </section>
  )
}

function Campo({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <label className="block">

      <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
        {titulo}
      </span>

      {children}

    </label>
  )
}

function EstadoVacio({
  titulo,
  descripcion,
}: {
  titulo: string
  descripcion: string
}) {
  return (
    <div className="rounded-xl bg-zinc-50 px-5 py-7 text-center">

      <p className="text-sm font-semibold text-zinc-800">
        {titulo}
      </p>

      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-zinc-500">
        {descripcion}
      </p>

    </div>
  )
}

function ModalBase({
  titulo,
  descripcion,
  onCerrar,
  children,
}: {
  titulo: string
  descripcion: string
  onCerrar: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[1px]">

      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl">

        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">

          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              {titulo}
            </h2>

            <p className="mt-1 text-xs leading-5 text-zinc-500">
              {descripcion}
            </p>
          </div>

          <button
            type="button"
            onClick={
              onCerrar
            }
            className="shrink-0 rounded-lg bg-zinc-100 px-3 py-2 text-[10px] font-semibold text-zinc-600 transition hover:bg-zinc-200"
          >
            Cerrar
          </button>

        </div>

        <div className="p-5">
          {children}
        </div>

      </div>

    </div>
  )
}

function numero(
  valor: unknown
) {
  const n =
    Number(valor)

  return Number.isFinite(
    n
  )
    ? n
    : 0
}

function numeroPositivo(
  valor: string
) {
  const n =
    Number(
      String(
        valor
      ).replace(
        ',',
        '.'
      )
    )

  return Number.isFinite(
    n
  ) && n > 0
    ? n
    : 0
}

function fechaLocal() {
  const hoy =
    new Date()

  return `${hoy.getFullYear()}-${String(
    hoy.getMonth() + 1
  ).padStart(
    2,
    '0'
  )}-${String(
    hoy.getDate()
  ).padStart(
    2,
    '0'
  )}`
}

function formatearFecha(
  fecha: string
) {
  return new Intl.DateTimeFormat(
    'es-AR'
  ).format(
    new Date(
      `${fecha.slice(
        0,
        10
      )}T12:00:00`
    )
  )
}

function formatearPesos(
  valor: number
) {
  return new Intl.NumberFormat(
    'es-AR',
    {
      style:
        'currency',
      currency:
        'ARS',
      maximumFractionDigits:
        2,
    }
  ).format(
    valor
  )
}

function nombreTipo(
  tipo: CostoBase['tipo']
) {
  if (
    tipo === 'energia'
  ) {
    return 'Energía'
  }

  if (
    tipo === 'agua'
  ) {
    return 'Agua'
  }

  return 'Nutriente'
}