'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createClient } from '@/lib/supabase/client'

const TIPOS_SALA = [
  'Floración',
  'Vegetación',
  'Secado',
  'Nursery',
  'Otro',
]

const ORDEN_CATEGORIAS = [
  'Iluminación',
  'Climatización',
  'Movimiento de aire',
  'Renovación de aire',
  'Filtrado',
  'Monitoreo',
  'Control',
  'Otros',
]

type TipoCama = {
  id: number
  nombre: string
  ancho: number | string
  largo: number | string
  capacidad_plantas: number
  superficie_m2: number | string
}

type CatalogoEquipo = {
  id: number
  nombre: string
  categoria: string
  calcula_consumo: boolean
}

type EquipoForm = {
  seleccionado: boolean
  cantidad: string
  potencia_w: string
  horas_uso_dia: string
  observaciones: string
}

export default function NuevaSalaPage() {
  const router = useRouter()

  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [nombre, setNombre] =
    useState('')

  const [tipo, setTipo] =
    useState('Floración')

  const [ancho, setAncho] =
    useState('')

  const [largo, setLargo] =
    useState('')

  const [alto, setAlto] =
    useState('')

  const [
    observaciones,
    setObservaciones,
  ] = useState('')

  const [
    tiposCama,
    setTiposCama,
  ] = useState<TipoCama[]>([])

  const [
    cantidadesCamas,
    setCantidadesCamas,
  ] = useState<
    Record<number, string>
  >({})

  const [
    catalogoEquipos,
    setCatalogoEquipos,
  ] = useState<
    CatalogoEquipo[]
  >([])

  const [
    equipos,
    setEquipos,
  ] = useState<
    Record<number, EquipoForm>
  >({})

  const [
    cargando,
    setCargando,
  ] = useState(true)

  const [
    guardando,
    setGuardando,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  useEffect(() => {
    cargarConfiguracion()
  }, [])

  async function cargarConfiguracion() {
    setCargando(true)
    setError('')

    const [
      resultadoCamas,
      resultadoEquipos,
    ] = await Promise.all([
      supabase
        .from('tipos_cama')
        .select(`
          id,
          nombre,
          ancho,
          largo,
          capacidad_plantas,
          superficie_m2
        `)
        .eq('activa', true)
        .order('id'),

      supabase
        .from('catalogo_equipos')
        .select(`
          id,
          nombre,
          categoria,
          calcula_consumo
        `)
        .eq('activa', true)
        .eq('ambito', 'Sala')
        .order('categoria')
        .order('nombre'),
    ])

    if (resultadoCamas.error) {
      console.error(
        resultadoCamas.error
      )

      setError(
        'No se pudieron cargar los tipos de cama.'
      )

      setCargando(false)
      return
    }

    if (resultadoEquipos.error) {
      console.error(
        resultadoEquipos.error
      )

      setError(
        'No se pudo cargar el equipamiento de sala.'
      )

      setCargando(false)
      return
    }

    const camas =
      (resultadoCamas.data ??
        []) as TipoCama[]

    const catalogo =
      (resultadoEquipos.data ??
        []) as CatalogoEquipo[]

    setTiposCama(camas)

    setCatalogoEquipos(
      catalogo
    )

    const cantidadesIniciales:
      Record<number, string> =
        {}

    camas.forEach(
      (cama) => {
        cantidadesIniciales[
          cama.id
        ] = '0'
      }
    )

    setCantidadesCamas(
      cantidadesIniciales
    )

    const equiposIniciales:
      Record<
        number,
        EquipoForm
      > = {}

    catalogo.forEach(
      (equipo) => {
        equiposIniciales[
          equipo.id
        ] = {
          seleccionado:
            false,

          cantidad:
            '1',

          potencia_w:
            '',

          horas_uso_dia:
            '',

          observaciones:
            '',
        }
      }
    )

    setEquipos(
      equiposIniciales
    )

    setCargando(false)
  }

  const anchoNumero =
    convertirNumero(ancho)

  const largoNumero =
    convertirNumero(largo)

  const altoNumero =
    convertirNumero(alto)

  const superficieSala =
    anchoNumero > 0 &&
    largoNumero > 0
      ? anchoNumero *
        largoNumero
      : null

  const volumen =
    superficieSala !== null &&
    altoNumero > 0
      ? superficieSala *
        altoNumero
      : null

  const totalCamas =
    tiposCama.reduce(
      (total, cama) =>
        total +
        convertirEntero(
          cantidadesCamas[
            cama.id
          ] || '0'
        ),
      0
    )

  const superficieCamas =
    tiposCama.reduce(
      (total, cama) => {
        const cantidad =
          convertirEntero(
            cantidadesCamas[
              cama.id
            ] || '0'
          )

        return (
          total +
          cantidad *
            Number(
              cama.superficie_m2
            )
        )
      },
      0
    )

  const capacidadMaxima =
    tiposCama.reduce(
      (total, cama) => {
        const cantidad =
          convertirEntero(
            cantidadesCamas[
              cama.id
            ] || '0'
          )

        return (
          total +
          cantidad *
            cama.capacidad_plantas
        )
      },
      0
    )

  const superficieLibre =
    superficieSala !== null
      ? superficieSala -
        superficieCamas
      : null

  const porcentajeCamas =
    superficieSala &&
    superficieSala > 0
      ? (
          superficieCamas /
          superficieSala
        ) *
        100
      : null

  const camasExceden =
    superficieLibre !== null &&
    superficieLibre < 0

  const equiposSeleccionados =
    catalogoEquipos.filter(
      (equipo) =>
        equipos[equipo.id]
          ?.seleccionado
    )

  const cantidadEquipos =
    equiposSeleccionados.reduce(
      (total, equipo) =>
        total +
        convertirEntero(
          equipos[equipo.id]
            ?.cantidad || '0'
        ),
      0
    )

  const consumoDia =
    equiposSeleccionados.reduce(
      (total, equipo) =>
        total +
        calcularConsumoEquipo(
          equipos[equipo.id],
          equipo.calcula_consumo
        ),
      0
    )

  const consumoMes =
    consumoDia * 30

  const categorias =
    useMemo(() => {
      const mapa =
        new Map<
          string,
          CatalogoEquipo[]
        >()

      catalogoEquipos.forEach(
        (equipo) => {
          const lista =
            mapa.get(
              equipo.categoria
            ) || []

          lista.push(equipo)

          mapa.set(
            equipo.categoria,
            lista
          )
        }
      )

      return Array.from(
        mapa.entries()
      ).sort(
        (
          [categoriaA],
          [categoriaB]
        ) => {
          const a =
            ORDEN_CATEGORIAS.indexOf(
              categoriaA
            )

          const b =
            ORDEN_CATEGORIAS.indexOf(
              categoriaB
            )

          return (
            (a === -1 ? 999 : a) -
            (b === -1 ? 999 : b)
          )
        }
      )
    }, [catalogoEquipos])

  function cambiarCantidadCama(
    id: number,
    valor: string
  ) {
    setCantidadesCamas(
      (actual) => ({
        ...actual,
        [id]: valor,
      })
    )
  }

  function toggleEquipo(
    id: number
  ) {
    setEquipos(
      (actual) => ({
        ...actual,

        [id]: {
          ...actual[id],

          seleccionado:
            !actual[id]
              ?.seleccionado,
        },
      })
    )
  }

  function cambiarEquipo(
    id: number,
    campo:
      | 'cantidad'
      | 'potencia_w'
      | 'horas_uso_dia'
      | 'observaciones',
    valor: string
  ) {
    setEquipos(
      (actual) => ({
        ...actual,

        [id]: {
          ...actual[id],
          [campo]: valor,
        },
      })
    )
  }

  async function guardarSala(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setError('')

    const nombreLimpio =
      nombre.trim()

    if (!nombreLimpio) {
      setError(
        'Ingresá un nombre para la sala.'
      )
      return
    }

    if (
      ancho &&
      anchoNumero <= 0
    ) {
      setError(
        'El ancho debe ser mayor a 0.'
      )
      return
    }

    if (
      largo &&
      largoNumero <= 0
    ) {
      setError(
        'El largo debe ser mayor a 0.'
      )
      return
    }

    if (
      alto &&
      altoNumero <= 0
    ) {
      setError(
        'El alto debe ser mayor a 0.'
      )
      return
    }

    if (camasExceden) {
      setError(
        'La superficie de las camas supera la superficie de la sala.'
      )
      return
    }

    for (
      const equipo
      of equiposSeleccionados
    ) {
      const datos =
        equipos[equipo.id]

      const cantidad =
        convertirEntero(
          datos.cantidad
        )

      if (cantidad <= 0) {
        setError(
          `Revisá la cantidad de ${equipo.nombre}.`
        )
        return
      }

      if (
        equipo.calcula_consumo &&
        datos.potencia_w
      ) {
        const potencia =
          convertirNumero(
            datos.potencia_w
          )

        if (potencia < 0) {
          setError(
            `Revisá la potencia eléctrica de ${equipo.nombre}.`
          )
          return
        }
      }

      if (
        equipo.calcula_consumo &&
        datos.horas_uso_dia
      ) {
        const horas =
          convertirNumero(
            datos.horas_uso_dia
          )

        if (
          horas < 0 ||
          horas > 24
        ) {
          setError(
            `El uso diario de ${equipo.nombre} debe estar entre 0 y 24 horas.`
          )
          return
        }
      }
    }

    const camasPayload =
      tiposCama
        .map(
          (cama) => ({
            tipo_cama_id:
              cama.id,

            cantidad:
              convertirEntero(
                cantidadesCamas[
                  cama.id
                ] || '0'
              ),
          })
        )
        .filter(
          (cama) =>
            cama.cantidad > 0
        )

    const equiposPayload =
      equiposSeleccionados.map(
        (equipo) => {
          const datos =
            equipos[equipo.id]

          return {
            catalogo_equipo_id:
              equipo.id,

            cantidad:
              convertirEntero(
                datos.cantidad
              ),

            potencia_w:
              equipo.calcula_consumo &&
              datos.potencia_w
                ? convertirNumero(
                    datos.potencia_w
                  )
                : null,

            horas_uso_dia:
              equipo.calcula_consumo &&
              datos.horas_uso_dia
                ? convertirNumero(
                    datos.horas_uso_dia
                  )
                : null,

            /*
            Factor preparado para futuro.

            En esta primera versión NO lo pide
            el usuario.

            Usamos 100 para obtener consumo
            eléctrico teórico.
            */
            factor_uso_pct:
              100,

            observaciones:
              datos.observaciones
                .trim() ||
              null,
          }
        }
      )

    setGuardando(true)

    const {
      error: rpcError,
    } = await supabase.rpc(
      'crear_sala_completa',
      {
        p_nombre:
          nombreLimpio,

        p_tipo:
          tipo,

        p_ancho:
          ancho
            ? anchoNumero
            : null,

        p_largo:
          largo
            ? largoNumero
            : null,

        p_alto:
          alto
            ? altoNumero
            : null,

        p_observaciones:
          observaciones
            .trim() ||
          null,

        p_camas:
          camasPayload,

        p_equipos:
          equiposPayload,
      }
    )

    if (rpcError) {
      console.error(
        rpcError
      )

      setError(
        rpcError.code ===
          '23505'
          ? 'Ya existe una sala con ese nombre.'
          : rpcError.message ||
            'No se pudo crear la sala.'
      )

      setGuardando(false)
      return
    }

    router.push(
      '/cultivo'
    )

    router.refresh()
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-[#f5f6f7]">

        <div className="mx-auto max-w-[1350px] px-6 py-8">

          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 shadow-sm">
            Cargando configuración de sala...
          </div>

        </div>

      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f6f7]">

      <div className="mx-auto max-w-[1350px] px-6 py-8 lg:px-8">

        <Link
          href="/cultivo"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-950"
        >
          ← Volver a Cultivo
        </Link>

        <div className="mt-6">

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Cultivo
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            Nueva sala
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Configurá las características físicas y el equipamiento de la sala.
          </p>

        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">

          <form
            onSubmit={
              guardarSala
            }
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >

            {/* INFORMACIÓN */}

            <Seccion
              numero="1"
              titulo="Información básica"
              descripcion="Identificación general de la sala."
            >

              <div className="grid gap-4 md:grid-cols-2">

                <Campo>

                  <label className="etiqueta">
                    Nombre
                  </label>

                  <input
                    value={nombre}
                    onChange={(e) =>
                      setNombre(
                        e.target.value
                      )
                    }
                    placeholder="Ej. Sala 1"
                    className="campo"
                  />

                </Campo>

                <Campo>

                  <label className="etiqueta">
                    Tipo
                  </label>

                  <select
                    value={tipo}
                    onChange={(e) =>
                      setTipo(
                        e.target.value
                      )
                    }
                    className="campo"
                  >

                    {TIPOS_SALA.map(
                      (opcion) => (
                        <option
                          key={
                            opcion
                          }
                          value={
                            opcion
                          }
                        >
                          {opcion}
                        </option>
                      )
                    )}

                  </select>

                </Campo>

              </div>

            </Seccion>

            {/* DIMENSIONES */}

            <Seccion
              numero="2"
              titulo="Dimensiones"
              descripcion="Medidas internas del espacio."
            >

              <div className="grid gap-4 sm:grid-cols-3">

                <CampoMedida
                  titulo="Ancho"
                  valor={ancho}
                  onChange={
                    setAncho
                  }
                />

                <CampoMedida
                  titulo="Largo"
                  valor={largo}
                  onChange={
                    setLargo
                  }
                />

                <CampoMedida
                  titulo="Alto"
                  valor={alto}
                  onChange={
                    setAlto
                  }
                />

              </div>

            </Seccion>

            {/* CAMAS */}

            <Seccion
              numero="3"
              titulo="Camas"
              descripcion="Configuración física de camas dentro de la sala."
            >

              <div className="grid gap-3 md:grid-cols-2">

                {tiposCama.map(
                  (cama) => {
                    const cantidad =
                      convertirEntero(
                        cantidadesCamas[
                          cama.id
                        ] || '0'
                      )

                    return (
                      <div
                        key={
                          cama.id
                        }
                        className={`rounded-xl border p-4 transition ${
                          cantidad > 0
                            ? 'border-emerald-200 bg-emerald-50/30'
                            : 'border-zinc-200 bg-zinc-50/50'
                        }`}
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div>

                            <p className="text-sm font-semibold text-zinc-900">
                              {cama.nombre}
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {formatear(
                                Number(
                                  cama.superficie_m2
                                )
                              )}{' '}
                              m²
                              {' · '}
                              {
                                cama.capacidad_plantas
                              }{' '}
                              plantas
                            </p>

                          </div>

                          <span className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
                            {
                              cama.capacidad_plantas
                            }{' '}
                            máx.
                          </span>

                        </div>

                        <div className="mt-4 flex items-end gap-3">

                          <div className="flex-1">

                            <label className="etiqueta">
                              Cantidad
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={
                                cantidadesCamas[
                                  cama.id
                                ] || '0'
                              }
                              onChange={(e) =>
                                cambiarCantidadCama(
                                  cama.id,
                                  e.target.value
                                )
                              }
                              className="campo"
                            />

                          </div>

                          {cantidad >
                            0 && (
                            <div className="pb-3 text-right">

                              <p className="text-[10px] uppercase tracking-[0.06em] text-zinc-400">
                                Capacidad
                              </p>

                              <p className="mt-1 text-sm font-semibold text-emerald-700">
                                {cantidad *
                                  cama.capacidad_plantas}{' '}
                                plantas
                              </p>

                            </div>
                          )}

                        </div>

                      </div>
                    )
                  }
                )}

              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">

                <MiniDato
                  titulo="Total camas"
                  valor={String(
                    totalCamas
                  )}
                />

                <MiniDato
                  titulo="Capacidad máxima"
                  valor={`${capacidadMaxima} plantas`}
                />

                <MiniDato
                  titulo="Superficie camas"
                  valor={`${formatear(
                    superficieCamas
                  )} m²`}
                />

              </div>

            </Seccion>

            {/* EQUIPAMIENTO */}

            <Seccion
              numero="4"
              titulo="Equipamiento"
              descripcion="Seleccioná los equipos y componentes instalados dentro de esta sala."
            >

              <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">

                <p className="text-xs font-semibold text-zinc-700">
                  Consumo eléctrico
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Para los equipos eléctricos cargá la potencia eléctrica indicada por el fabricante y las horas de uso diario. El sistema calcula automáticamente el consumo teórico.
                </p>

              </div>

              <div className="space-y-5">

                {categorias.map(
                  ([
                    categoria,
                    lista,
                  ]) => (

                    <div
                      key={
                        categoria
                      }
                    >

                      <div className="mb-2 flex items-center gap-3">

                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                          {categoria}
                        </p>

                        <div className="h-px flex-1 bg-zinc-100" />

                      </div>

                      <div className="space-y-2">

                        {lista.map(
                          (equipo) => (

                            <EquipoRow
                              key={
                                equipo.id
                              }
                              equipo={
                                equipo
                              }
                              datos={
                                equipos[
                                  equipo.id
                                ]
                              }
                              onToggle={() =>
                                toggleEquipo(
                                  equipo.id
                                )
                              }
                              onChange={(
                                campo,
                                valor
                              ) =>
                                cambiarEquipo(
                                  equipo.id,
                                  campo,
                                  valor
                                )
                              }
                            />

                          )
                        )}

                      </div>

                    </div>

                  )
                )}

              </div>

            </Seccion>

            {/* OBSERVACIONES */}

            <Seccion
              numero="5"
              titulo="Observaciones"
              descripcion="Información adicional de la sala."
            >

              <textarea
                rows={3}
                value={
                  observaciones
                }
                onChange={(e) =>
                  setObservaciones(
                    e.target.value
                  )
                }
                placeholder="Observaciones..."
                className="campo resize-none"
              />

            </Seccion>

            {/* ACCIONES */}

            <div className="flex flex-col-reverse gap-3 bg-zinc-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-xs text-zinc-400">
                La información se guarda al crear la sala.
              </p>

              <div className="flex gap-2">

                <Link
                  href="/cultivo"
                  className="flex-1 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-center text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 sm:flex-none"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  disabled={
                    guardando
                  }
                  className="flex-1 rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 sm:flex-none"
                >
                  {guardando
                    ? 'Creando...'
                    : 'Crear sala'}
                </button>

              </div>

            </div>

          </form>

          {/* RESUMEN */}

          <aside className="h-fit xl:sticky xl:top-6">

            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

              <div className="border-b border-zinc-100 px-5 py-5">

                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                  Resumen de sala
                </p>

                <div className="mt-2 flex items-start justify-between gap-3">

                  <div>

                    <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                      {nombre.trim() ||
                        'Nueva sala'}
                    </h2>

                    <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      {tipo}
                    </span>

                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
                    <IconoSala />
                  </div>

                </div>

              </div>

              <div className="p-5">

                <div className="grid grid-cols-2 gap-2">

                  <ResumenCard
                    titulo="Superficie"
                    valor={
                      superficieSala !==
                      null
                        ? `${formatear(
                            superficieSala
                          )} m²`
                        : '—'
                    }
                  />

                  <ResumenCard
                    titulo="Volumen"
                    valor={
                      volumen !==
                      null
                        ? `${formatear(
                            volumen
                          )} m³`
                        : '—'
                    }
                  />

                  <ResumenCard
                    titulo="Camas"
                    valor={String(
                      totalCamas
                    )}
                  />

                  <ResumenCard
                    titulo="Capacidad"
                    valor={String(
                      capacidadMaxima
                    )}
                    detalle="plantas"
                  />

                </div>

                <div className="mt-5 space-y-3">

                  <ResumenLinea
                    titulo="Superficie camas"
                    valor={`${formatear(
                      superficieCamas
                    )} m²`}
                  />

                  <ResumenLinea
                    titulo="Espacio libre"
                    valor={
                      superficieLibre !==
                      null
                        ? `${formatear(
                            superficieLibre
                          )} m²`
                        : '—'
                    }
                    alerta={
                      camasExceden
                    }
                  />

                  <ResumenLinea
                    titulo="Equipos instalados"
                    valor={String(
                      cantidadEquipos
                    )}
                  />

                </div>

                {porcentajeCamas !==
                  null &&
                  !camasExceden && (

                  <div className="mt-5 rounded-xl bg-zinc-50 p-4">

                    <div className="flex items-center justify-between">

                      <span className="text-xs font-medium text-zinc-600">
                        Ocupación por camas
                      </span>

                      <span className="text-xs font-semibold text-zinc-900">
                        {formatear(
                          porcentajeCamas
                        )}
                        %
                      </span>

                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">

                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{
                          width: `${Math.min(
                            porcentajeCamas,
                            100
                          )}%`,
                        }}
                      />

                    </div>

                    {superficieLibre !==
                      null && (
                      <p className="mt-2 text-[11px] text-zinc-400">
                        {formatear(
                          superficieLibre
                        )}{' '}
                        m² disponibles para circulación y equipamiento.
                      </p>
                    )}

                  </div>

                )}

                <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">

                  <p className="text-xs font-semibold text-zinc-700">
                    Consumo eléctrico teórico
                  </p>

                  <div className="mt-3 flex items-end justify-between">

                    <div>

                      <span className="text-2xl font-semibold tracking-tight text-zinc-950">
                        {formatear(
                          consumoDia
                        )}
                      </span>

                      <span className="ml-1 text-xs text-zinc-500">
                        kWh/día
                      </span>

                    </div>

                    <div className="text-right">

                      <p className="text-sm font-semibold text-zinc-800">
                        {formatear(
                          consumoMes
                        )}{' '}
                        kWh
                      </p>

                      <p className="text-[10px] text-zinc-400">
                        teórico mensual
                      </p>

                    </div>

                  </div>

                  <p className="mt-3 text-[10px] leading-4 text-zinc-400">
                    Basado en potencia nominal y horas configuradas.
                  </p>

                </div>

                {equiposSeleccionados.length >
                  0 && (

                  <div className="mt-5">

                    <p className="mb-3 text-xs font-semibold text-zinc-700">
                      Equipamiento
                    </p>

                    <div className="space-y-2">

                      {equiposSeleccionados.map(
                        (equipo) => {
                          const datos =
                            equipos[
                              equipo.id
                            ]

                          const consumo =
                            calcularConsumoEquipo(
                              datos,
                              equipo.calcula_consumo
                            )

                          return (
                            <div
                              key={
                                equipo.id
                              }
                              className="flex items-center justify-between gap-3 text-xs"
                            >

                              <span className="truncate text-zinc-500">
                                {
                                  datos.cantidad
                                }
                                ×{' '}
                                {
                                  equipo.nombre
                                }
                              </span>

                              <span className="shrink-0 font-semibold text-zinc-700">
                                {!equipo.calcula_consumo
                                  ? '—'
                                  : consumo > 0
                                    ? `${formatear(
                                        consumo
                                      )} kWh/d`
                                    : 'Pendiente'}
                              </span>

                            </div>
                          )
                        }
                      )}

                    </div>

                  </div>

                )}

              </div>

            </div>

          </aside>

        </div>

      </div>

      <style jsx global>{`
        .campo {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(228 228 231);
          background: white;
          padding: 0.72rem 0.9rem;
          font-size: 0.875rem;
          color: rgb(24 24 27);
          outline: none;
          transition: all 150ms ease;
        }

        .campo:focus {
          border-color: rgb(161 161 170);
          box-shadow: 0 0 0 4px rgb(244 244 245);
        }

        .etiqueta {
          margin-bottom: 0.45rem;
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgb(82 82 91);
        }
      `}</style>

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
  children: ReactNode
}) {
  return (
    <section className="border-b border-zinc-200 px-5 py-5">

      <div className="mb-4 flex items-start gap-3">

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[11px] font-bold text-emerald-700">
          {numero}
        </div>

        <div>

          <h2 className="text-sm font-semibold text-zinc-950">
            {titulo}
          </h2>

          <p className="mt-0.5 text-xs leading-5 text-zinc-500">
            {descripcion}
          </p>

        </div>

      </div>

      {children}

    </section>
  )
}

