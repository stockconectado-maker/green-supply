'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { createClient } from '@/lib/supabase/client'

type CamaBasica = {
  cama_id: number
  nombre: string
  capacidad_plantas: number
  superficie_m2: number | string | null
}

type GeneticaCatalogo = {
  id: number
  nombre: string
  activa: boolean
}

type CicloResumen = {
  ciclo_id: number
  sala_id: number
  numero_ciclo: number
  codigo_cosecha: string
  estado: string
  etapa_actual: 'Vegetación' | 'Floración'
  fecha_inicio: string
  fecha_inicio_floracion: string | null
  fecha_corte_planificada: string | null
  fecha_corte_real: string | null
  observaciones: string | null
  cantidad_total: number
  geneticas_total: number
  camas_utilizadas: number
  dia_floracion: number | null
  semana_floracion: number | null
  dia_semana_floracion: number | null
  fecha_dia_21: string | null
  dias_restantes_corte: number | null
  progreso_floracion_pct: number | string | null
  semanas_floracion_plan: number | null
  rendimiento_objetivo_g_m2: number | string | null
  superficie_objetivo_m2: number | string | null
  meta_produccion_g: number | string | null
}

type CicloGenetica = {
  id: number
  ciclo_id: number
  genetica_id: number
  semanas_floracion_ref: number | null
  fecha_corte_diferenciada: string | null
  fecha_corte_real: string | null
  cantidad_cosechada_g: number | string | null
  lote_stock_id: number | null
  codigo_lote_stock: string | null
  observaciones: string | null
}

type Distribucion = {
  id: number
  ciclo_id: number
  cama_id: number
  genetica_id: number
  cantidad: number
  posiciones: number[] | null
  observaciones: string | null
}

type Props = {
  salaId: number
  camas: CamaBasica[]
  capacidadMaxima: number
}

type MapaCamas = Record<number, Array<number | null>>

type Hito = {
  titulo: string
  fecha: string | null
  detalle: string
  estado: 'pasado' | 'hoy' | 'futuro' | 'pendiente'
  destacado?: boolean
}

const PALETA = [
  {
    punto: 'bg-emerald-500',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    slot: 'border-emerald-300 bg-emerald-100 text-emerald-900',
  },
  {
    punto: 'bg-sky-500',
    chip: 'border-sky-200 bg-sky-50 text-sky-800',
    slot: 'border-sky-300 bg-sky-100 text-sky-900',
  },
  {
    punto: 'bg-violet-500',
    chip: 'border-violet-200 bg-violet-50 text-violet-800',
    slot: 'border-violet-300 bg-violet-100 text-violet-900',
  },
  {
    punto: 'bg-amber-500',
    chip: 'border-amber-200 bg-amber-50 text-amber-800',
    slot: 'border-amber-300 bg-amber-100 text-amber-900',
  },
  {
    punto: 'bg-rose-500',
    chip: 'border-rose-200 bg-rose-50 text-rose-800',
    slot: 'border-rose-300 bg-rose-100 text-rose-900',
  },
  {
    punto: 'bg-cyan-500',
    chip: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    slot: 'border-cyan-300 bg-cyan-100 text-cyan-900',
  },
  {
    punto: 'bg-lime-500',
    chip: 'border-lime-200 bg-lime-50 text-lime-800',
    slot: 'border-lime-300 bg-lime-100 text-lime-900',
  },
]