function Campo({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div>
      {children}
    </div>
  )
}

function CampoMedida({
  titulo,
  valor,
  onChange,
}: {
  titulo: string
  valor: string
  onChange: (
    valor: string
  ) => void
}) {
  return (
    <div>

      <label className="etiqueta">
        {titulo}
      </label>

      <div className="relative">

        <input
          type="number"
          min="0"
          step="0.01"
          value={valor}
          onChange={(e) =>
            onChange(
              e.target.value
            )
          }
          placeholder="0"
          className="campo pr-10"
        />

        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">
          m
        </span>

      </div>

    </div>
  )
}

function MiniDato({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2.5">

      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-zinc-400">
        {titulo}
      </p>

      <p className="mt-1 text-sm font-semibold text-zinc-900">
        {valor}
      </p>

    </div>
  )
}

function EquipoRow({
  equipo,
  datos,
  onToggle,
  onChange,
}: {
  equipo: CatalogoEquipo
  datos: EquipoForm
  onToggle: () => void
  onChange: (
    campo:
      | 'cantidad'
      | 'potencia_w'
      | 'horas_uso_dia'
      | 'observaciones',
    valor: string
  ) => void
}) {
  if (!datos) {
    return null
  }

  const consumo =
    calcularConsumoEquipo(
      datos,
      equipo.calcula_consumo
    )

  if (!datos.seleccionado) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
      >

        <div>

          <p className="text-sm font-medium text-zinc-800">
            {equipo.nombre}
          </p>

          {!equipo.calcula_consumo && (
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Sin cálculo eléctrico
            </p>
          )}

        </div>

        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-base font-medium text-zinc-500">
          +
        </div>

      </button>
    )
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/20">

      <div className="flex items-center justify-between gap-4 px-4 py-3">

        <div className="flex items-center gap-3">

          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700">
            ✓
          </div>

          <div>

            <p className="text-sm font-semibold text-zinc-900">
              {equipo.nombre}
            </p>

            {equipo.calcula_consumo ? (
              <p className="mt-0.5 text-[11px] font-medium text-emerald-700">
                {consumo > 0
                  ? `${formatear(
                      consumo
                    )} kWh/día teóricos`
                  : 'Completá potencia y horas para calcular consumo'}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-zinc-400">
                No participa del cálculo eléctrico
              </p>
            )}

          </div>

        </div>

        <button
          type="button"
          onClick={onToggle}
          className="text-xs font-semibold text-zinc-400 transition hover:text-red-600"
        >
          Quitar
        </button>

      </div>

      <div className="border-t border-emerald-100 bg-white/70 px-4 py-4">

        {equipo.calcula_consumo ? (

          <div className="grid gap-3 sm:grid-cols-3">

            <CampoEquipo
              titulo="Cantidad"
              valor={
                datos.cantidad
              }
              unidad=""
              step="1"
              onChange={(valor) =>
                onChange(
                  'cantidad',
                  valor
                )
              }
            />

            <CampoEquipo
              titulo="Potencia eléctrica c/u"
              valor={
                datos.potencia_w
              }
              unidad="W"
              step="1"
              onChange={(valor) =>
                onChange(
                  'potencia_w',
                  valor
                )
              }
            />

            <CampoEquipo
              titulo="Uso diario"
              valor={
                datos.horas_uso_dia
              }
              unidad="h"
              step="0.1"
              onChange={(valor) =>
                onChange(
                  'horas_uso_dia',
                  valor
                )
              }
            />

          </div>

        ) : (

          <div className="max-w-[220px]">

            <CampoEquipo
              titulo="Cantidad"
              valor={
                datos.cantidad
              }
              unidad=""
              step="1"
              onChange={(valor) =>
                onChange(
                  'cantidad',
                  valor
                )
              }
            />

          </div>

        )}

        <input
          value={
            datos.observaciones
          }
          onChange={(e) =>
            onChange(
              'observaciones',
              e.target.value
            )
          }
          placeholder="Observaciones del equipo..."
          className="campo mt-3"
        />

      </div>

    </div>
  )
}

function CampoEquipo({
  titulo,
  valor,
  unidad,
  step,
  onChange,
}: {
  titulo: string
  valor: string
  unidad: string
  step: string
  onChange: (
    valor: string
  ) => void
}) {
  return (
    <div>

      <label className="etiqueta">
        {titulo}
      </label>

      <div className="relative">

        <input
          type="number"
          min="0"
          step={step}
          value={valor}
          onChange={(e) =>
            onChange(
              e.target.value
            )
          }
          className={
            unidad
              ? 'campo pr-10'
              : 'campo'
          }
        />

        {unidad && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] text-zinc-400">
            {unidad}
          </span>
        )}

      </div>

    </div>
  )
}

function ResumenCard({
  titulo,
  valor,
  detalle,
}: {
  titulo: string
  valor: string
  detalle?: string
}) {
  return (
    <div className="rounded-xl bg-zinc-50 p-3">

      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-zinc-400">
        {titulo}
      </p>

      <p className="mt-1 text-lg font-semibold tracking-tight text-zinc-950">
        {valor}
      </p>

      {detalle && (
        <p className="text-[10px] text-zinc-400">
          {detalle}
        </p>
      )}

    </div>
  )
}

function ResumenLinea({
  titulo,
  valor,
  alerta = false,
}: {
  titulo: string
  valor: string
  alerta?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">

      <span className="text-xs text-zinc-500">
        {titulo}
      </span>

      <span
        className={`text-sm font-semibold ${
          alerta
            ? 'text-red-600'
            : 'text-zinc-800'
        }`}
      >
        {valor}
      </span>

    </div>
  )
}