export default function CultivoActual({
  salaId,
  camas,
  capacidadMaxima,
}: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ciclo, setCiclo] = useState<CicloResumen | null>(null)
  const [catalogo, setCatalogo] = useState<GeneticaCatalogo[]>([])
  const [cicloGeneticas, setCicloGeneticas] = useState<CicloGenetica[]>([])
  const [distribucion, setDistribucion] = useState<Distribucion[]>([])

  // Inicio de ciclo
  const [fechaInicio, setFechaInicio] = useState(fechaLocalInput())
  const [fechaInicioFloracion, setFechaInicioFloracion] = useState(fechaLocalInput())
  const [semanasFloracionPlan, setSemanasFloracionPlan] = useState('8')
  const [rendimientoObjetivoInicio, setRendimientoObjetivoInicio] = useState('500')
  const [fechaCorteInicio, setFechaCorteInicio] = useState(() =>
    sumarDias(fechaLocalInput(), 8 * 7 - 1)
  )
  const [corteInicioManual, setCorteInicioManual] = useState(false)
  const [observacionesInicio, setObservacionesInicio] = useState('')
  const [busquedaGenetica, setBusquedaGenetica] = useState('')
  const [geneticasSeleccionadas, setGeneticasSeleccionadas] = useState<number[]>([])
  const [geneticaPincel, setGeneticaPincel] = useState<number | null>(null)
  const [modoBorrar, setModoBorrar] = useState(false)
  const [mapaNuevo, setMapaNuevo] = useState<MapaCamas>(() => crearMapaVacio(camas))
  const [guardandoInicio, setGuardandoInicio] = useState(false)

  // Edición de distribución
  const [editandoDistribucion, setEditandoDistribucion] = useState(false)
  const [mapaEditado, setMapaEditado] = useState<MapaCamas>(() => crearMapaVacio(camas))
  const [pincelEdicion, setPincelEdicion] = useState<number | null>(null)
  const [modoBorrarEdicion, setModoBorrarEdicion] = useState(false)
  const [guardandoDistribucion, setGuardandoDistribucion] = useState(false)

  // Cortes
  const [editandoCortes, setEditandoCortes] = useState(false)
  const [corteSalaEditado, setCorteSalaEditado] = useState('')
  const [cortesGeneticaEditados, setCortesGeneticaEditados] = useState<Record<number, string>>({})
  const [guardandoCortes, setGuardandoCortes] = useState(false)

  // Cambio de etapa
  const [fechaNuevaFloracion, setFechaNuevaFloracion] = useState(fechaLocalInput())
  const [guardandoEtapa, setGuardandoEtapa] = useState(false)

  useEffect(() => {
    cargarCultivo()
  }, [salaId])

  async function cargarCultivo() {
    setCargando(true)
    setError('')

    const [resultadoCatalogo, resultadoCiclo] = await Promise.all([
      supabase.from('geneticas').select('*').order('id'),
      supabase
        .from('vista_ciclos_cultivo')
        .select('*')
        .eq('sala_id', salaId)
        .eq('estado', 'Activo')
        .maybeSingle(),
    ])

    if (resultadoCatalogo.error) {
      setError(describirErrorSupabase(resultadoCatalogo.error, 'No se pudo cargar el catálogo de genéticas de Stock.'))
      setCargando(false)
      return
    }

    if (resultadoCiclo.error) {
      setError(describirErrorSupabase(resultadoCiclo.error, 'No se pudo cargar el ciclo actual.'))
      setCargando(false)
      return
    }

    const catalogoNormalizado = (resultadoCatalogo.data ?? []).map(
      (fila: Record<string, unknown>) => ({
        id: Number(fila.id),
        nombre: nombreGenetica(fila),
        activa: geneticaActiva(fila),
      })
    )

    setCatalogo(catalogoNormalizado)

    const cicloActual = resultadoCiclo.data as CicloResumen | null
    setCiclo(cicloActual)

    if (!cicloActual) {
      setCicloGeneticas([])
      setDistribucion([])
      setMapaNuevo(crearMapaVacio(camas))
      setCargando(false)
      return
    }

    const [resultadoGeneticas, resultadoDistribucion] = await Promise.all([
      supabase
        .from('ciclo_geneticas')
        .select('*')
        .eq('ciclo_id', cicloActual.ciclo_id)
        .order('id'),
      supabase
        .from('ciclo_camas_geneticas')
        .select('*')
        .eq('ciclo_id', cicloActual.ciclo_id)
        .order('cama_id')
        .order('genetica_id'),
    ])

    if (resultadoGeneticas.error) {
      setError(describirErrorSupabase(resultadoGeneticas.error, 'No se pudieron cargar las genéticas del ciclo.'))
      setCargando(false)
      return
    }

    if (resultadoDistribucion.error) {
      setError(describirErrorSupabase(resultadoDistribucion.error, 'No se pudo cargar la distribución de las camas.'))
      setCargando(false)
      return
    }

    const geneticasCiclo = (resultadoGeneticas.data ?? []) as CicloGenetica[]
    const distribucionCiclo = (resultadoDistribucion.data ?? []) as Distribucion[]

    setCicloGeneticas(geneticasCiclo)
    setDistribucion(distribucionCiclo)
    prepararEditores(cicloActual, geneticasCiclo, distribucionCiclo)
    setCargando(false)
  }

  function prepararEditores(
    cicloActual: CicloResumen,
    geneticasCiclo: CicloGenetica[],
    distribucionCiclo: Distribucion[]
  ) {
    setCorteSalaEditado(cicloActual.fecha_corte_planificada ?? '')

    const cortes: Record<number, string> = {}
    geneticasCiclo.forEach((item) => {
      cortes[item.genetica_id] = item.fecha_corte_diferenciada ?? ''
    })
    setCortesGeneticaEditados(cortes)

    const ids = geneticasCiclo.map((item) => item.genetica_id)
    setMapaEditado(mapaDesdeDistribucion(camas, distribucionCiclo))
    setPincelEdicion(ids[0] ?? null)
    setModoBorrarEdicion(false)
    setFechaNuevaFloracion(cicloActual.fecha_inicio_floracion ?? fechaLocalInput())
  }

  const mapaGeneticas = useMemo(
    () => new Map(catalogo.map((genetica) => [genetica.id, genetica])),
    [catalogo]
  )

  const catalogoActivo = catalogo.filter((genetica) => genetica.activa)

  const resultadosBusqueda = useMemo(() => {
    const texto = normalizarTexto(busquedaGenetica)
    if (!texto) return []

    return catalogoActivo
      .filter((genetica) => !geneticasSeleccionadas.includes(genetica.id))
      .filter((genetica) => normalizarTexto(genetica.nombre).includes(texto))
      .slice(0, 8)
  }, [catalogoActivo, busquedaGenetica, geneticasSeleccionadas])

  const totalMapaNuevo = totalMapa(mapaNuevo)
  const semanasInicio = entero(semanasFloracionPlan)
  const corteAutomaticoInicio =
    fechaInicioFloracion && semanasInicio > 0
      ? sumarDias(fechaInicioFloracion, semanasInicio * 7 - 1)
      : ''
  const diasAdaptacionInicio =
    fechaInicio && fechaInicioFloracion
      ? diasEntre(fechaInicio, fechaInicioFloracion)
      : null
  const diasFloraPlanificados =
    fechaInicioFloracion && fechaCorteInicio
      ? diasEntre(fechaInicioFloracion, fechaCorteInicio) + 1
      : null

  useEffect(() => {
    if (!corteInicioManual) {
      setFechaCorteInicio(corteAutomaticoInicio)
    }
  }, [corteAutomaticoInicio, corteInicioManual])

  function agregarGenetica(geneticaId: number) {
    if (geneticasSeleccionadas.includes(geneticaId)) return

    setGeneticasSeleccionadas((actual) => [...actual, geneticaId])
    setGeneticaPincel(geneticaId)
    setModoBorrar(false)
    setBusquedaGenetica('')
  }

  function quitarGenetica(geneticaId: number) {
    const siguientes = geneticasSeleccionadas.filter((id) => id !== geneticaId)
    setGeneticasSeleccionadas(siguientes)
    setMapaNuevo((actual) => quitarGeneticaDelMapa(actual, geneticaId))

    if (geneticaPincel === geneticaId) {
      setGeneticaPincel(siguientes[0] ?? null)
    }
  }

  function seleccionarPincel(geneticaId: number) {
    setGeneticaPincel(geneticaId)
    setModoBorrar(false)
  }

  function seleccionarBorrador() {
    setModoBorrar(true)
    setGeneticaPincel(null)
  }

  function cambiarPosicionNueva(camaId: number, indice: number) {
    setMapaNuevo((actual) => {
      const copia = copiarMapa(actual)
      const fila = copia[camaId] ?? []

      if (modoBorrar) {
        fila[indice] = null
      } else if (geneticaPincel) {
        fila[indice] = fila[indice] === geneticaPincel ? null : geneticaPincel
      }

      copia[camaId] = fila
      return copia
    })
  }

  function llenarLibresNueva(camaId: number) {
    if (!geneticaPincel) return

    setMapaNuevo((actual) => {
      const copia = copiarMapa(actual)
      copia[camaId] = (copia[camaId] ?? []).map((valor) => valor ?? geneticaPincel)
      return copia
    })
  }

  function vaciarCamaNueva(camaId: number) {
    setMapaNuevo((actual) => ({
      ...actual,
      [camaId]: Array(camas.find((cama) => cama.cama_id === camaId)?.capacidad_plantas ?? 0).fill(null),
    }))
  }

  async function iniciarCiclo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!fechaInicio) {
      setError('Indicá la fecha de inicio del ciclo.')
      return
    }

    if (!fechaInicioFloracion) {
      setError('Indicá la fecha de inicio de floración. Esa fecha corresponde al Día 1.')
      return
    }

    if (fechaInicioFloracion < fechaInicio) {
      setError('El inicio de floración no puede ser anterior al inicio del ciclo.')
      return
    }

    if (semanasInicio <= 0 || semanasInicio > 30) {
      setError('Indicá cuántas semanas completas de floración tendrá este ciclo.')
      return
    }

    if (!fechaCorteInicio) {
      setError('Indicá la fecha de corte planificada.')
      return
    }

    if (fechaCorteInicio < fechaInicioFloracion) {
      setError('La fecha de corte no puede ser anterior al inicio de floración.')
      return
    }

    const rendimientoObjetivo = numero(rendimientoObjetivoInicio)

    if (rendimientoObjetivo <= 0 || rendimientoObjetivo > 5000) {
      setError('Indicá una meta válida de rendimiento en g/m².')
      return
    }

    if (geneticasSeleccionadas.length === 0) {
      setError('Agregá al menos una genética desde Stock.')
      return
    }

    if (totalMapaNuevo <= 0) {
      setError('Ubicá las plantas dentro de las camas.')
      return
    }

    for (const geneticaId of geneticasSeleccionadas) {
      if (contarGeneticaEnMapa(mapaNuevo, geneticaId) === 0) {
        setError(
          `${mapaGeneticas.get(geneticaId)?.nombre ?? 'Una genética'} está seleccionada pero no tiene ninguna posición asignada.`
        )
        return
      }
    }

    const geneticasPayload = geneticasSeleccionadas.map((geneticaId) => ({
      genetica_id: geneticaId,
    }))

    const distribucionPayload = payloadDesdeMapa(mapaNuevo)

    setGuardandoInicio(true)

    const { error: rpcError } = await supabase.rpc('iniciar_ciclo_cultivo', {
      p_sala_id: salaId,
      p_fecha_inicio: fechaInicio,
      p_fecha_inicio_floracion: fechaInicioFloracion,
      p_semanas_floracion_plan: semanasInicio,
      p_fecha_corte_planificada: fechaCorteInicio,
      p_rendimiento_objetivo_g_m2: rendimientoObjetivo,
      p_observaciones: observacionesInicio.trim() || null,
      p_geneticas: geneticasPayload,
      p_distribucion: distribucionPayload,
    })

    if (rpcError) {
      setError(describirErrorSupabase(rpcError, 'No se pudo iniciar el ciclo.'))
      setGuardandoInicio(false)
      return
    }

    setGuardandoInicio(false)
    await cargarCultivo()
  }

  async function iniciarFloracion() {
    if (!ciclo || !fechaNuevaFloracion) return

    const semanas = Number(ciclo.semanas_floracion_plan ?? 0)
    if (!semanas || semanas <= 0) {
      setError('Este ciclo no tiene configurada la duración de floración.')
      return
    }

    if (fechaNuevaFloracion < ciclo.fecha_inicio) {
      setError('El inicio de floración no puede ser anterior al inicio del ciclo.')
      return
    }

    setError('')
    setGuardandoEtapa(true)

    const corte = sumarDias(fechaNuevaFloracion, semanas * 7 - 1)
    const etapaSegunFecha =
      fechaNuevaFloracion <= fechaLocalInput() ? 'Floración' : 'Vegetación'

    const { error: updateError } = await supabase
      .from('ciclos_cultivo')
      .update({
        etapa_actual: etapaSegunFecha,
        fecha_inicio_floracion: fechaNuevaFloracion,
        fecha_corte_planificada: corte,
      })
      .eq('id', ciclo.ciclo_id)

    if (updateError) {
      setError(describirErrorSupabase(updateError, 'No se pudo iniciar la floración.'))
      setGuardandoEtapa(false)
      return
    }

    setGuardandoEtapa(false)
    await cargarCultivo()
  }

  function comenzarEditarDistribucion() {
    if (!ciclo) return

    const ids = cicloGeneticas.map((item) => item.genetica_id)
    setMapaEditado(mapaDesdeDistribucion(camas, distribucion))
    setPincelEdicion(ids[0] ?? null)
    setModoBorrarEdicion(false)
    setEditandoDistribucion(true)
  }

  function cambiarPosicionEditada(camaId: number, indice: number) {
    setMapaEditado((actual) => {
      const copia = copiarMapa(actual)
      const fila = copia[camaId] ?? []

      if (modoBorrarEdicion) {
        fila[indice] = null
      } else if (pincelEdicion) {
        fila[indice] = fila[indice] === pincelEdicion ? null : pincelEdicion
      }

      copia[camaId] = fila
      return copia
    })
  }

  function llenarLibresEditada(camaId: number) {
    if (!pincelEdicion) return

    setMapaEditado((actual) => {
      const copia = copiarMapa(actual)
      copia[camaId] = (copia[camaId] ?? []).map((valor) => valor ?? pincelEdicion)
      return copia
    })
  }

  function vaciarCamaEditada(camaId: number) {
    setMapaEditado((actual) => ({
      ...actual,
      [camaId]: Array(camas.find((cama) => cama.cama_id === camaId)?.capacidad_plantas ?? 0).fill(null),
    }))
  }

  async function guardarDistribucion() {
    if (!ciclo) return

    const payload = payloadDesdeMapa(mapaEditado)
    if (payload.length === 0) {
      setError('El ciclo debe conservar al menos una planta distribuida.')
      return
    }

    setError('')
    setGuardandoDistribucion(true)

    const { error: rpcError } = await supabase.rpc('guardar_distribucion_ciclo', {
      p_ciclo_id: ciclo.ciclo_id,
      p_distribucion: payload,
    })

    if (rpcError) {
      setError(describirErrorSupabase(rpcError, 'No se pudo guardar la nueva distribución.'))
      setGuardandoDistribucion(false)
      return
    }

    setGuardandoDistribucion(false)
    setEditandoDistribucion(false)
    await cargarCultivo()
  }

  function comenzarEditarCortes() {
    if (!ciclo) return

    setCorteSalaEditado(ciclo.fecha_corte_planificada ?? '')
    const cortes: Record<number, string> = {}
    cicloGeneticas.forEach((item) => {
      cortes[item.genetica_id] = item.fecha_corte_diferenciada ?? ''
    })
    setCortesGeneticaEditados(cortes)
    setEditandoCortes(true)
  }

  async function guardarCortes() {
    if (!ciclo) return

    setError('')
    setGuardandoCortes(true)

    const { error: cicloError } = await supabase
      .from('ciclos_cultivo')
      .update({ fecha_corte_planificada: corteSalaEditado || null })
      .eq('id', ciclo.ciclo_id)

    if (cicloError) {
      setError(describirErrorSupabase(cicloError, 'No se pudo actualizar la fecha de corte.'))
      setGuardandoCortes(false)
      return
    }

    for (const item of cicloGeneticas) {
      const { error: geneticaError } = await supabase
        .from('ciclo_geneticas')
        .update({
          fecha_corte_diferenciada: cortesGeneticaEditados[item.genetica_id] || null,
        })
        .eq('id', item.id)

      if (geneticaError) {
        setError(describirErrorSupabase(geneticaError, 'No se pudo actualizar un corte diferenciado.'))
        setGuardandoCortes(false)
        return
      }
    }

    setGuardandoCortes(false)
    setEditandoCortes(false)
    await cargarCultivo()
  }

  if (cargando) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center text-sm text-zinc-500 shadow-sm">
        Cargando cultivo actual...
      </section>
    )
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {!ciclo ? (
        <InicioCiclo
          camas={camas}
          capacidadMaxima={capacidadMaxima}
          catalogo={catalogoActivo}
          mapaGeneticas={mapaGeneticas}
          fechaInicio={fechaInicio}
          setFechaInicio={setFechaInicio}
          fechaInicioFloracion={fechaInicioFloracion}
          setFechaInicioFloracion={setFechaInicioFloracion}
          semanasFloracionPlan={semanasFloracionPlan}
          setSemanasFloracionPlan={setSemanasFloracionPlan}
          rendimientoObjetivoInicio={rendimientoObjetivoInicio}
          setRendimientoObjetivoInicio={setRendimientoObjetivoInicio}
          fechaCorteInicio={fechaCorteInicio}
          setFechaCorteInicio={(valor) => {
            setFechaCorteInicio(valor)
            setCorteInicioManual(true)
          }}
          corteAutomaticoInicio={corteAutomaticoInicio}
          corteInicioManual={corteInicioManual}
          restaurarCorteAutomatico={() => {
            setCorteInicioManual(false)
            setFechaCorteInicio(corteAutomaticoInicio)
          }}
          diasAdaptacionInicio={diasAdaptacionInicio}
          diasFloraPlanificados={diasFloraPlanificados}
          observacionesInicio={observacionesInicio}
          setObservacionesInicio={setObservacionesInicio}
          busquedaGenetica={busquedaGenetica}
          setBusquedaGenetica={setBusquedaGenetica}
          resultadosBusqueda={resultadosBusqueda}
          geneticasSeleccionadas={geneticasSeleccionadas}
          agregarGenetica={agregarGenetica}
          quitarGenetica={quitarGenetica}
          geneticaPincel={geneticaPincel}
          modoBorrar={modoBorrar}
          seleccionarPincel={seleccionarPincel}
          seleccionarBorrador={seleccionarBorrador}
          mapa={mapaNuevo}
          cambiarPosicion={cambiarPosicionNueva}
          llenarLibres={llenarLibresNueva}
          vaciarCama={vaciarCamaNueva}
          totalDistribuido={totalMapaNuevo}
          guardandoInicio={guardandoInicio}
          onSubmit={iniciarCiclo}
        />
      ) : (
        <CicloActivo
          ciclo={ciclo}
          camas={camas}
          capacidadMaxima={capacidadMaxima}
          cicloGeneticas={cicloGeneticas}
          distribucion={distribucion}
          mapaGeneticas={mapaGeneticas}
          editandoDistribucion={editandoDistribucion}
          mapaEditado={mapaEditado}
          pincelEdicion={pincelEdicion}
          modoBorrarEdicion={modoBorrarEdicion}
          setPincelEdicion={(id) => {
            setPincelEdicion(id)
            setModoBorrarEdicion(false)
          }}
          seleccionarBorradorEdicion={() => {
            setPincelEdicion(null)
            setModoBorrarEdicion(true)
          }}
          cambiarPosicionEditada={cambiarPosicionEditada}
          llenarLibresEditada={llenarLibresEditada}
          vaciarCamaEditada={vaciarCamaEditada}
          comenzarEditarDistribucion={comenzarEditarDistribucion}
          cancelarEditarDistribucion={() => setEditandoDistribucion(false)}
          guardarDistribucion={guardarDistribucion}
          guardandoDistribucion={guardandoDistribucion}
          editandoCortes={editandoCortes}
          corteSalaEditado={corteSalaEditado}
          setCorteSalaEditado={setCorteSalaEditado}
          cortesGeneticaEditados={cortesGeneticaEditados}
          setCortesGeneticaEditados={setCortesGeneticaEditados}
          comenzarEditarCortes={comenzarEditarCortes}
          cancelarEditarCortes={() => setEditandoCortes(false)}
          guardarCortes={guardarCortes}
          guardandoCortes={guardandoCortes}
          fechaNuevaFloracion={fechaNuevaFloracion}
          setFechaNuevaFloracion={setFechaNuevaFloracion}
          iniciarFloracion={iniciarFloracion}
          guardandoEtapa={guardandoEtapa}
        />
      )}
    </div>
  )
}