function IconoSala() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 20V7l8-4 8 4v13" />
      <path d="M4 10h16" />
      <path d="M8 14h3v6H8z" />
      <path d="M14 14h2" />
      <path d="M14 17h2" />
    </svg>
  )
}

function calcularConsumoEquipo(
  datos:
    | EquipoForm
    | undefined,
  calculaConsumo: boolean
) {
  if (
    !datos ||
    !datos.seleccionado ||
    !calculaConsumo
  ) {
    return 0
  }

  const cantidad =
    convertirEntero(
      datos.cantidad
    )

  const potencia =
    convertirNumero(
      datos.potencia_w
    )

  const horas =
    convertirNumero(
      datos.horas_uso_dia
    )

  if (
    cantidad <= 0 ||
    potencia <= 0 ||
    horas <= 0
  ) {
    return 0
  }

  return (
    cantidad *
    potencia *
    horas
  ) / 1000
}

function convertirNumero(
  valor: string
) {
  if (!valor) {
    return 0
  }

  const numero =
    Number(
      valor.replace(
        ',',
        '.'
      )
    )

  return Number.isFinite(
    numero
  )
    ? numero
    : 0
}

function convertirEntero(
  valor: string
) {
  const numero =
    Number(valor)

  if (
    !Number.isFinite(
      numero
    )
  ) {
    return 0
  }

  return Math.max(
    0,
    Math.floor(
      numero
    )
  )
}

function formatear(
  valor: number
) {
  return new Intl.NumberFormat(
    'es-AR',
    {
      maximumFractionDigits: 2,
    }
  ).format(valor)
}