function InicioCiclo({
  camas,
  capacidadMaxima,
  catalogo,
  mapaGeneticas,
  fechaInicio,
  setFechaInicio,
  fechaInicioFloracion,
  setFechaInicioFloracion,
  semanasFloracionPlan,
  setSemanasFloracionPlan,
  rendimientoObjetivoInicio,
  setRendimientoObjetivoInicio,
  fechaCorteInicio,
  setFechaCorteInicio,
  corteAutomaticoInicio,
  corteInicioManual,
  restaurarCorteAutomatico,
  diasAdaptacionInicio,
  diasFloraPlanificados,
  observacionesInicio,
  setObservacionesInicio,
  busquedaGenetica,
  setBusquedaGenetica,
  resultadosBusqueda,
  geneticasSeleccionadas,
  agregarGenetica,
  quitarGenetica,
  geneticaPincel,
  modoBorrar,
  seleccionarPincel,
  seleccionarBorrador,
  mapa,
  cambiarPosicion,
  llenarLibres,
  vaciarCama,
  totalDistribuido,
  guardandoInicio,
  onSubmit,
}: {
  camas: CamaBasica[]
  capacidadMaxima: number
  catalogo: GeneticaCatalogo[]
  mapaGeneticas: Map<number, GeneticaCatalogo>
  fechaInicio: string
  setFechaInicio: (valor: string) => void
  fechaInicioFloracion: string
  setFechaInicioFloracion: (valor: string) => void
  semanasFloracionPlan: string
  setSemanasFloracionPlan: (valor: string) => void
  rendimientoObjetivoInicio: string
  setRendimientoObjetivoInicio: (valor: string) => void
  fechaCorteInicio: string
  setFechaCorteInicio: (valor: string) => void
  corteAutomaticoInicio: string
  corteInicioManual: boolean
  restaurarCorteAutomatico: () => void
  diasAdaptacionInicio: number | null
  diasFloraPlanificados: number | null
  observacionesInicio: string
  setObservacionesInicio: (valor: string) => void
  busquedaGenetica: string
  setBusquedaGenetica: (valor: string) => void
  resultadosBusqueda: GeneticaCatalogo[]
  geneticasSeleccionadas: number[]
  agregarGenetica: (id: number) => void
  quitarGenetica: (id: number) => void
  geneticaPincel: number | null
  modoBorrar: boolean
  seleccionarPincel: (id: number) => void
  seleccionarBorrador: () => void
  mapa: MapaCamas
  cambiarPosicion: (camaId: number, indice: number) => void
  llenarLibres: (camaId: number) => void
  vaciarCama: (camaId: number) => void
  totalDistribuido: number
  guardandoInicio: boolean
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  const totalGeneticas = geneticasSeleccionadas.length
  const superficieEquivalente = superficieEquivalenteMapa(camas, mapa)
  const rendimientoObjetivo = numero(rendimientoObjetivoInicio)
  const metaProduccion = superficieEquivalente * rendimientoObjetivo
  const ocupacion = capacidadMaxima > 0
    ? Math.min(100, (totalDistribuido / capacidadMaxima) * 100)
    : 0

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <IconoBroteMini />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                Cultivo actual
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
              Iniciar ciclo
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Elegí las genéticas desde Stock y acomodalas visualmente dentro de cada cama. La duración de floración pertenece al ciclo completo, no al catálogo de genéticas.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:min-w-[380px]">
            <MiniKpi titulo="Camas" valor={String(camas.length)} />
            <MiniKpi titulo="Genéticas" valor={String(totalGeneticas)} />
            <MiniKpi titulo="Plantas" valor={`${totalDistribuido}`} detalle={`de ${capacidadMaxima}`} />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-5 pt-5">
          <TituloSeccion
            numero="1"
            titulo="Calendario del ciclo"
            descripcion="Separá la entrada a sala del Día 1 de floración. El corte se propone automáticamente y siempre lo podés ajustar."
          />
        </div>

        <div className="grid gap-4 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4">
          <CampoFecha
            titulo="Inicio del ciclo / vegetación"
            valor={fechaInicio}
            onChange={setFechaInicio}
            ayuda="Día en que las plantas entran a esta sala. Puede incluir adaptación o vegetación previa."
          />

          <CampoFecha
            titulo="Inicio de floración · Día 1"
            valor={fechaInicioFloracion}
            onChange={setFechaInicioFloracion}
            ayuda="Desde esta fecha empiezan Semana 1, Día 1 y todos los hitos de floración."
          />

          <div>
            <label className="etiqueta">Semanas de floración</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="30"
                step="1"
                value={semanasFloracionPlan}
                onChange={(e) => setSemanasFloracionPlan(e.target.value)}
                className="campo pr-20"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">
                semanas
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-4 text-zinc-400">
              Viene en 8 semanas por defecto. Podés cambiarlo para este ciclo.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label className="etiqueta">Corte planificado</label>
              {corteInicioManual && (
                <button
                  type="button"
                  onClick={restaurarCorteAutomatico}
                  className="mb-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Usar cálculo automático
                </button>
              )}
            </div>
            <input
              type="date"
              value={fechaCorteInicio}
              onChange={(e) => setFechaCorteInicio(e.target.value)}
              className="campo"
            />
            <p className="mt-1 text-[10px] leading-4 text-zinc-400">
              {corteInicioManual
                ? 'Ajustado manualmente para este ciclo.'
                : 'Calculado automáticamente desde el Día 1 de floración.'}
            </p>
          </div>
        </div>

        <div className="border-t border-zinc-100 bg-zinc-50/70 px-5 py-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
            <CalendarioNodo
              etiqueta="Entrada a sala"
              valor={fechaInicio ? formatearFechaCorta(fechaInicio) : '—'}
              detalle="Inicio ciclo"
            />

            <CalendarioConexion
              texto={
                diasAdaptacionInicio === null
                  ? '—'
                  : diasAdaptacionInicio === 0
                    ? 'Directo a flora'
                    : diasAdaptacionInicio > 0
                      ? `${diasAdaptacionInicio} días adaptación / vege`
                      : 'Revisar fechas'
              }
              alerta={diasAdaptacionInicio !== null && diasAdaptacionInicio < 0}
            />

            <CalendarioNodo
              etiqueta="Floración"
              valor={fechaInicioFloracion ? formatearFechaCorta(fechaInicioFloracion) : '—'}
              detalle="Día 1 · Semana 1"
              destacado
            />

            <CalendarioConexion
              texto={
                entero(semanasFloracionPlan) > 0
                  ? `${entero(semanasFloracionPlan)} sem · ${entero(semanasFloracionPlan) * 7} días`
                  : 'Definir semanas'
              }
            />

            <CalendarioNodo
              etiqueta="Corte"
              valor={fechaCorteInicio ? formatearFechaCorta(fechaCorteInicio) : '—'}
              detalle={
                diasFloraPlanificados && diasFloraPlanificados > 0
                  ? `Día ${diasFloraPlanificados} de flora`
                  : 'Planificado'
              }
              manual={corteInicioManual}
            />
          </div>

          {corteAutomaticoInicio && (
            <div
              className={`mt-4 flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                corteInicioManual
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-emerald-200 bg-emerald-50'
              }`}
            >
              <div>
                <p
                  className={`text-xs font-semibold ${
                    corteInicioManual ? 'text-amber-800' : 'text-emerald-800'
                  }`}
                >
                  {corteInicioManual ? 'Corte ajustado manualmente' : 'Corte calculado automáticamente'}
                </p>
                <p
                  className={`mt-1 text-[11px] leading-5 ${
                    corteInicioManual ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  Día 1 = {formatearFecha(fechaInicioFloracion)} · {entero(semanasFloracionPlan)} semanas completas = {entero(semanasFloracionPlan) * 7} días · día final automático = {formatearFecha(corteAutomaticoInicio)}.
                </p>
              </div>

              {corteInicioManual && fechaCorteInicio && fechaCorteInicio !== corteAutomaticoInicio && (
                <span className="shrink-0 rounded-lg bg-white/80 px-3 py-1.5 text-[10px] font-bold text-amber-800">
                  Base {formatearFechaCorta(corteAutomaticoInicio)} → elegido {formatearFechaCorta(fechaCorteInicio)}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <TituloSeccion
          numero="2"
          titulo="Genéticas"
          descripcion="Buscá únicamente las genéticas que participan en este ciclo. El catálogo viene de Stock."
        />

        {catalogo.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-8 text-center text-sm text-zinc-500">
            No hay genéticas activas disponibles en Stock.
          </div>
        ) : (
          <>
            <div className="relative max-w-2xl">
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  value={busquedaGenetica}
                  onChange={(e) => setBusquedaGenetica(e.target.value)}
                  placeholder="Buscar genética en Stock..."
                  className="campo pl-10"
                />
              </div>

              {busquedaGenetica.trim() && (
                <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                  {resultadosBusqueda.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-zinc-400">Sin coincidencias.</p>
                  ) : (
                    resultadosBusqueda.map((genetica) => (
                      <button
                        key={genetica.id}
                        type="button"
                        onClick={() => agregarGenetica(genetica.id)}
                        className="flex w-full items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 text-left last:border-b-0 hover:bg-zinc-50"
                      >
                        <span className="text-sm font-medium text-zinc-800">{genetica.nombre}</span>
                        <span className="text-xs font-semibold text-emerald-700">Agregar +</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {geneticasSeleccionadas.length === 0 ? (
                <p className="text-xs text-zinc-400">Todavía no seleccionaste genéticas.</p>
              ) : (
                geneticasSeleccionadas.map((geneticaId, index) => {
                  const genetica = mapaGeneticas.get(geneticaId)
                  const estilo = estiloPorIndice(index)
                  const cantidad = contarGeneticaEnMapa(mapa, geneticaId)

                  return (
                    <div
                      key={geneticaId}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${estilo.chip}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${estilo.punto}`} />
                      <span>{genetica?.nombre ?? `Genética ${geneticaId}`}</span>
                      <span className="opacity-60">{cantidad}</span>
                      <button
                        type="button"
                        onClick={() => quitarGenetica(geneticaId)}
                        className="ml-1 text-sm leading-none opacity-50 transition hover:opacity-100"
                        title="Quitar genética"
                      >
                        ×
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </section>

      {geneticasSeleccionadas.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <TituloSeccion
            numero="3"
            titulo="Mapa de camas"
            descripcion="Elegí una genética y marcá sus posiciones. Así queda registrada la cama y el lugar exacto dentro de ella."
          />

          <SelectorPincel
            geneticasIds={geneticasSeleccionadas}
            mapaGeneticas={mapaGeneticas}
            geneticaActiva={geneticaPincel}
            modoBorrar={modoBorrar}
            onSeleccionar={seleccionarPincel}
            onBorrar={seleccionarBorrador}
          />

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {camas.map((cama) => (
              <EditorCama
                key={cama.cama_id}
                cama={cama}
                posiciones={mapa[cama.cama_id] ?? []}
                geneticasIds={geneticasSeleccionadas}
                mapaGeneticas={mapaGeneticas}
                editable
                onPosicion={(indice) => cambiarPosicion(cama.cama_id, indice)}
                onLlenar={() => llenarLibres(cama.cama_id)}
                onVaciar={() => vaciarCama(cama.cama_id)}
                puedeLlenar={Boolean(geneticaPincel) && !modoBorrar}
              />
            ))}
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/70">
            <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_190px] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-950">
                    Meta de producción
                  </p>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                    cálculo automático
                  </span>
                </div>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">
                  Se calcula según la superficie equivalente realmente ocupada en las camas. El rendimiento objetivo viene en 500 g/m² por defecto y queda guardado para este ciclo.
                </p>

                <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                      Meta
                    </p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-emerald-800">
                      {formatearPesoMeta(metaProduccion)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                      Superficie equivalente
                    </p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900">
                      {formatear(superficieEquivalente)} m²
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                      Ocupación
                    </p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900">
                      {formatear(ocupacion)}%
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="etiqueta">Rendimiento objetivo</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    step="10"
                    value={rendimientoObjetivoInicio}
                    onChange={(e) => setRendimientoObjetivoInicio(e.target.value)}
                    className="campo pr-16"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">
                    g/m²
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-4 text-zinc-400">
                  Default Green Supply: 500 g/m².
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <TituloSeccion
          numero="4"
          titulo="Observaciones"
          descripcion="Opcional. Solo información útil para este ciclo."
        />
        <textarea
          rows={3}
          value={observacionesInicio}
          onChange={(e) => setObservacionesInicio(e.target.value)}
          placeholder="Observaciones del ciclo..."
          className="campo resize-none"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-800">
            {totalDistribuido} / {capacidadMaxima} plantas ubicadas
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Al iniciar se reserva el código de cosecha. No se genera stock hasta registrar el corte.
          </p>
        </div>

        <button
          type="submit"
          disabled={guardandoInicio}
          className="rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-40"
        >
          {guardandoInicio ? 'Iniciando...' : 'Iniciar ciclo'}
        </button>
      </div>
    </form>
  )
}

function CicloActivo({
  ciclo,
  camas,
  capacidadMaxima,
  cicloGeneticas,
  distribucion,
  mapaGeneticas,
  editandoDistribucion,
  mapaEditado,
  pincelEdicion,
  modoBorrarEdicion,
  setPincelEdicion,
  seleccionarBorradorEdicion,
  cambiarPosicionEditada,
  llenarLibresEditada,
  vaciarCamaEditada,
  comenzarEditarDistribucion,
  cancelarEditarDistribucion,
  guardarDistribucion,
  guardandoDistribucion,
  editandoCortes,
  corteSalaEditado,
  setCorteSalaEditado,
  cortesGeneticaEditados,
  setCortesGeneticaEditados,
  comenzarEditarCortes,
  cancelarEditarCortes,
  guardarCortes,
  guardandoCortes,
  fechaNuevaFloracion,
  setFechaNuevaFloracion,
  iniciarFloracion,
  guardandoEtapa,
}: {
  ciclo: CicloResumen
  camas: CamaBasica[]
  capacidadMaxima: number
  cicloGeneticas: CicloGenetica[]
  distribucion: Distribucion[]
  mapaGeneticas: Map<number, GeneticaCatalogo>
  editandoDistribucion: boolean
  mapaEditado: MapaCamas
  pincelEdicion: number | null
  modoBorrarEdicion: boolean
  setPincelEdicion: (id: number) => void
  seleccionarBorradorEdicion: () => void
  cambiarPosicionEditada: (camaId: number, indice: number) => void
  llenarLibresEditada: (camaId: number) => void
  vaciarCamaEditada: (camaId: number) => void
  comenzarEditarDistribucion: () => void
  cancelarEditarDistribucion: () => void
  guardarDistribucion: () => void
  guardandoDistribucion: boolean
  editandoCortes: boolean
  corteSalaEditado: string
  setCorteSalaEditado: (valor: string) => void
  cortesGeneticaEditados: Record<number, string>
  setCortesGeneticaEditados: Dispatch<SetStateAction<Record<number, string>>>
  comenzarEditarCortes: () => void
  cancelarEditarCortes: () => void
  guardarCortes: () => void
  guardandoCortes: boolean
  fechaNuevaFloracion: string
  setFechaNuevaFloracion: (valor: string) => void
  iniciarFloracion: () => void
  guardandoEtapa: boolean
}) {
  const hoy = fechaLocalInput()
  const totalPlantas = Number(ciclo.cantidad_total ?? 0)
  const ocupacion =
    capacidadMaxima > 0
      ? Math.min(100, (totalPlantas / capacidadMaxima) * 100)
      : 0

  const progreso = numero(ciclo.progreso_floracion_pct)
  const diasRestantes = ciclo.dias_restantes_corte
  const semanasPlan = Number(ciclo.semanas_floracion_plan ?? 0)
  const diasPlanificados = semanasPlan > 0 ? semanasPlan * 7 : 0
  const totalSemanasFlora =
    semanasPlan > 0 ? semanasPlan : calcularSemanasPorFechas(ciclo)

  const hitos = construirHitos(ciclo, cicloGeneticas, mapaGeneticas)
  const idsGeneticas = cicloGeneticas.map((item) => item.genetica_id)
  const mapaActual = mapaDesdeDistribucion(camas, distribucion)

  const proximoHito =
    hitos.find(
      (hito) =>
        hito.estado === 'futuro' &&
        hito.titulo !== 'Hoy'
    ) ?? null

  const diasHastaProximo =
    proximoHito?.fecha
      ? Math.max(0, diasEntre(hoy, proximoHito.fecha))
      : null

  const diasHastaFlora =
    ciclo.fecha_inicio_floracion && hoy < ciclo.fecha_inicio_floracion
      ? Math.max(0, diasEntre(hoy, ciclo.fecha_inicio_floracion))
      : null

  return (
    <>
      {/* =====================================================
          CABECERA VIVA DEL CICLO
      ===================================================== */}

      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(230px,.65fr)_minmax(230px,.65fr)]">
          {/* ESTADO PRINCIPAL */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
                  ciclo.etapa_actual === 'Floración'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-lime-100 text-lime-800'
                }`}
              >
                {ciclo.etapa_actual}
              </span>

              <span className="text-xs font-semibold text-zinc-400">
                Ciclo {String(ciclo.numero_ciclo).padStart(2, '0')}
              </span>

              <span className="text-zinc-300">·</span>

              <span className="font-mono text-xs font-semibold text-zinc-600">
                {ciclo.codigo_cosecha}
              </span>
            </div>

            {ciclo.etapa_actual === 'Floración' ? (
              <>
                <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
                  <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                    Semana {ciclo.semana_floracion ?? '—'}
                  </h2>

                  <span className="pb-1 text-lg font-semibold text-emerald-700">
                    Día {ciclo.dia_semana_floracion ?? '—'}
                  </span>
                </div>

                <p className="mt-1 text-sm text-zinc-500">
                  Día {ciclo.dia_floracion ?? '—'} de {diasPlanificados || '—'} de floración
                  {semanasPlan ? ` · plan de ${semanasPlan} semanas` : ''}
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                  Adaptación / Vegetación
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Inicio del ciclo {formatearFecha(ciclo.fecha_inicio)}
                  {ciclo.fecha_inicio_floracion
                    ? ` · Día 1 de floración ${formatearFecha(ciclo.fecha_inicio_floracion)}`
                    : ' · inicio de floración pendiente'}
                </p>
              </>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                  Plantas
                </p>
                <p className="mt-1 text-base font-semibold text-zinc-950">
                  {totalPlantas}
                  <span className="text-xs font-medium text-zinc-400">
                    /{capacidadMaxima}
                  </span>
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                  Ocupación
                </p>
                <p className="mt-1 text-base font-semibold text-zinc-950">
                  {formatear(ocupacion)}%
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                  Genéticas
                </p>
                <p className="mt-1 text-base font-semibold text-zinc-950">
                  {ciclo.geneticas_total}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                  Camas
                </p>
                <p className="mt-1 text-base font-semibold text-zinc-950">
                  {ciclo.camas_utilizadas}
                  <span className="text-xs font-medium text-zinc-400">
                    /{camas.length}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* CORTE */}
          <div className="flex flex-col rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                Corte planificado
              </p>

              {ciclo.etapa_actual === 'Floración' && (
                <span className="rounded-full bg-white/80 px-2 py-1 text-[9px] font-bold text-emerald-800 ring-1 ring-emerald-100">
                  {formatear(progreso)}%
                </span>
              )}
            </div>

            <p className="mt-3 text-xl font-semibold tracking-tight text-zinc-950">
              {ciclo.fecha_corte_planificada
                ? formatearFecha(ciclo.fecha_corte_planificada)
                : 'Pendiente'}
            </p>

            <div className="mt-auto pt-5">
              <p className="text-[10px] text-zinc-500">
                {diasRestantes === null
                  ? 'Sin fecha definida'
                  : diasRestantes > 0
                    ? 'Tiempo restante'
                    : diasRestantes === 0
                      ? 'Corte previsto para hoy'
                      : 'Fecha planificada superada'}
              </p>

              {diasRestantes !== null && (
                <p className="mt-1 text-2xl font-semibold tracking-tight text-emerald-800">
                  {diasRestantes > 0
                    ? `${diasRestantes} días`
                    : diasRestantes === 0
                      ? 'Hoy'
                      : `+${Math.abs(diasRestantes)} días`}
                </p>
              )}

              {ciclo.etapa_actual === 'Floración' && (
                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, progreso))}%`,
                      }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[9px] font-medium text-emerald-800/70">
                    <span>Día 1</span>
                    <span>Corte</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* META */}
          <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                Meta de producción
              </p>

              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
                {formatear(numero(ciclo.rendimiento_objetivo_g_m2))} g/m²
              </span>
            </div>

            <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
              {formatearPesoMeta(numero(ciclo.meta_produccion_g))}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Objetivo del ciclo según ocupación real.
            </p>

            <div className="mt-auto pt-5">
              <div className="rounded-xl bg-zinc-50 px-3.5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-zinc-500">
                    Superficie equivalente
                  </span>

                  <span className="text-sm font-semibold text-zinc-900">
                    {formatear(numero(ciclo.superficie_objetivo_m2))} m²
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-zinc-500">
                    Cálculo objetivo
                  </span>

                  <span className="text-[10px] font-semibold text-zinc-700">
                    {formatear(numero(ciclo.superficie_objetivo_m2))} m² ×{' '}
                    {formatear(numero(ciclo.rendimiento_objetivo_g_m2))} g/m²
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FECHAS CLAVE */}
        <div className="grid border-t border-zinc-100 sm:grid-cols-2 lg:grid-cols-4">
          <DatoFranja
            titulo="Inicio ciclo"
            valor={formatearFecha(ciclo.fecha_inicio)}
            detalle="Entrada a sala"
          />

          <DatoFranja
            titulo="Día 1 de flora"
            valor={
              ciclo.fecha_inicio_floracion
                ? formatearFecha(ciclo.fecha_inicio_floracion)
                : 'Pendiente'
            }
            detalle="Inicio contador de floración"
          />

          <DatoFranja
            titulo="Día 21"
            valor={
              ciclo.fecha_dia_21
                ? formatearFecha(ciclo.fecha_dia_21)
                : 'Pendiente'
            }
            detalle="Última defoliación"
          />

          <DatoFranja
            titulo="Plan"
            valor={semanasPlan ? `${semanasPlan} semanas` : '—'}
            detalle={
              diasPlanificados
                ? `${diasPlanificados} días completos`
                : undefined
            }
          />
        </div>
      </section>

      {/* =====================================================
          RITMO DEL CICLO
      ===================================================== */}

      {ciclo.etapa_actual === 'Floración' &&
      ciclo.fecha_inicio_floracion &&
      ciclo.fecha_corte_planificada ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_250px] xl:items-start">
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-950">
                    Ritmo de floración
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Vista semanal del período completo. La semana actual se destaca automáticamente.
                  </p>
                </div>

                <span className="w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold text-zinc-500">
                  Día {ciclo.dia_floracion ?? '—'} / {diasPlanificados || '—'}
                </span>
              </div>

              <BarraSemanas
                totalSemanas={totalSemanasFlora}
                progreso={progreso}
                semanaActual={ciclo.semana_floracion ?? 0}
              />

              <div className="mt-4 grid grid-cols-3 gap-2">
                <MarcadorTiempo
                  titulo="Inicio flora"
                  valor={formatearFechaCorta(ciclo.fecha_inicio_floracion)}
                />

                <MarcadorTiempo
                  titulo="Día 21"
                  valor={
                    ciclo.fecha_dia_21
                      ? formatearFechaCorta(ciclo.fecha_dia_21)
                      : '—'
                  }
                  destacado
                />

                <MarcadorTiempo
                  titulo="Corte"
                  valor={formatearFechaCorta(ciclo.fecha_corte_planificada)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                Próximo hito
              </p>

              {proximoHito ? (
                <>
                  <p className="mt-2 text-base font-semibold text-zinc-950">
                    {proximoHito.titulo}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {proximoHito.detalle}
                  </p>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">
                        {proximoHito.fecha
                          ? formatearFechaCorta(proximoHito.fecha)
                          : 'Pendiente'}
                      </p>
                    </div>

                    {diasHastaProximo !== null && (
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-zinc-200">
                        {diasHastaProximo === 0
                          ? 'Hoy'
                          : `en ${diasHastaProximo} d`}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  No hay otro hito programado antes del cierre del ciclo.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : ciclo.etapa_actual === 'Vegetación' ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-zinc-950">
                  {ciclo.fecha_inicio_floracion
                    ? 'Floración programada'
                    : 'Definir inicio de floración'}
                </p>

                {diasHastaFlora !== null && (
                  <span className="rounded-full bg-lime-50 px-2.5 py-1 text-[10px] font-bold text-lime-700">
                    faltan {diasHastaFlora} días
                  </span>
                )}
              </div>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">
                {ciclo.fecha_inicio_floracion
                  ? `El Día 1 está planificado para ${formatearFecha(
                      ciclo.fecha_inicio_floracion
                    )}. Si la fecha real cambia, corregila acá; el corte se recalcula con ${
                      semanasPlan || '—'
                    } semanas completas.`
                  : `Definí el Día 1 de floración. Desde esa fecha empiezan automáticamente Semana/Día, Día 21 y el cálculo del corte.`}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="date"
                value={fechaNuevaFloracion}
                onChange={(e) => setFechaNuevaFloracion(e.target.value)}
                className="campo sm:w-[180px]"
              />

              <button
                type="button"
                onClick={iniciarFloracion}
                disabled={guardandoEtapa}
                className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {guardandoEtapa
                  ? 'Guardando...'
                  : ciclo.fecha_inicio_floracion
                    ? 'Actualizar fecha'
                    : 'Confirmar floración'}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* =====================================================
          HITOS
      ===================================================== */}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-950">
              Línea de hitos
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Calendario operativo del ciclo: inicio, floración, Día 21, hoy y corte.
            </p>
          </div>

          <span className="w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-500">
            Hoy · {formatearFecha(hoy)}
          </span>
        </div>

        <LineaHitos hitos={hitos} />
      </section>

      {/* =====================================================
          CAMAS
      ===================================================== */}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-950">
              Camas y distribución
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              En operación ves un resumen compacto. Entrá en edición solo cuando necesites cambiar posiciones.
            </p>
          </div>

          {!editandoDistribucion ? (
            <button
              type="button"
              onClick={comenzarEditarDistribucion}
              className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Editar distribución
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelarEditarDistribucion}
                disabled={guardandoDistribucion}
                className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-600"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={guardarDistribucion}
                disabled={guardandoDistribucion}
                className="rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                {guardandoDistribucion
                  ? 'Guardando...'
                  : 'Guardar distribución'}
              </button>
            </div>
          )}
        </div>

        {editandoDistribucion ? (
          <>
            <div className="mt-5">
              <SelectorPincel
                geneticasIds={idsGeneticas}
                mapaGeneticas={mapaGeneticas}
                geneticaActiva={pincelEdicion}
                modoBorrar={modoBorrarEdicion}
                onSeleccionar={setPincelEdicion}
                onBorrar={seleccionarBorradorEdicion}
              />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {camas.map((cama) => (
                <EditorCama
                  key={cama.cama_id}
                  cama={cama}
                  posiciones={mapaEditado[cama.cama_id] ?? []}
                  geneticasIds={idsGeneticas}
                  mapaGeneticas={mapaGeneticas}
                  editable
                  onPosicion={(indice) =>
                    cambiarPosicionEditada(cama.cama_id, indice)
                  }
                  onLlenar={() =>
                    llenarLibresEditada(cama.cama_id)
                  }
                  onVaciar={() =>
                    vaciarCamaEditada(cama.cama_id)
                  }
                  puedeLlenar={Boolean(pincelEdicion) && !modoBorrarEdicion}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {camas.map((cama) => (
              <CamaResumenActivo
                key={cama.cama_id}
                cama={cama}
                posiciones={mapaActual[cama.cama_id] ?? []}
                geneticasIds={idsGeneticas}
                mapaGeneticas={mapaGeneticas}
              />
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          GENÉTICAS + LOTE
      ===================================================== */}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-950">
                Genéticas del ciclo
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Resumen por genética. Todas usan el corte general salvo una excepción explícita.
              </p>
            </div>

            {!editandoCortes && (
              <button
                type="button"
                onClick={comenzarEditarCortes}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Editar cortes
              </button>
            )}
          </div>

          {!editandoCortes ? (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {cicloGeneticas.map((item, index) => {
                const genetica = mapaGeneticas.get(item.genetica_id)

                const cantidad = distribucion
                  .filter(
                    (fila) =>
                      fila.genetica_id === item.genetica_id
                  )
                  .reduce(
                    (sum, fila) =>
                      sum + Number(fila.cantidad),
                    0
                  )

                const camasNombres = camas
                  .filter((cama) =>
                    distribucion.some(
                      (fila) =>
                        fila.cama_id === cama.cama_id &&
                        fila.genetica_id === item.genetica_id
                    )
                  )
                  .map((cama) => cama.nombre)
                  .join(', ')

                const corte =
                  item.fecha_corte_diferenciada ||
                  ciclo.fecha_corte_planificada

                const estilo = estiloPorIndice(index)

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${estilo.punto}`}
                          />

                          <p className="truncate text-sm font-semibold text-zinc-900">
                            {genetica?.nombre ??
                              `Genética ${item.genetica_id}`}
                          </p>
                        </div>

                        <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                          {cantidad}
                          <span className="ml-1 text-xs font-medium text-zinc-400">
                            plantas
                          </span>
                        </p>
                      </div>

                      {item.fecha_corte_diferenciada && (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">
                          Corte distinto
                        </span>
                      )}
                    </div>

                    <div className="mt-3 border-t border-zinc-100 pt-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] text-zinc-400">
                          Camas
                        </span>

                        <span className="max-w-[70%] truncate text-right text-[10px] font-semibold text-zinc-600">
                          {camasNombres || '—'}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-[10px] text-zinc-400">
                          Corte
                        </span>

                        <span className="text-[10px] font-semibold text-zinc-700">
                          {corte
                            ? formatearFechaCorta(corte)
                            : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label className="etiqueta">
                  Corte general de la sala
                </label>

                <input
                  type="date"
                  value={corteSalaEditado}
                  onChange={(e) =>
                    setCorteSalaEditado(e.target.value)
                  }
                  className="campo"
                />
              </div>

              <div className="border-t border-zinc-100 pt-4">
                <p className="mb-3 text-xs font-semibold text-zinc-700">
                  Excepciones por genética
                </p>

                <div className="space-y-3">
                  {cicloGeneticas.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-2 sm:grid-cols-[1fr_165px] sm:items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-800">
                          {mapaGeneticas.get(item.genetica_id)?.nombre ??
                            `Genética ${item.genetica_id}`}
                        </p>

                        <p className="text-[10px] text-zinc-400">
                          Vacío = usa el corte general
                        </p>
                      </div>

                      <input
                        type="date"
                        value={
                          cortesGeneticaEditados[item.genetica_id] ??
                          ''
                        }
                        onChange={(e) =>
                          setCortesGeneticaEditados((actual) => ({
                            ...actual,
                            [item.genetica_id]:
                              e.target.value,
                          }))
                        }
                        className="campo"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelarEditarCortes}
                  disabled={guardandoCortes}
                  className="rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-semibold text-zinc-600"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarCortes}
                  disabled={guardandoCortes}
                  className="rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {guardandoCortes
                    ? 'Guardando...'
                    : 'Guardar cortes'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                Cosecha / lote base
              </span>

              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.04em] text-emerald-700">
                Reservado
              </span>
            </div>

            <p className="mt-2 font-mono text-xl font-semibold text-zinc-950">
              {ciclo.codigo_cosecha}
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs leading-5 text-zinc-500">
              Este código acompaña todo el ciclo. Al registrar la cosecha cargaremos los gramos por genética y recién ahí se crearán los lotes reales en Stock.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <MiniKpi
                titulo="Genéticas"
                valor={String(cicloGeneticas.length)}
              />

              <MiniKpi
                titulo="A Stock"
                valor={String(
                  cicloGeneticas.filter(
                    (item) => item.lote_stock_id
                  ).length
                )}
                detalle={`de ${cicloGeneticas.length}`}
              />
            </div>

            <div className="mt-4 rounded-xl bg-zinc-50 px-3 py-3">
              <p className="text-[10px] font-semibold text-zinc-600">
                Próximo paso al corte
              </p>

              <p className="mt-1 text-[10px] leading-4 text-zinc-400">
                Registrar peso final por genética → generar lote → ingresar a Stock.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

function ChipResumen({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 shadow-sm">
      <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-zinc-400">
        {titulo}
      </span>

      <span className="text-xs font-semibold text-zinc-800">
        {valor}
      </span>
    </div>
  )
}

function MarcadorTiempo({
  titulo,
  valor,
  destacado = false,
}: {
  titulo: string
  valor: string
  destacado?: boolean
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        destacado
          ? 'border-amber-200 bg-amber-50'
          : 'border-zinc-200 bg-zinc-50/70'
      }`}
    >
      <p
        className={`text-[9px] font-bold uppercase tracking-[0.06em] ${
          destacado ? 'text-amber-700' : 'text-zinc-400'
        }`}
      >
        {titulo}
      </p>

      <p className="mt-1 text-xs font-semibold text-zinc-800">
        {valor}
      </p>
    </div>
  )
}

function CamaResumenActivo({
  cama,
  posiciones,
  geneticasIds,
  mapaGeneticas,
}: {
  cama: CamaBasica
  posiciones: Array<number | null>
  geneticasIds: number[]
  mapaGeneticas: Map<number, GeneticaCatalogo>
}) {
  const ocupadas = posiciones.filter(Boolean).length

  const resumen = geneticasIds
    .map((geneticaId) => ({
      geneticaId,
      cantidad: posiciones.filter(
        (id) => id === geneticaId
      ).length,
    }))
    .filter((item) => item.cantidad > 0)

  return (
    <div
      className={`rounded-xl border p-4 ${
        ocupadas > 0
          ? 'border-zinc-200 bg-zinc-50/40'
          : 'border-dashed border-zinc-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-emerald-700">
            <IconoCamaMini />
          </span>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900">
              {cama.nombre}
            </p>

            <p className="mt-0.5 text-[10px] text-zinc-400">
              {ocupadas}/{cama.capacidad_plantas} plantas
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-2 py-1 text-[9px] font-bold ${
            ocupadas === cama.capacidad_plantas
              ? 'bg-emerald-50 text-emerald-700'
              : ocupadas > 0
                ? 'bg-amber-50 text-amber-700'
                : 'bg-zinc-100 text-zinc-500'
          }`}
        >
          {ocupadas === cama.capacidad_plantas
            ? 'Completa'
            : ocupadas > 0
              ? 'Parcial'
              : 'Vacía'}
        </span>
      </div>

      <div className="mt-3 flex gap-1 overflow-hidden rounded-lg bg-white p-1 ring-1 ring-zinc-200">
        {Array.from(
          { length: cama.capacidad_plantas },
          (_, indice) => {
            const geneticaId = posiciones[indice] ?? null
            const indiceColor = geneticaId
              ? Math.max(0, geneticasIds.indexOf(geneticaId))
              : -1

            const estilo =
              indiceColor >= 0
                ? estiloPorIndice(indiceColor)
                : null

            return (
              <span
                key={indice}
                title={
                  geneticaId
                    ? mapaGeneticas.get(geneticaId)?.nombre ??
                      `Genética ${geneticaId}`
                    : `Posición ${indice + 1} libre`
                }
                className={`h-4 min-w-[4px] flex-1 rounded-sm ${
                  estilo
                    ? estilo.punto
                    : 'bg-zinc-100'
                }`}
              />
            )
          }
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {resumen.length === 0 ? (
          <span className="text-[10px] text-zinc-400">
            Sin plantas cargadas
          </span>
        ) : (
          resumen.map((item) => {
            const index = Math.max(
              0,
              geneticasIds.indexOf(item.geneticaId)
            )

            const estilo = estiloPorIndice(index)

            return (
              <span
                key={item.geneticaId}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-semibold ${estilo.chip}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${estilo.punto}`}
                />

                {mapaGeneticas.get(item.geneticaId)?.nombre ??
                  `Genética ${item.geneticaId}`}{' '}
                · {item.cantidad}
              </span>
            )
          })
        )}
      </div>
    </div>
  )
}

function SelectorPincel({
  geneticasIds,
  mapaGeneticas,
  geneticaActiva,
  modoBorrar,
  onSeleccionar,
  onBorrar,
}: {
  geneticasIds: number[]
  mapaGeneticas: Map<number, GeneticaCatalogo>
  geneticaActiva: number | null
  modoBorrar: boolean
  onSeleccionar: (id: number) => void
  onBorrar: () => void
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400">
          Pincel
        </span>

        {geneticasIds.map((geneticaId, index) => {
          const genetica = mapaGeneticas.get(geneticaId)
          const estilo = estiloPorIndice(index)
          const activo = geneticaActiva === geneticaId && !modoBorrar

          return (
            <button
              key={geneticaId}
              type="button"
              onClick={() => onSeleccionar(geneticaId)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                activo ? `${estilo.chip} ring-2 ring-zinc-900/10` : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${estilo.punto}`} />
              {genetica?.nombre ?? `Genética ${geneticaId}`}
            </button>
          )
        })}

        <button
          type="button"
          onClick={onBorrar}
          className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
            modoBorrar
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
          }`}
        >
          Borrar posición
        </button>
      </div>

      <p className="mt-2 text-[10px] text-zinc-400">
        Elegí una genética y tocá los lugares de la cama donde va. Volvé a tocar una posición para liberarla.
      </p>
    </div>
  )
}

function EditorCama({
  cama,
  posiciones,
  geneticasIds,
  mapaGeneticas,
  editable,
  onPosicion,
  onLlenar,
  onVaciar,
  puedeLlenar,
}: {
  cama: CamaBasica
  posiciones: Array<number | null>
  geneticasIds: number[]
  mapaGeneticas: Map<number, GeneticaCatalogo>
  editable: boolean
  onPosicion: (indice: number) => void
  onLlenar: () => void
  onVaciar: () => void
  puedeLlenar: boolean
}) {
  const ocupadas = posiciones.filter(Boolean).length
  const columnas = columnasMapa(cama.capacidad_plantas)

  const resumen = geneticasIds
    .map((geneticaId) => ({
      geneticaId,
      cantidad: posiciones.filter((id) => id === geneticaId).length,
    }))
    .filter((item) => item.cantidad > 0)

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-emerald-700">
              <IconoCamaMini />
            </span>
            <div>
              <p className="text-sm font-semibold text-zinc-900">{cama.nombre}</p>
              <p className="text-[10px] text-zinc-400">Posiciones 1–{cama.capacidad_plantas}</p>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm font-semibold text-zinc-900">
            {ocupadas}/{cama.capacidad_plantas}
          </p>
          <p className="text-[10px] text-zinc-400">plantas</p>
        </div>
      </div>

      <div
        className="mt-4 grid gap-2 rounded-xl border border-zinc-200 bg-white p-3"
        style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cama.capacidad_plantas }, (_, indice) => {
          const geneticaId = posiciones[indice] ?? null
          const indiceColor = geneticaId ? Math.max(0, geneticasIds.indexOf(geneticaId)) : -1
          const estilo = indiceColor >= 0 ? estiloPorIndice(indiceColor) : null
          const genetica = geneticaId ? mapaGeneticas.get(geneticaId) : null

          return (
            <button
              key={indice}
              type="button"
              disabled={!editable}
              onClick={() => onPosicion(indice)}
              title={genetica ? `${indice + 1} · ${genetica.nombre}` : `Posición ${indice + 1}`}
              className={`relative aspect-square min-h-[38px] rounded-lg border text-[10px] font-bold transition ${
                geneticaId && estilo
                  ? estilo.slot
                  : 'border-zinc-200 bg-zinc-50 text-zinc-400'
              } ${editable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm' : 'cursor-default'}`}
            >
              <span className="absolute left-1.5 top-1 text-[8px] font-semibold opacity-55">{indice + 1}</span>
              {genetica && (
                <span className="block max-w-full truncate px-1 pt-2 text-[9px]">
                  {iniciales(genetica.nombre)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {resumen.length === 0 ? (
            <span className="text-[10px] text-zinc-400">Cama vacía</span>
          ) : (
            resumen.map((item) => {
              const index = Math.max(0, geneticasIds.indexOf(item.geneticaId))
              const estilo = estiloPorIndice(index)
              return (
                <span
                  key={item.geneticaId}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold ${estilo.chip}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${estilo.punto}`} />
                  {mapaGeneticas.get(item.geneticaId)?.nombre ?? `Genética ${item.geneticaId}`} · {item.cantidad}
                </span>
              )
            })
          )}
        </div>

        {editable && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onVaciar}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-zinc-500 hover:bg-zinc-50"
            >
              Vaciar
            </button>
            <button
              type="button"
              onClick={onLlenar}
              disabled={!puedeLlenar}
              className="rounded-lg bg-zinc-950 px-2.5 py-1.5 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Llenar libres
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function BarraSemanas({
  totalSemanas,
  progreso,
  semanaActual,
}: {
  totalSemanas: number
  progreso: number
  semanaActual: number
}) {
  const semanas = Array.from({ length: Math.max(1, Math.min(totalSemanas, 20)) }, (_, i) => i + 1)

  return (
    <div className="mt-5">
      <div className="relative h-6 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-inset ring-zinc-200">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-700 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, progreso))}%` }}
        />
        <div className="absolute inset-0 flex">
          {semanas.map((semana) => (
            <div key={semana} className="h-full flex-1 border-r border-white/80 last:border-r-0" />
          ))}
        </div>
      </div>

      <div className="mt-2 flex">
        {semanas.map((semana) => (
          <div key={semana} className="min-w-0 flex-1 text-center">
            <span
              className={`text-[9px] font-bold ${
                semana === semanaActual ? 'text-emerald-700' : 'text-zinc-400'
              }`}
            >
              S{semana}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LineaHitos({ hitos }: { hitos: Hito[] }) {
  return (
    <div className="mt-6 overflow-x-auto pb-1">
      <div className="relative flex min-w-[720px] justify-between gap-2 px-3">
        <div className="absolute left-10 right-10 top-3 h-px bg-zinc-200" />
        {hitos.map((hito, index) => (
          <div
            key={`${hito.titulo}-${index}`}
            className="relative z-10 flex w-[150px] flex-col items-center text-center"
          >
            <span
              className={`h-6 w-6 rounded-full border-4 border-white shadow-sm ${
                hito.estado === 'hoy'
                  ? 'bg-emerald-600 ring-2 ring-emerald-200'
                  : hito.estado === 'pasado'
                    ? 'bg-zinc-700'
                    : hito.destacado
                      ? 'bg-amber-400'
                      : 'bg-zinc-200'
              }`}
            />
            <p className="mt-2 text-xs font-semibold text-zinc-800">{hito.titulo}</p>
            <p className="mt-1 text-[10px] font-medium text-zinc-500">
              {hito.fecha ? formatearFechaCorta(hito.fecha) : 'Pendiente'}
            </p>
            <p className="mt-1 text-[9px] leading-4 text-zinc-400">{hito.detalle}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function TituloSeccion({
  numero,
  titulo,
  descripcion,
}: {
  numero: string
  titulo: string
  descripcion: string
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[11px] font-bold text-emerald-700">
        {numero}
      </span>
      <div>
        <p className="text-sm font-semibold text-zinc-950">{titulo}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{descripcion}</p>
      </div>
    </div>
  )
}

function CampoFecha({
  titulo,
  valor,
  onChange,
  ayuda,
}: {
  titulo: string
  valor: string
  onChange: (valor: string) => void
  ayuda?: string
}) {
  return (
    <div>
      <label className="etiqueta">{titulo}</label>
      <input
        type="date"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="campo"
      />
      {ayuda && <p className="mt-1 text-[10px] leading-4 text-zinc-400">{ayuda}</p>}
    </div>
  )
}

function CalendarioNodo({
  etiqueta,
  valor,
  detalle,
  destacado = false,
  manual = false,
}: {
  etiqueta: string
  valor: string
  detalle: string
  destacado?: boolean
  manual?: boolean
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        destacado
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-zinc-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">
          {etiqueta}
        </p>
        {manual && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.05em] text-amber-700">
            Manual
          </span>
        )}
      </div>
      <p className={`mt-1 text-sm font-semibold ${destacado ? 'text-emerald-900' : 'text-zinc-900'}`}>
        {valor}
      </p>
      <p className="mt-0.5 text-[10px] text-zinc-400">{detalle}</p>
    </div>
  )
}

function CalendarioConexion({
  texto,
  alerta = false,
}: {
  texto: string
  alerta?: boolean
}) {
  return (
    <div className="flex items-center gap-2 lg:min-w-[150px]">
      <div className={`hidden h-px flex-1 lg:block ${alerta ? 'bg-red-300' : 'bg-zinc-300'}`} />
      <span
        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-semibold ${
          alerta
            ? 'bg-red-50 text-red-700'
            : 'bg-zinc-100 text-zinc-500'
        }`}
      >
        {texto}
      </span>
      <div className={`hidden h-px flex-1 lg:block ${alerta ? 'bg-red-300' : 'bg-zinc-300'}`} />
    </div>
  )
}

function MiniKpi({
  titulo,
  valor,
  detalle,
  destacado = false,
}: {
  titulo: string
  valor: string
  detalle?: string
  destacado?: boolean
}) {
  return (
    <div className={`rounded-xl px-3 py-3 ${destacado ? 'bg-emerald-50' : 'bg-zinc-50'}`}>
      <p
        className={`text-[9px] font-bold uppercase tracking-[0.06em] ${
          destacado ? 'text-emerald-700' : 'text-zinc-400'
        }`}
      >
        {titulo}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-zinc-950">{valor}</p>
      {detalle && <p className="mt-0.5 text-[9px] text-zinc-400">{detalle}</p>}
    </div>
  )
}

function DatoFranja({
  titulo,
  valor,
  detalle,
}: {
  titulo: string
  valor: string
  detalle?: string
}) {
  return (
    <div className="border-t border-zinc-100 px-6 py-4 sm:border-r sm:border-t-0 last:border-r-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-zinc-400">{titulo}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-900">{valor}</p>
      {detalle && <p className="mt-0.5 text-[10px] text-zinc-400">{detalle}</p>}
    </div>
  )
}

function IconoBroteMini() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22V10" />
      <path d="M12 13C7 13 4 10 4 5c5 0 8 3 8 8Z" />
      <path d="M12 10c0-5 3-8 8-8 0 5-3 8-8 8Z" />
    </svg>
  )
}

function IconoCamaMini() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 8v10" />
      <path d="M20 8v10" />
      <path d="M4 11h16" />
      <path d="M7 8h10" />
      <path d="M7 11v4" />
      <path d="M17 11v4" />
    </svg>
  )
}

function construirHitos(
  ciclo: CicloResumen,
  cicloGeneticas: CicloGenetica[],
  mapaGeneticas: Map<number, GeneticaCatalogo>
): Hito[] {
  const hoy = fechaLocalInput()
  const hitos: Hito[] = [
    {
      titulo: 'Inicio',
      fecha: ciclo.fecha_inicio,
      detalle: 'Inicio del ciclo',
      estado: estadoFecha(ciclo.fecha_inicio, hoy),
    },
  ]

  if (ciclo.fecha_inicio_floracion) {
    hitos.push({
      titulo: 'Floración',
      fecha: ciclo.fecha_inicio_floracion,
      detalle: 'Día 1 de floración',
      estado: estadoFecha(ciclo.fecha_inicio_floracion, hoy),
    })

    hitos.push({
      titulo: 'Día 21',
      fecha: ciclo.fecha_dia_21,
      detalle: 'Última defoliación',
      estado: ciclo.fecha_dia_21 ? estadoFecha(ciclo.fecha_dia_21, hoy) : 'pendiente',
      destacado: true,
    })
  }

  hitos.push({
    titulo: 'Hoy',
    fecha: hoy,
    detalle:
      ciclo.etapa_actual === 'Floración' && ciclo.semana_floracion
        ? `Semana ${ciclo.semana_floracion} · Día ${ciclo.dia_semana_floracion}`
        : ciclo.etapa_actual,
    estado: 'hoy',
  })

  if (ciclo.fecha_corte_planificada) {
    hitos.push({
      titulo: 'Corte sala',
      fecha: ciclo.fecha_corte_planificada,
      detalle: 'Corte planificado general',
      estado: estadoFecha(ciclo.fecha_corte_planificada, hoy),
    })
  }

  cicloGeneticas
    .filter((item) => item.fecha_corte_diferenciada)
    .forEach((item) => {
      hitos.push({
        titulo: 'Corte diferenciado',
        fecha: item.fecha_corte_diferenciada,
        detalle: mapaGeneticas.get(item.genetica_id)?.nombre ?? `Genética ${item.genetica_id}`,
        estado: estadoFecha(item.fecha_corte_diferenciada as string, hoy),
        destacado: true,
      })
    })

  return hitos.sort((a, b) => {
    if (!a.fecha && !b.fecha) return 0
    if (!a.fecha) return 1
    if (!b.fecha) return -1
    return a.fecha.localeCompare(b.fecha)
  })
}

function crearMapaVacio(camas: CamaBasica[]): MapaCamas {
  const mapa: MapaCamas = {}
  camas.forEach((cama) => {
    mapa[cama.cama_id] = Array(cama.capacidad_plantas).fill(null)
  })
  return mapa
}

function copiarMapa(mapa: MapaCamas): MapaCamas {
  const copia: MapaCamas = {}
  Object.entries(mapa).forEach(([camaId, posiciones]) => {
    copia[Number(camaId)] = [...posiciones]
  })
  return copia
}

function mapaDesdeDistribucion(camas: CamaBasica[], distribucion: Distribucion[]): MapaCamas {
  const mapa = crearMapaVacio(camas)

  distribucion.forEach((fila) => {
    const posicionesGuardadas = Array.isArray(fila.posiciones)
      ? fila.posiciones.map(Number).filter((pos) => Number.isInteger(pos) && pos > 0)
      : []

    if (posicionesGuardadas.length > 0) {
      posicionesGuardadas.forEach((posicion) => {
        const indice = posicion - 1
        if (mapa[fila.cama_id] && indice >= 0 && indice < mapa[fila.cama_id].length) {
          mapa[fila.cama_id][indice] = fila.genetica_id
        }
      })
      return
    }

    // Compatibilidad con cualquier fila antigua que solo tenga cantidad.
    let restantes = Number(fila.cantidad ?? 0)
    for (let i = 0; i < (mapa[fila.cama_id]?.length ?? 0) && restantes > 0; i++) {
      if (mapa[fila.cama_id][i] === null) {
        mapa[fila.cama_id][i] = fila.genetica_id
        restantes--
      }
    }
  })

  return mapa
}

function payloadDesdeMapa(mapa: MapaCamas) {
  const payload: {
    cama_id: number
    genetica_id: number
    posiciones: number[]
  }[] = []

  Object.entries(mapa).forEach(([camaIdTexto, posiciones]) => {
    const porGenetica = new Map<number, number[]>()

    posiciones.forEach((geneticaId, indice) => {
      if (!geneticaId) return
      const lista = porGenetica.get(geneticaId) ?? []
      lista.push(indice + 1)
      porGenetica.set(geneticaId, lista)
    })

    porGenetica.forEach((lista, geneticaId) => {
      payload.push({
        cama_id: Number(camaIdTexto),
        genetica_id: geneticaId,
        posiciones: lista,
      })
    })
  })

  return payload
}

function quitarGeneticaDelMapa(mapa: MapaCamas, geneticaId: number): MapaCamas {
  const copia = copiarMapa(mapa)
  Object.keys(copia).forEach((camaId) => {
    copia[Number(camaId)] = copia[Number(camaId)].map((id) => (id === geneticaId ? null : id))
  })
  return copia
}

function totalMapa(mapa: MapaCamas) {
  return Object.values(mapa).reduce(
    (total, posiciones) => total + posiciones.filter(Boolean).length,
    0
  )
}

function contarGeneticaEnMapa(mapa: MapaCamas, geneticaId: number) {
  return Object.values(mapa).reduce(
    (total, posiciones) => total + posiciones.filter((id) => id === geneticaId).length,
    0
  )
}

function superficieEquivalenteMapa(camas: CamaBasica[], mapa: MapaCamas) {
  return camas.reduce((total, cama) => {
    const capacidad = Number(cama.capacidad_plantas ?? 0)
    const superficie = numero(cama.superficie_m2)
    const ocupadas = (mapa[cama.cama_id] ?? []).filter(Boolean).length

    if (capacidad <= 0 || superficie <= 0 || ocupadas <= 0) {
      return total
    }

    return total + (ocupadas / capacidad) * superficie
  }, 0)
}

function formatearPesoMeta(gramos: number) {
  if (!Number.isFinite(gramos) || gramos <= 0) return '0 g'

  if (gramos >= 1000) {
    return `${new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(gramos / 1000)} kg`
  }

  return `${new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(gramos)} g`
}

function estiloPorIndice(indice: number) {
  return PALETA[indice % PALETA.length]
}

function columnasMapa(capacidad: number) {
  if (capacidad >= 18) return 6
  if (capacidad >= 12) return 6
  if (capacidad >= 8) return 4
  if (capacidad >= 6) return 3
  return Math.max(1, capacidad)
}

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return 'G'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase()
}

function calcularSemanasPorFechas(ciclo: CicloResumen) {
  if (!ciclo.fecha_inicio_floracion || !ciclo.fecha_corte_planificada) return 0
  return Math.max(
    1,
    Math.ceil((diasEntre(ciclo.fecha_inicio_floracion, ciclo.fecha_corte_planificada) + 1) / 7)
  )
}

function describirErrorSupabase(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback

  const fila = error as Record<string, unknown>
  const partes = [
    typeof fila.message === 'string' ? fila.message : '',
    typeof fila.details === 'string' ? fila.details : '',
    typeof fila.hint === 'string' ? fila.hint : '',
    typeof fila.code === 'string' ? `Código ${fila.code}` : '',
  ].filter(Boolean)

  return partes.length > 0 ? partes.join(' · ') : fallback
}

function nombreGenetica(fila: Record<string, unknown>) {
  const candidatos = [fila.nombre, fila.genetica, fila.nombre_genetica, fila.descripcion]
  const encontrado = candidatos.find(
    (valor) => typeof valor === 'string' && valor.trim()
  )
  return typeof encontrado === 'string' ? encontrado : `Genética ${String(fila.id ?? '')}`
}

function geneticaActiva(fila: Record<string, unknown>) {
  if (typeof fila.activa === 'boolean') return fila.activa
  if (typeof fila.activo === 'boolean') return fila.activo
  if (typeof fila.estado === 'string') return fila.estado.toLowerCase() !== 'inactiva'
  return true
}

function normalizarTexto(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function fechaLocalInput() {
  const ahora = new Date()
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function sumarDias(fecha: string, dias: number) {
  const date = new Date(`${fecha}T12:00:00`)
  date.setDate(date.getDate() + dias)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function diasEntre(inicio: string, fin: string) {
  const a = new Date(`${inicio}T12:00:00`).getTime()
  const b = new Date(`${fin}T12:00:00`).getTime()
  return Math.round((b - a) / 86400000)
}

function estadoFecha(fecha: string, hoy: string): Hito['estado'] {
  if (fecha === hoy) return 'hoy'
  return fecha < hoy ? 'pasado' : 'futuro'
}

function entero(valor: string | number | null | undefined) {
  const resultado = Number(valor ?? 0)
  return Number.isFinite(resultado) ? Math.max(0, Math.floor(resultado)) : 0
}

function numero(valor: number | string | null | undefined) {
  const resultado = Number(valor ?? 0)
  return Number.isFinite(resultado) ? resultado : 0
}

function formatear(valor: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(valor)
}

function formatearFecha(fecha: string) {
  if (!fecha) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${fecha}T12:00:00`))
}

function formatearFechaCorta(fecha: string) {
  if (!fecha) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${fecha}T12:00:00`))
}
