'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import CultivoActual from './cultivo-actual'
import Riego from './riego'
import Produccion from './produccion'
import HistorialSala from './historial'
import GestionSala from './gestion-sala'
import ResumenSala from './resumen-sala'

type Tab =
  | 'resumen'
  | 'plano'
  | 'setup'
  | 'cultivo'
  | 'riego'
  | 'produccion'
  | 'historial'

type Sala = {
  id: number
  nombre: string
  tipo: string
  estado: string
  ancho: number | string | null
  largo: number | string | null
  alto: number | string | null
  superficie_productiva: number | string | null
  capacidad_maxima: number | null
  observaciones: string | null
  plano_actualizado_at: string | null
  archivada: boolean
  archivada_at: string | null
}

type CamaPlano = {
  cama_id: number
  sala_id: number
  tipo_cama_id: number
  nombre: string
  activa: boolean
  tipo_cama: string
  ancho_base_m: number | string
  largo_base_m: number | string
  capacidad_plantas: number
  superficie_m2: number | string
  plano_x_m: number | string | null
  plano_y_m: number | string | null
  plano_rotacion: number
  ancho_plano_m: number | string
  largo_plano_m: number | string
  ubicada: boolean
  observaciones: string | null
}

type EquipoSala = {
  id: number
  sala_id: number
  catalogo_equipo_id: number
  equipo: string
  categoria: string
  cantidad: number
  potencia_w: number | string | null
  horas_uso_dia: number | string | null
  factor_uso_pct: number | string
  observaciones: string | null
  activo: boolean
  consumo_estimado_kwh_dia: number | string | null
  consumo_estimado_kwh_mes: number | string | null
}

type CatalogoEquipoSetup = {
  id: number
  nombre: string
  categoria: string
  calcula_consumo: boolean
}

type EquipoEditor = {
  cantidad: string
  potencia_w: string
  horas_uso_dia: string
  observaciones: string
}

type ElementoPlano = {
  key: string
  id?: number
  sala_id: number
  tipo:
    | 'Puerta'
    | 'Columna'
    | 'Obstáculo'
    | 'Otro'
  nombre: string
  plano_x_m: number
  plano_y_m: number
  ancho_m: number
  largo_m: number
  rotacion: number
  pared: string | null
  observaciones: string | null
}

type NuevoElemento = {
  tipo:
    | 'Puerta'
    | 'Columna'
    | 'Obstáculo'
    | 'Otro'
  nombre: string
  ancho_m: string
  largo_m: string
}

type Seleccion =
  | {
      tipo: 'cama'
      id: number
    }
  | {
      tipo: 'elemento'
      key: string
    }
  | null

type PendienteColocacion =
  | {
      tipo: 'cama'
      id: number
    }
  | {
      tipo: 'elemento'
      elemento: NuevoElemento
    }
  | null

type RectanguloPlano = {
  key: string
  nombre: string
  x: number
  y: number
  ancho: number
  largo: number
}

type SugerenciaPlano = {
  ejeMovimiento: 'horizontal' | 'vertical'
  aperturaEstimada: number
  pasilloObjetivo: number
  puertaConsiderada: boolean
  camasUbicadas: number
}

type PosicionSugerida = {
  cama_id: number
  x: number
  y: number
  rotacion: number
}

export default function SalaFichaPage() {
  const params = useParams<{ id: string }>()
  const salaId = Number(params.id)
  const supabase = useMemo(() => createClient(), [])
  const canvasRef = useRef<HTMLDivElement | null>(null)

  const [tab, setTab] = useState<Tab>('resumen')
  const [sala, setSala] = useState<Sala | null>(null)
  const [camas, setCamas] = useState<CamaPlano[]>([])
  const [elementos, setElementos] = useState<ElementoPlano[]>([])
  const [equipos, setEquipos] = useState<EquipoSala[]>([])
  const [catalogoEquipos, setCatalogoEquipos] = useState<CatalogoEquipoSetup[]>([])
  const [equipoEditandoId, setEquipoEditandoId] = useState<number | null>(null)
  const [editorEquipo, setEditorEquipo] = useState<EquipoEditor | null>(null)
  const [guardandoEquipo, setGuardandoEquipo] = useState(false)
  const [confirmarQuitarId, setConfirmarQuitarId] = useState<number | null>(null)
  const [agregandoEquipo, setAgregandoEquipo] = useState(false)
  const [nuevoEquipoCatalogoId, setNuevoEquipoCatalogoId] = useState('')
  const [nuevoEquipoEditor, setNuevoEquipoEditor] = useState<EquipoEditor>({
    cantidad: '1',
    potencia_w: '',
    horas_uso_dia: '',
    observaciones: '',
  })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [editandoPlano, setEditandoPlano] = useState(false)
  const [guardandoPlano, setGuardandoPlano] = useState(false)
  const [seleccion, setSeleccion] = useState<Seleccion>(null)
  const [pendienteColocacion, setPendienteColocacion] =
    useState<PendienteColocacion>(null)
  const [nuevoElemento, setNuevoElemento] = useState<NuevoElemento>(
    crearPlantillaElemento('Puerta')
  )

  const [sugerenciaPlano, setSugerenciaPlano] =
    useState<SugerenciaPlano | null>(null)

  useEffect(() => {
    if (!Number.isFinite(salaId)) return
    cargarFicha()
  }, [salaId])

  async function cargarFicha() {
    setCargando(true)
    setError('')

    const [
      resultadoSala,
      resultadoCamas,
      resultadoElementos,
      resultadoEquipos,
      resultadoCatalogo,
    ] = await Promise.all([
      supabase
        .from('salas')
        .select(`
          id,
          nombre,
          tipo,
          estado,
          ancho,
          largo,
          alto,
          superficie_productiva,
          capacidad_maxima,
          observaciones,
          plano_actualizado_at,
          archivada,
          archivada_at
        `)
        .eq('id', salaId)
        .single(),

      supabase
        .from('vista_camas_plano')
        .select('*')
        .eq('sala_id', salaId)
        .eq('activa', true)
        .order('cama_id'),

      supabase
        .from('elementos_plano_sala')
        .select(`
          id,
          sala_id,
          tipo,
          nombre,
          plano_x_m,
          plano_y_m,
          ancho_m,
          largo_m,
          rotacion,
          pared,
          observaciones
        `)
        .eq('sala_id', salaId)
        .order('id'),

      supabase
        .from('vista_equipos_sala')
        .select('*')
        .eq('sala_id', salaId)
        .eq('activo', true)
        .order('categoria')
        .order('equipo'),

      supabase
        .from('catalogo_equipos')
        .select('id, nombre, categoria, calcula_consumo')
        .eq('activa', true)
        .eq('ambito', 'Sala')
        .order('categoria')
        .order('nombre'),
    ])

    if (resultadoSala.error) {
      console.error(resultadoSala.error)
      setError('No se pudo cargar la sala.')
      setCargando(false)
      return
    }

    if (resultadoCamas.error) {
      console.error(resultadoCamas.error)
      setError('No se pudieron cargar las camas.')
      setCargando(false)
      return
    }

    if (resultadoElementos.error) {
      console.error(resultadoElementos.error)
      setError('No se pudo cargar el plano.')
      setCargando(false)
      return
    }

    if (resultadoEquipos.error) {
      console.error(resultadoEquipos.error)
      setError('No se pudo cargar el equipamiento.')
      setCargando(false)
      return
    }

    if (resultadoCatalogo.error) {
      console.error(resultadoCatalogo.error)
      setError('No se pudo cargar el catálogo de equipamiento.')
      setCargando(false)
      return
    }

    setSala(resultadoSala.data as Sala)
    setCamas((resultadoCamas.data ?? []) as CamaPlano[])

    setElementos(
      (resultadoElementos.data ?? []).map((elemento) => ({
        ...elemento,
        key: `db-${elemento.id}`,
        plano_x_m: Number(elemento.plano_x_m),
        plano_y_m: Number(elemento.plano_y_m),
        ancho_m: Number(elemento.ancho_m),
        largo_m: Number(elemento.largo_m),
        rotacion: Number(elemento.rotacion),
      })) as ElementoPlano[]
    )

    setEquipos((resultadoEquipos.data ?? []) as EquipoSala[])
    setCatalogoEquipos((resultadoCatalogo.data ?? []) as CatalogoEquipoSetup[])
    setEquipoEditandoId(null)
    setEditorEquipo(null)
    setConfirmarQuitarId(null)
    setAgregandoEquipo(false)
    setNuevoEquipoCatalogoId('')
    setNuevoEquipoEditor({
      cantidad: '1',
      potencia_w: '',
      horas_uso_dia: '',
      observaciones: '',
    })
    setSeleccion(null)
    setPendienteColocacion(null)
    setSugerenciaPlano(null)
    setEditandoPlano(false)
    setCargando(false)
  }

  const anchoSala = numero(sala?.ancho)
  const largoSala = numero(sala?.largo)
  const altoSala = numero(sala?.alto)

  const superficieSala =
    anchoSala > 0 && largoSala > 0 ? anchoSala * largoSala : 0

  const volumenSala =
    superficieSala > 0 && altoSala > 0 ? superficieSala * altoSala : 0

  const superficieProductiva = numero(sala?.superficie_productiva)
  const espacioLibre = Math.max(0, superficieSala - superficieProductiva)

  const porcentajeProductivo =
    superficieSala > 0
      ? Math.min(100, (superficieProductiva / superficieSala) * 100)
      : 0

  const totalCamas = camas.length

  const camasUbicadas = camas.filter(
    (cama) => cama.plano_x_m !== null && cama.plano_y_m !== null
  ).length

  const capacidadMaxima = sala?.capacidad_maxima ?? 0

  const cantidadEquipos = equipos.reduce(
    (total, equipo) => total + Number(equipo.cantidad ?? 0),
    0
  )

  const consumoDia = equipos.reduce(
    (total, equipo) => total + numero(equipo.consumo_estimado_kwh_dia),
    0
  )

  const consumoMes = consumoDia * 30
  const planoDisponible = anchoSala > 0 && largoSala > 0
  const planoCompleto = totalCamas > 0 && camasUbicadas === totalCamas

  const rectangulos = construirRectangulos(camas, elementos)
  const superposiciones = detectarSuperposiciones(rectangulos)
  const tieneSuperposiciones = superposiciones.length > 0

  const seleccionActual = obtenerSeleccionActual(
    seleccion,
    camas,
    elementos
  )

  const equiposPorCategoria = useMemo(() => {
    const mapa = new Map<string, EquipoSala[]>()

    equipos.forEach((equipo) => {
      const lista = mapa.get(equipo.categoria) ?? []
      lista.push(equipo)
      mapa.set(equipo.categoria, lista)
    })

    return Array.from(mapa.entries())
  }, [equipos])

  const catalogoPorId = useMemo(() => {
    return new Map(catalogoEquipos.map((equipo) => [equipo.id, equipo]))
  }, [catalogoEquipos])

  const equiposDisponibles = useMemo(() => {
    const activos = new Set(equipos.map((equipo) => equipo.catalogo_equipo_id))
    return catalogoEquipos.filter((equipo) => !activos.has(equipo.id))
  }, [catalogoEquipos, equipos])

  const categoriasEquipamiento = equiposPorCategoria.length

  function editarEquipo(equipo: EquipoSala) {
    setError('')
    setConfirmarQuitarId(null)
    setAgregandoEquipo(false)
    setEquipoEditandoId(equipo.id)
    setEditorEquipo({
      cantidad: String(equipo.cantidad ?? 1),
      potencia_w:
        equipo.potencia_w === null || equipo.potencia_w === undefined
          ? ''
          : String(equipo.potencia_w),
      horas_uso_dia:
        equipo.horas_uso_dia === null || equipo.horas_uso_dia === undefined
          ? ''
          : String(equipo.horas_uso_dia),
      observaciones: equipo.observaciones ?? '',
    })
  }

  function cancelarEdicionEquipo() {
    setEquipoEditandoId(null)
    setEditorEquipo(null)
    setConfirmarQuitarId(null)
  }

  function actualizarEditorEquipo(campo: keyof EquipoEditor, valor: string) {
    setEditorEquipo((actual) =>
      actual
        ? {
            ...actual,
            [campo]: valor,
          }
        : actual
    )
  }

  function actualizarNuevoEquipo(campo: keyof EquipoEditor, valor: string) {
    setNuevoEquipoEditor((actual) => ({
      ...actual,
      [campo]: valor,
    }))
  }

  async function guardarEdicionEquipo(equipo: EquipoSala) {
    if (!editorEquipo) return

    const cantidad = Number(editorEquipo.cantidad)
    const catalogo = catalogoPorId.get(equipo.catalogo_equipo_id)
    const calculaConsumo = catalogo?.calcula_consumo ?? true

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      setError('La cantidad del equipo debe ser un número entero mayor a 0.')
      return
    }

    const potencia = editorEquipo.potencia_w.trim()
      ? numero(editorEquipo.potencia_w)
      : null

    const horas = editorEquipo.horas_uso_dia.trim()
      ? numero(editorEquipo.horas_uso_dia)
      : null

    if (calculaConsumo && potencia !== null && potencia < 0) {
      setError('La potencia eléctrica no puede ser negativa.')
      return
    }

    if (calculaConsumo && horas !== null && (horas < 0 || horas > 24)) {
      setError('Las horas de uso diario deben estar entre 0 y 24.')
      return
    }

    setError('')
    setGuardandoEquipo(true)

    const { error: updateError } = await supabase
      .from('equipos_sala')
      .update({
        cantidad,
        potencia_w: calculaConsumo ? potencia : null,
        horas_uso_dia: calculaConsumo ? horas : null,
        factor_uso_pct: 100,
        observaciones: editorEquipo.observaciones.trim() || null,
      })
      .eq('id', equipo.id)

    if (updateError) {
      console.error(updateError)
      setError(updateError.message || 'No se pudo actualizar el equipo.')
      setGuardandoEquipo(false)
      return
    }

    setGuardandoEquipo(false)
    await cargarFicha()
    setTab('setup')
  }

  async function quitarEquipo(equipo: EquipoSala) {
    setError('')
    setGuardandoEquipo(true)

    const { error: updateError } = await supabase
      .from('equipos_sala')
      .update({ activo: false })
      .eq('id', equipo.id)

    if (updateError) {
      console.error(updateError)
      setError(updateError.message || 'No se pudo quitar el equipo de la sala.')
      setGuardandoEquipo(false)
      return
    }

    setGuardandoEquipo(false)
    await cargarFicha()
    setTab('setup')
  }

  function abrirAgregarEquipo() {
    setError('')
    setEquipoEditandoId(null)
    setEditorEquipo(null)
    setConfirmarQuitarId(null)
    setAgregandoEquipo(true)

    const primerDisponible = equiposDisponibles[0]
    setNuevoEquipoCatalogoId(primerDisponible ? String(primerDisponible.id) : '')
    setNuevoEquipoEditor({
      cantidad: '1',
      potencia_w: '',
      horas_uso_dia: '',
      observaciones: '',
    })
  }

  function cancelarAgregarEquipo() {
    setAgregandoEquipo(false)
    setNuevoEquipoCatalogoId('')
    setNuevoEquipoEditor({
      cantidad: '1',
      potencia_w: '',
      horas_uso_dia: '',
      observaciones: '',
    })
  }

  async function agregarEquipoSala() {
    const catalogoId = Number(nuevoEquipoCatalogoId)
    const catalogo = catalogoPorId.get(catalogoId)
    const cantidad = Number(nuevoEquipoEditor.cantidad)

    if (!catalogo) {
      setError('Seleccioná un equipo para agregar.')
      return
    }

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      setError('La cantidad del equipo debe ser un número entero mayor a 0.')
      return
    }

    const potencia = nuevoEquipoEditor.potencia_w.trim()
      ? numero(nuevoEquipoEditor.potencia_w)
      : null

    const horas = nuevoEquipoEditor.horas_uso_dia.trim()
      ? numero(nuevoEquipoEditor.horas_uso_dia)
      : null

    if (catalogo.calcula_consumo && potencia !== null && potencia < 0) {
      setError('La potencia eléctrica no puede ser negativa.')
      return
    }

    if (catalogo.calcula_consumo && horas !== null && (horas < 0 || horas > 24)) {
      setError('Las horas de uso diario deben estar entre 0 y 24.')
      return
    }

    setError('')
    setGuardandoEquipo(true)

    const { error: insertError } = await supabase.from('equipos_sala').insert({
      sala_id: salaId,
      catalogo_equipo_id: catalogo.id,
      cantidad,
      potencia_w: catalogo.calcula_consumo ? potencia : null,
      horas_uso_dia: catalogo.calcula_consumo ? horas : null,
      factor_uso_pct: 100,
      observaciones: nuevoEquipoEditor.observaciones.trim() || null,
      activo: true,
    })

    if (insertError) {
      console.error(insertError)
      setError(insertError.message || 'No se pudo agregar el equipo.')
      setGuardandoEquipo(false)
      return
    }

    setGuardandoEquipo(false)
    await cargarFicha()
    setTab('setup')
  }

  function dimensionesCama(cama: CamaPlano) {
    const anchoBase = numero(cama.ancho_base_m)
    const largoBase = numero(cama.largo_base_m)

    return cama.plano_rotacion === 90
      ? { ancho: largoBase, largo: anchoBase }
      : { ancho: anchoBase, largo: largoBase }
  }

  function dimensionesElemento(elemento: ElementoPlano) {
    return elemento.rotacion === 90
      ? { ancho: elemento.largo_m, largo: elemento.ancho_m }
      : { ancho: elemento.ancho_m, largo: elemento.largo_m }
  }

  function comenzarEditarPlano() {
    if (!planoDisponible) {
      setError('La sala necesita ancho y largo para editar el plano.')
      return
    }

    setError('')
    setEditandoPlano(true)
    setTab('plano')
  }

  function cancelarEdicionPlano() {
    cargarFicha()
  }

  function prepararCama(camaId: number) {
    setError('')
    setPendienteColocacion({ tipo: 'cama', id: camaId })
    setSeleccion({ tipo: 'cama', id: camaId })
  }

  function cancelarColocacion() {
    setPendienteColocacion(null)
  }

  function cambiarTipoNuevoElemento(tipo: NuevoElemento['tipo']) {
    setNuevoElemento(crearPlantillaElemento(tipo))
  }

  function prepararElemento() {
    const nombre = nuevoElemento.nombre.trim()
    const ancho = numero(nuevoElemento.ancho_m)
    const largo = numero(nuevoElemento.largo_m)

    if (!nombre) {
      setError('Ingresá un nombre para el elemento.')
      return
    }

    if (ancho <= 0 || largo <= 0) {
      setError('Ingresá medidas válidas para el elemento.')
      return
    }

    if (ancho > anchoSala || largo > largoSala) {
      setError('Las medidas del elemento superan las dimensiones de la sala.')
      return
    }

    setError('')
    setPendienteColocacion({
      tipo: 'elemento',
      elemento: {
        ...nuevoElemento,
        nombre,
      },
    })
  }

  function clickPlano(e: ReactMouseEvent<HTMLDivElement>) {
    if (!editandoPlano || !pendienteColocacion) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const xClick = ((e.clientX - rect.left) / rect.width) * anchoSala
    const yClick = ((e.clientY - rect.top) / rect.height) * largoSala

    if (pendienteColocacion.tipo === 'cama') {
      const cama = camas.find(
        (item) => item.cama_id === pendienteColocacion.id
      )

      if (!cama) return

      const dimensiones = dimensionesCama(cama)

      const x = limitar(
        snap(xClick - dimensiones.ancho / 2),
        0,
        Math.max(0, anchoSala - dimensiones.ancho)
      )

      const y = limitar(
        snap(yClick - dimensiones.largo / 2),
        0,
        Math.max(0, largoSala - dimensiones.largo)
      )

      setCamas((actual) =>
        actual.map((item) =>
          item.cama_id === cama.cama_id
            ? {
                ...item,
                plano_x_m: x,
                plano_y_m: y,
                ubicada: true,
              }
            : item
        )
      )

      setSeleccion({ tipo: 'cama', id: cama.cama_id })
      setPendienteColocacion(null)
      return
    }

    const ancho = numero(pendienteColocacion.elemento.ancho_m)
    const largo = numero(pendienteColocacion.elemento.largo_m)

    const x = limitar(
      snap(xClick - ancho / 2),
      0,
      Math.max(0, anchoSala - ancho)
    )

    const y = limitar(
      snap(yClick - largo / 2),
      0,
      Math.max(0, largoSala - largo)
    )

    const key = `tmp-${Date.now()}`

    const elemento: ElementoPlano = {
      key,
      sala_id: salaId,
      tipo: pendienteColocacion.elemento.tipo,
      nombre: pendienteColocacion.elemento.nombre,
      plano_x_m: x,
      plano_y_m: y,
      ancho_m: ancho,
      largo_m: largo,
      rotacion: 0,
      pared: null,
      observaciones: null,
    }

    setElementos((actual) => [...actual, elemento])
    setSeleccion({ tipo: 'elemento', key })
    setPendienteColocacion(null)
    setNuevoElemento(crearPlantillaElemento('Puerta'))
  }

  function iniciarArrastreCama(
    e: ReactPointerEvent<HTMLDivElement>,
    cama: CamaPlano
  ) {
    e.preventDefault()
    e.stopPropagation()

    setSeleccion({ tipo: 'cama', id: cama.cama_id })

    if (!editandoPlano) return
    if (cama.plano_x_m === null || cama.plano_y_m === null) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const inicioMouseX = e.clientX
    const inicioMouseY = e.clientY
    const inicioX = numero(cama.plano_x_m)
    const inicioY = numero(cama.plano_y_m)
    const dimensiones = dimensionesCama(cama)

    function mover(evento: PointerEvent) {
      const deltaX =
        ((evento.clientX - inicioMouseX) / rect.width) * anchoSala

      const deltaY =
        ((evento.clientY - inicioMouseY) / rect.height) * largoSala

      const nuevoX = limitar(
        snap(inicioX + deltaX),
        0,
        Math.max(0, anchoSala - dimensiones.ancho)
      )

      const nuevoY = limitar(
        snap(inicioY + deltaY),
        0,
        Math.max(0, largoSala - dimensiones.largo)
      )

      setCamas((actual) =>
        actual.map((item) =>
          item.cama_id === cama.cama_id
            ? {
                ...item,
                plano_x_m: nuevoX,
                plano_y_m: nuevoY,
                ubicada: true,
              }
            : item
        )
      )
    }

    function terminar() {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', terminar)
    }

    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', terminar)
  }

  function iniciarArrastreElemento(
    e: ReactPointerEvent<HTMLDivElement>,
    elemento: ElementoPlano
  ) {
    e.preventDefault()
    e.stopPropagation()

    setSeleccion({ tipo: 'elemento', key: elemento.key })

    if (!editandoPlano) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const inicioMouseX = e.clientX
    const inicioMouseY = e.clientY
    const inicioX = elemento.plano_x_m
    const inicioY = elemento.plano_y_m
    const dimensiones = dimensionesElemento(elemento)

    function mover(evento: PointerEvent) {
      const deltaX =
        ((evento.clientX - inicioMouseX) / rect.width) * anchoSala

      const deltaY =
        ((evento.clientY - inicioMouseY) / rect.height) * largoSala

      const nuevoX = limitar(
        snap(inicioX + deltaX),
        0,
        Math.max(0, anchoSala - dimensiones.ancho)
      )

      const nuevoY = limitar(
        snap(inicioY + deltaY),
        0,
        Math.max(0, largoSala - dimensiones.largo)
      )

      setElementos((actual) =>
        actual.map((item) =>
          item.key === elemento.key
            ? {
                ...item,
                plano_x_m: nuevoX,
                plano_y_m: nuevoY,
              }
            : item
        )
      )
    }

    function terminar() {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', terminar)
    }

    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', terminar)
  }

  function rotarCama(camaId: number) {
    setCamas((actual) =>
      actual.map((cama) => {
        if (cama.cama_id !== camaId) return cama

        const nuevaRotacion = cama.plano_rotacion === 90 ? 0 : 90
        const anchoBase = numero(cama.ancho_base_m)
        const largoBase = numero(cama.largo_base_m)
        const anchoNuevo = nuevaRotacion === 90 ? largoBase : anchoBase
        const largoNuevo = nuevaRotacion === 90 ? anchoBase : largoBase

        return {
          ...cama,
          plano_rotacion: nuevaRotacion,
          plano_x_m:
            cama.plano_x_m === null
              ? null
              : limitar(
                  numero(cama.plano_x_m),
                  0,
                  Math.max(0, anchoSala - anchoNuevo)
                ),
          plano_y_m:
            cama.plano_y_m === null
              ? null
              : limitar(
                  numero(cama.plano_y_m),
                  0,
                  Math.max(0, largoSala - largoNuevo)
                ),
        }
      })
    )

    setSeleccion({ tipo: 'cama', id: camaId })
  }

  function rotarElemento(key: string) {
    setElementos((actual) =>
      actual.map((elemento) => {
        if (elemento.key !== key) return elemento

        const nuevaRotacion = elemento.rotacion === 90 ? 0 : 90
        const anchoNuevo =
          nuevaRotacion === 90 ? elemento.largo_m : elemento.ancho_m
        const largoNuevo =
          nuevaRotacion === 90 ? elemento.ancho_m : elemento.largo_m

        return {
          ...elemento,
          rotacion: nuevaRotacion,
          plano_x_m: limitar(
            elemento.plano_x_m,
            0,
            Math.max(0, anchoSala - anchoNuevo)
          ),
          plano_y_m: limitar(
            elemento.plano_y_m,
            0,
            Math.max(0, largoSala - largoNuevo)
          ),
        }
      })
    )

    setSeleccion({ tipo: 'elemento', key })
  }

  function rotarSeleccionado() {
    if (!seleccion) return

    if (seleccion.tipo === 'cama') {
      rotarCama(seleccion.id)
      return
    }

    rotarElemento(seleccion.key)
  }

  function moverSeleccionado(deltaX: number, deltaY: number) {
    if (!seleccion) return

    if (seleccion.tipo === 'cama') {
      setCamas((actual) =>
        actual.map((cama) => {
          if (cama.cama_id !== seleccion.id) return cama
          if (cama.plano_x_m === null || cama.plano_y_m === null) return cama

          const dimensiones = dimensionesCama(cama)

          return {
            ...cama,
            plano_x_m: limitar(
              snap(numero(cama.plano_x_m) + deltaX),
              0,
              Math.max(0, anchoSala - dimensiones.ancho)
            ),
            plano_y_m: limitar(
              snap(numero(cama.plano_y_m) + deltaY),
              0,
              Math.max(0, largoSala - dimensiones.largo)
            ),
          }
        })
      )

      return
    }

    setElementos((actual) =>
      actual.map((elemento) => {
        if (elemento.key !== seleccion.key) return elemento

        const dimensiones = dimensionesElemento(elemento)

        return {
          ...elemento,
          plano_x_m: limitar(
            snap(elemento.plano_x_m + deltaX),
            0,
            Math.max(0, anchoSala - dimensiones.ancho)
          ),
          plano_y_m: limitar(
            snap(elemento.plano_y_m + deltaY),
            0,
            Math.max(0, largoSala - dimensiones.largo)
          ),
        }
      })
    )
  }

  function sacarCamaDelPlano() {
    if (seleccion?.tipo !== 'cama') return

    setCamas((actual) =>
      actual.map((cama) =>
        cama.cama_id === seleccion.id
          ? {
              ...cama,
              plano_x_m: null,
              plano_y_m: null,
              ubicada: false,
            }
          : cama
      )
    )

    setPendienteColocacion(null)
    setSeleccion(null)
  }

  function eliminarElemento() {
    if (seleccion?.tipo !== 'elemento') return

    setElementos((actual) =>
      actual.filter((elemento) => elemento.key !== seleccion.key)
    )

    setPendienteColocacion(null)
    setSeleccion(null)
  }

  function generarDistribucionSugerida() {
    if (!planoDisponible) {
      setError('La sala necesita ancho y largo para generar una distribución.')
      return
    }

    if (camas.length === 0) {
      setError('La sala no tiene camas para distribuir.')
      return
    }

    const resultado = calcularDistribucionSugerida({
      camas,
      elementos,
      anchoSala,
      largoSala,
      pasilloObjetivo: 0.8,
    })

    if (!resultado) {
      setError(
        'No encontré una distribución válida con las medidas actuales. Revisá puerta, obstáculos o medidas de la sala y ajustamos manualmente.'
      )
      return
    }

    const porId = new Map(
      resultado.posiciones.map((posicion) => [posicion.cama_id, posicion])
    )

    setCamas((actual) =>
      actual.map((cama) => {
        const posicion = porId.get(cama.cama_id)
        if (!posicion) return cama

        return {
          ...cama,
          plano_x_m: posicion.x,
          plano_y_m: posicion.y,
          plano_rotacion: posicion.rotacion,
          ubicada: true,
        }
      })
    )

    setSeleccion(null)
    setPendienteColocacion(null)
    setError('')
    setSugerenciaPlano({
      ejeMovimiento: resultado.ejeMovimiento,
      aperturaEstimada: resultado.aperturaEstimada,
      pasilloObjetivo: resultado.pasilloObjetivo,
      puertaConsiderada: resultado.puertaConsiderada,
      camasUbicadas: resultado.posiciones.length,
    })
  }

  async function guardarPlano() {
    if (tieneSuperposiciones) {
      setError(
        'Hay elementos superpuestos en el plano. Corregilos antes de guardar.'
      )
      return
    }

    setError('')
    setGuardandoPlano(true)

    const camasPayload = camas.map((cama) => ({
      id: cama.cama_id,
      x_m:
        cama.plano_x_m === null ? null : numero(cama.plano_x_m),
      y_m:
        cama.plano_y_m === null ? null : numero(cama.plano_y_m),
      rotacion: cama.plano_rotacion ?? 0,
    }))

    const elementosPayload = elementos.map((elemento) => ({
      tipo: elemento.tipo,
      nombre: elemento.nombre,
      x_m: elemento.plano_x_m,
      y_m: elemento.plano_y_m,
      ancho_m: elemento.ancho_m,
      largo_m: elemento.largo_m,
      rotacion: elemento.rotacion,
      pared: elemento.pared,
      observaciones: elemento.observaciones,
    }))

    const { error: rpcError } = await supabase.rpc('guardar_plano_sala', {
      p_sala_id: salaId,
      p_camas: camasPayload,
      p_elementos: elementosPayload,
    })

    if (rpcError) {
      console.error(rpcError)
      setError(rpcError.message || 'No se pudo guardar el plano.')
      setGuardandoPlano(false)
      return
    }

    setGuardandoPlano(false)
    await cargarFicha()
    setTab('plano')
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-[#f5f6f7]">
        <div className="mx-auto max-w-[1450px] px-6 py-8">
          <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 shadow-sm">
            Cargando ficha de sala...
          </div>
        </div>
      </main>
    )
  }

  if (error && !sala) {
    return (
      <main className="min-h-screen bg-[#f5f6f7]">
        <div className="mx-auto max-w-[1450px] px-6 py-8">
          <Link
            href="/cultivo"
            className="text-sm font-medium text-zinc-500"
          >
            ← Volver a Cultivo
          </Link>

          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
            {error}
          </div>
        </div>
      </main>
    )
  }

  if (!sala) return null

  return (
    <main className="min-h-screen bg-[#f5f6f7]">
      <div className="mx-auto max-w-[1450px] px-5 py-7 lg:px-8 lg:py-8">
        <Link
          href="/cultivo"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-950"
        >
          ← Volver a Cultivo
        </Link>

        {/* =====================================================
            CABECERA
        ====================================================== */}

        <header className="mt-5 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="relative overflow-hidden px-6 py-3.5 lg:px-7 lg:py-4">
            <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-emerald-50" />

            <div className="relative min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                  Cultivo · Sala
                </span>
                <EstadoBadge estado={sala.estado} />
                {sala.archivada && (
                  <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                    Archivada
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 lg:text-3xl">
                  {sala.nombre}
                </h1>

                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
                  {sala.tipo}
                </span>
              </div>

            </div>
          </div>

          <div className="grid border-t border-zinc-100 sm:grid-cols-2 xl:grid-cols-4">
            <HeaderKpi
              icono={<IconoRegla />}
              titulo="Dimensiones"
              valor={
                anchoSala > 0 && largoSala > 0
                  ? `${formatear(anchoSala)} × ${formatear(largoSala)} m`
                  : '—'
              }
              detalle={
                altoSala > 0 ? `${formatear(altoSala)} m de alto` : undefined
              }
            />

            <HeaderKpi
              icono={<IconoCama />}
              titulo="Camas"
              valor={`${totalCamas}`}
              detalle={`${formatear(superficieProductiva)} m² productivos`}
            />

            <HeaderKpi
              icono={<IconoPlanta />}
              titulo="Capacidad"
              valor={`${capacidadMaxima}`}
              detalle="plantas"
            />

            <HeaderKpi
              icono={<IconoPlano />}
              titulo="Plano"
              valor={
                planoCompleto
                  ? 'Completo'
                  : totalCamas === 0
                    ? 'Sin camas'
                    : `${camasUbicadas}/${totalCamas}`
              }
              detalle="camas ubicadas"
              destacado={planoCompleto}
            />
          </div>
        </header>

        {error && (
          <div className="mt-5 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="shrink-0 text-xs font-bold"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* =====================================================
            NAVEGACIÓN
        ====================================================== */}

        <nav className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white px-2 shadow-sm">
          <div className="flex min-w-max">
            <TabButton
              activo={tab === 'resumen'}
              onClick={() => setTab('resumen')}
            >
              Resumen
            </TabButton>

            <TabButton activo={tab === 'plano'} onClick={() => setTab('plano')}>
              Plano
            </TabButton>

            <TabButton activo={tab === 'setup'} onClick={() => setTab('setup')}>
              Setup
            </TabButton>

            <TabButton
              activo={tab === 'cultivo'}
              onClick={() => setTab('cultivo')}
            >
              Cultivo actual
            </TabButton>

            <TabButton activo={tab === 'riego'} onClick={() => setTab('riego')}>
              Riego
            </TabButton>

            <TabButton
              activo={tab === 'produccion'}
              onClick={() => setTab('produccion')}
            >
              Producción
            </TabButton>

            <TabButton
              activo={tab === 'historial'}
              onClick={() => setTab('historial')}
            >
              Historial
            </TabButton>
          </div>
        </nav>

        {/* =====================================================
            RESUMEN
        ====================================================== */}

        {tab === 'resumen' && (
          <div className="mt-3 space-y-4">
            <ResumenSala
              salaId={salaId}
              salaNombre={sala.nombre}
              capacidadMaxima={capacidadMaxima}
              onCambiarTab={(destino) =>
                setTab(destino)
              }
            />

            <div className="grid gap-3 md:grid-cols-3">
              <ResumenBloque
                icono={<IconoRegla />}
                titulo="Espacio físico"
                valor={`${formatear(superficieSala)} m²`}
                texto={`${formatear(volumenSala)} m³ de volumen total`}
              />

              <ResumenBloque
                icono={<IconoCama />}
                titulo="Capacidad física"
                valor={`${capacidadMaxima} plantas`}
                texto={`${totalCamas} camas · ${formatear(superficieProductiva)} m² productivos`}
              />

              <ResumenBloque
                icono={<IconoHerramienta />}
                titulo="Equipamiento"
                valor={`${cantidadEquipos} unidades`}
                texto={`${equipos.length} tipos de equipo configurados`}
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
              <Card className="overflow-hidden p-0">
                <div className="border-b border-zinc-100 px-5 py-4 lg:px-6">
                  <CardHeader
                    titulo="Vista física de la sala"
                    descripcion="Superficie, camas y distribución del setup actual."
                    className="mb-0"
                  />
                </div>

                <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="border-b border-zinc-100 p-5 lg:border-b-0 lg:border-r lg:p-6">
                    <MiniPlano
                      camas={camas}
                      elementos={elementos}
                      anchoSala={anchoSala}
                      largoSala={largoSala}
                    />
                  </div>

                  <div className="p-5 lg:p-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                      Distribución física
                    </p>

                    <div className="mt-4 space-y-4">
                      <ResumenLinea
                        titulo="Camas ubicadas"
                        valor={`${camasUbicadas}/${totalCamas}`}
                      />

                      <ResumenLinea
                        titulo="Área productiva"
                        valor={`${formatear(superficieProductiva)} m²`}
                      />

                      <ResumenLinea
                        titulo="Espacio libre"
                        valor={`${formatear(espacioLibre)} m²`}
                      />

                      <ResumenLinea
                        titulo="Elementos del plano"
                        valor={String(elementos.length)}
                      />
                    </div>

                    <div className="mt-5 rounded-2xl bg-zinc-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-zinc-700">
                          Ocupación física
                        </span>

                        <span className="text-xs font-bold text-zinc-900">
                          {formatear(porcentajeProductivo)}%
                        </span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{
                            width: `${porcentajeProductivo}%`,
                          }}
                        />
                      </div>
                    </div>

                    <EstadoPlanoResumen
                      completo={planoCompleto}
                      totalCamas={totalCamas}
                      camasUbicadas={camasUbicadas}
                    />
                  </div>
                </div>
              </Card>

              <div className="space-y-5">
                <Card>
                  <CardHeader
                    titulo="Estado del setup"
                    descripcion="Configuración permanente de esta sala."
                  />

                  <div className="space-y-3">
                    <ChecklistItem
                      completo={
                        anchoSala > 0 &&
                        largoSala > 0 &&
                        altoSala > 0
                      }
                      titulo="Dimensiones"
                      texto="Ancho, largo y alto definidos"
                    />

                    <ChecklistItem
                      completo={totalCamas > 0}
                      titulo="Camas"
                      texto={`${totalCamas} cama${totalCamas === 1 ? '' : 's'} configurada${totalCamas === 1 ? '' : 's'}`}
                    />

                    <ChecklistItem
                      completo={planoCompleto}
                      titulo="Plano"
                      texto={`${camasUbicadas}/${totalCamas} camas ubicadas`}
                    />

                    <ChecklistItem
                      completo={equipos.length > 0}
                      titulo="Equipamiento"
                      texto={`${cantidadEquipos} unidades registradas`}
                    />
                  </div>
                </Card>

                <Card>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                        Consumo eléctrico
                      </p>

                      <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
                        {formatear(consumoDia)}
                      </p>

                      <p className="text-xs text-zinc-500">
                        kWh teóricos / día
                      </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                      <IconoRayo />
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
                    <span className="text-xs text-zinc-500">
                      Proyección mensual
                    </span>

                    <strong className="text-sm text-zinc-900">
                      {formatear(consumoMes)} kWh
                    </strong>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            PLANO
        ====================================================== */}

        {tab === 'plano' && (
          <div className="mt-5">
            {!planoDisponible ? (
              <Card>
                <EstadoVacio
                  titulo="Plano no disponible"
                  texto="La sala necesita ancho y largo definidos para generar el plano."
                />
              </Card>
            ) : (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Card className="overflow-hidden p-0">
                  <div className="border-b border-zinc-100 px-5 py-5 lg:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-zinc-950">
                            Plano de la sala
                          </h2>

                          {editandoPlano && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                              Edición activa
                            </span>
                          )}
                        </div>

                        <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">
                          {formatear(anchoSala)} × {formatear(largoSala)} m · las camas representan su posición compacta. El pasillo de trabajo se abre desplazándolas sobre rieles.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!editandoPlano) {
                              setEditandoPlano(true)
                            }
                            generarDistribucionSugerida()
                          }}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                        >
                          ✦ Generar plano sugerido
                        </button>

                        {!editandoPlano ? (
                          <button
                            type="button"
                            onClick={comenzarEditarPlano}
                            className="shrink-0 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                          >
                            Editar manualmente
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={cancelarEdicionPlano}
                              disabled={guardandoPlano}
                              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50"
                            >
                              Cancelar
                            </button>

                            <button
                              type="button"
                              onClick={guardarPlano}
                              disabled={guardandoPlano || tieneSuperposiciones}
                              className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {guardandoPlano ? 'Guardando...' : 'Guardar plano'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid border-b border-zinc-100 bg-zinc-50/70 sm:grid-cols-3">
                    <ConceptoPlano
                      numero="01"
                      titulo="Compactar"
                      texto="Aprovechar el espacio sin dejar pasillos fijos entre todas las camas."
                    />
                    <ConceptoPlano
                      numero="02"
                      titulo="Abrir para trabajar"
                      texto="Las camas se desplazan lateralmente para crear un pasillo operativo."
                    />
                    <ConceptoPlano
                      numero="03"
                      titulo="Mantener acceso"
                      texto="La propuesta evita bloquear la entrada y los obstáculos físicos."
                    />
                  </div>

                  {editandoPlano && (
                    <div className="border-b border-zinc-100 bg-white px-5 py-3 lg:px-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                          <AyudaPlano icono="↔" texto="Arrastrá para mover" />
                          <AyudaPlano icono="↻" texto="Girás desde la cama o el panel" />
                          <AyudaPlano icono="5 cm" texto="Ajuste fino" />
                        </div>

                        {pendienteColocacion && (
                          <button
                            type="button"
                            onClick={cancelarColocacion}
                            className="text-xs font-semibold text-zinc-500 hover:text-zinc-900"
                          >
                            Cancelar colocación
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {!sugerenciaPlano && (
                    <div className="mx-5 mt-5 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between lg:mx-6">
                      <div>
                        <p className="text-sm font-semibold text-emerald-950">
                          Partí de una distribución sugerida
                        </p>
                        <p className="mt-1 max-w-2xl text-xs leading-5 text-emerald-800">
                          El sistema intenta ubicar todas las camas aprovechando el espacio y dejando capacidad para abrir un pasillo de trabajo. Después podés mover y girar todo manualmente.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!editandoPlano) {
                            setEditandoPlano(true)
                          }
                          generarDistribucionSugerida()
                        }}
                        className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                      >
                        ✦ Generar sugerido
                      </button>
                    </div>
                  )}

                  {sugerenciaPlano && (
                    <div className="mx-5 mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 lg:mx-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-700 text-xs font-bold text-white">
                              ✓
                            </span>
                            <p className="text-sm font-semibold text-emerald-950">
                              Distribución sugerida aplicada como borrador
                            </p>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-emerald-800">
                            Revisala, mové o girá cualquier cama y guardá solamente cuando represente la sala real.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <BadgePlano
                            texto={`${sugerenciaPlano.camasUbicadas}/${totalCamas} camas`}
                            ok={sugerenciaPlano.camasUbicadas === totalCamas}
                          />
                          <BadgePlano
                            texto={`Movimiento ${sugerenciaPlano.ejeMovimiento}`}
                            ok
                          />
                          <BadgePlano
                            texto={`${formatear(sugerenciaPlano.aperturaEstimada)} m de apertura`}
                            ok={sugerenciaPlano.aperturaEstimada >= sugerenciaPlano.pasilloObjetivo}
                          />
                          <BadgePlano
                            texto={sugerenciaPlano.puertaConsiderada ? 'Entrada considerada' : 'Sin puerta cargada'}
                            ok={sugerenciaPlano.puertaConsiderada}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {editandoPlano && pendienteColocacion && (
                    <div className="mx-5 mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 lg:mx-6">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-sm font-bold text-amber-700">
                        +
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-amber-950">
                          Elegí la ubicación en el plano
                        </p>
                        <p className="mt-0.5 text-xs leading-5 text-amber-800">
                          Hacé clic donde querés colocar{' '}
                          <strong>
                            {pendienteColocacion.tipo === 'cama'
                              ? camas.find(
                                  (item) => item.cama_id === pendienteColocacion.id
                                )?.nombre
                              : pendienteColocacion.elemento.nombre}
                          </strong>
                          .
                        </p>
                      </div>
                    </div>
                  )}

                  {tieneSuperposiciones && (
                    <div className="mx-5 mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:mx-6">
                      <strong>
                        {superposiciones.length} superposición
                        {superposiciones.length === 1 ? '' : 'es'} detectada
                        {superposiciones.length === 1 ? '' : 's'}.
                      </strong>{' '}
                      Separá los elementos antes de guardar.
                    </div>
                  )}

                  <div className="p-5 lg:p-6">
                    <div className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-400">
                      <span>←</span>
                      <span>{formatear(anchoSala)} m</span>
                      <span>→</span>
                    </div>

                    <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-2">
                      <div
                        className="flex items-center justify-center text-xs font-semibold text-zinc-400"
                        style={{
                          writingMode: 'vertical-rl',
                          transform: 'rotate(180deg)',
                        }}
                      >
                        ← {formatear(largoSala)} m →
                      </div>

                      <div
                        ref={canvasRef}
                        onClick={clickPlano}
                        className={`relative w-full overflow-hidden rounded-2xl border-2 bg-white shadow-inner ${
                          editandoPlano
                            ? pendienteColocacion
                              ? 'cursor-crosshair border-amber-400'
                              : 'border-zinc-400'
                            : 'border-zinc-300'
                        }`}
                        style={{
                          aspectRatio: `${anchoSala} / ${largoSala}`,
                          backgroundImage:
                            'linear-gradient(to right, rgba(161,161,170,.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(161,161,170,.16) 1px, transparent 1px)',
                          backgroundSize: `${Math.max(
                            4,
                            (0.5 / anchoSala) * 100
                          )}% ${Math.max(4, (0.5 / largoSala) * 100)}%`,
                        }}
                      >
                        {sugerenciaPlano && (
                          <div
                            className="pointer-events-none absolute z-[5] flex items-center justify-center border border-dashed border-emerald-300 bg-emerald-50/40 text-[9px] font-bold uppercase tracking-[0.08em] text-emerald-700"
                            style={
                              sugerenciaPlano.ejeMovimiento === 'horizontal'
                                ? {
                                    top: 0,
                                    bottom: 0,
                                    left: '50%',
                                    width: `${Math.min(
                                      24,
                                      (sugerenciaPlano.pasilloObjetivo / anchoSala) * 100
                                    )}%`,
                                    transform: 'translateX(-50%)',
                                  }
                                : {
                                    left: 0,
                                    right: 0,
                                    top: '50%',
                                    height: `${Math.min(
                                      24,
                                      (sugerenciaPlano.pasilloObjetivo / largoSala) * 100
                                    )}%`,
                                    transform: 'translateY(-50%)',
                                  }
                            }
                          >
                            <span className="rounded bg-white/80 px-1.5 py-1">
                              pasillo móvil
                            </span>
                          </div>
                        )}

                        {camas.map((cama) => {
                          if (
                            cama.plano_x_m === null ||
                            cama.plano_y_m === null
                          ) {
                            return null
                          }

                          const dims = dimensionesCama(cama)
                          const seleccionado =
                            seleccion?.tipo === 'cama' &&
                            seleccion.id === cama.cama_id
                          const conflicto = rectanguloTieneConflicto(
                            `cama-${cama.cama_id}`,
                            superposiciones
                          )

                          return (
                            <div
                              key={cama.cama_id}
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSeleccion({ tipo: 'cama', id: cama.cama_id })
                              }}
                              onPointerDown={(e) => iniciarArrastreCama(e, cama)}
                              className={`absolute flex min-h-0 min-w-0 touch-none select-none flex-col items-center justify-center overflow-visible rounded-xl border-2 text-center transition ${
                                conflicto
                                  ? 'z-20 border-red-500 bg-red-50 text-red-900'
                                  : seleccionado
                                    ? 'z-20 border-emerald-700 bg-emerald-100 text-emerald-950 ring-2 ring-emerald-300'
                                    : 'z-10 border-emerald-500 bg-emerald-50 text-emerald-950 hover:border-emerald-700'
                              } ${editandoPlano ? 'cursor-move' : 'cursor-pointer'}`}
                              style={{
                                left: `${(numero(cama.plano_x_m) / anchoSala) * 100}%`,
                                top: `${(numero(cama.plano_y_m) / largoSala) * 100}%`,
                                width: `${(dims.ancho / anchoSala) * 100}%`,
                                height: `${(dims.largo / largoSala) * 100}%`,
                              }}
                            >
                              {editandoPlano && seleccionado && (
                                <button
                                  type="button"
                                  title="Girar cama 90°"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    rotarCama(cama.cama_id)
                                  }}
                                  className="absolute -right-2 -top-2 z-40 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 text-sm font-bold text-white shadow-md"
                                >
                                  ↻
                                </button>
                              )}

                              <span className="max-w-full truncate px-1 text-[11px] font-bold sm:text-xs">
                                {cama.nombre}
                              </span>

                              <span className="hidden max-w-full truncate px-1 text-[9px] opacity-70 sm:block">
                                {formatear(dims.ancho)} × {formatear(dims.largo)} m
                              </span>

                              {cama.plano_rotacion === 90 && (
                                <span className="mt-0.5 hidden rounded bg-white/70 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide sm:block">
                                  90°
                                </span>
                              )}
                            </div>
                          )
                        })}

                        {elementos.map((elemento) => {
                          const dims = dimensionesElemento(elemento)
                          const seleccionado =
                            seleccion?.tipo === 'elemento' &&
                            seleccion.key === elemento.key
                          const conflicto = rectanguloTieneConflicto(
                            elemento.key,
                            superposiciones
                          )

                          return (
                            <div
                              key={elemento.key}
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSeleccion({
                                  tipo: 'elemento',
                                  key: elemento.key,
                                })
                              }}
                              onPointerDown={(e) =>
                                iniciarArrastreElemento(e, elemento)
                              }
                              className={`absolute z-30 flex touch-none select-none items-center justify-center overflow-hidden rounded-lg border-2 px-1 text-center text-[9px] font-semibold transition ${claseElemento(
                                elemento.tipo
                              )} ${
                                seleccionado
                                  ? 'ring-2 ring-zinc-900 ring-offset-1'
                                  : ''
                              } ${
                                conflicto ? 'outline outline-2 outline-red-500' : ''
                              } ${editandoPlano ? 'cursor-move' : 'cursor-pointer'}`}
                              style={{
                                left: `${(elemento.plano_x_m / anchoSala) * 100}%`,
                                top: `${(elemento.plano_y_m / largoSala) * 100}%`,
                                width: `${(dims.ancho / anchoSala) * 100}%`,
                                height: `${(dims.largo / largoSala) * 100}%`,
                              }}
                            >
                              <span className="block max-w-full truncate">
                                {elemento.nombre}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-zinc-500">
                        <LeyendaPlano
                          clase="bg-emerald-100 border-emerald-500"
                          texto="Cama"
                        />
                        <LeyendaPlano
                          clase="bg-amber-200 border-amber-600"
                          texto="Puerta"
                        />
                        <LeyendaPlano
                          clase="bg-zinc-400 border-zinc-700"
                          texto="Columna"
                        />
                        <LeyendaPlano
                          clase="bg-red-100 border-red-500"
                          texto="Obstáculo"
                        />
                      </div>

                      <p className="text-[11px] text-zinc-400">
                        Cuadrícula 0,50 m · movimiento fino 0,05 m
                      </p>
                    </div>
                  </div>
                </Card>

                {/* PANEL DERECHO DEL PLANO */}

                <div className="space-y-5 xl:sticky xl:top-5 xl:self-start">
                  <Card>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                          Distribución
                        </p>
                        <p className="mt-1 text-lg font-semibold text-zinc-950">
                          {camasUbicadas}/{totalCamas} camas ubicadas
                        </p>
                      </div>

                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          planoCompleto
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        <IconoPlano />
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <DatoCompacto titulo="Elementos" valor={String(elementos.length)} />
                      <DatoCompacto
                        titulo="Conflictos"
                        valor={String(superposiciones.length)}
                        alerta={tieneSuperposiciones}
                      />
                    </div>

                    {sugerenciaPlano ? (
                      <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
                        <p className="text-xs font-semibold text-zinc-800">
                          Lectura de la sugerencia
                        </p>

                        <div className="mt-3 space-y-2.5">
                          <ResumenLinea
                            titulo="Movimiento"
                            valor={capitalizar(sugerenciaPlano.ejeMovimiento)}
                          />
                          <ResumenLinea
                            titulo="Apertura estimada"
                            valor={`${formatear(sugerenciaPlano.aperturaEstimada)} m`}
                          />
                          <ResumenLinea
                            titulo="Objetivo operativo"
                            valor={`${formatear(sugerenciaPlano.pasilloObjetivo)} m`}
                            alerta={
                              sugerenciaPlano.aperturaEstimada <
                              sugerenciaPlano.pasilloObjetivo
                            }
                          />
                          <ResumenLinea
                            titulo="Entrada"
                            valor={
                              sugerenciaPlano.puertaConsiderada
                                ? 'Considerada'
                                : 'Sin puerta cargada'
                            }
                            alerta={!sugerenciaPlano.puertaConsiderada}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 p-4">
                        <p className="text-xs font-semibold text-zinc-700">
                          Distribución sugerida
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                          En edición, el sistema puede ordenar automáticamente las camas buscando compactación, acceso desde la puerta y espacio para abrir un pasillo de trabajo.
                        </p>
                      </div>
                    )}
                  </Card>

                  {editandoPlano && (
                    <Card>
                      <CardHeader
                        titulo="Camas"
                        descripcion="Girá antes de ubicar o corregí cada cama sobre el plano."
                      />

                      <div className="max-h-[430px] space-y-2.5 overflow-y-auto pr-1">
                        {camas.map((cama) => {
                          const ubicada =
                            cama.plano_x_m !== null && cama.plano_y_m !== null
                          const dims = dimensionesCama(cama)
                          const pendiente =
                            pendienteColocacion?.tipo === 'cama' &&
                            pendienteColocacion.id === cama.cama_id
                          const seleccionada =
                            seleccion?.tipo === 'cama' &&
                            seleccion.id === cama.cama_id

                          return (
                            <div
                              key={cama.cama_id}
                              className={`rounded-2xl border p-3 transition ${
                                pendiente
                                  ? 'border-amber-300 bg-amber-50'
                                  : seleccionada
                                    ? 'border-emerald-200 bg-emerald-50/40'
                                    : 'border-zinc-200 bg-white'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-zinc-900">
                                    {cama.nombre}
                                  </p>
                                  <p className="mt-1 text-[11px] text-zinc-500">
                                    {formatear(dims.ancho)} × {formatear(dims.largo)} m · {cama.plano_rotacion}°
                                  </p>
                                </div>

                                <span
                                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                                    ubicada
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-zinc-100 text-zinc-500'
                                  }`}
                                >
                                  {ubicada ? 'Ubicada' : 'Pendiente'}
                                </span>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => rotarCama(cama.cama_id)}
                                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                                >
                                  ↻ Girar 90°
                                </button>

                                {!ubicada ? (
                                  <button
                                    type="button"
                                    onClick={() => prepararCama(cama.cama_id)}
                                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                                      pendiente
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-zinc-950 text-white'
                                    }`}
                                  >
                                    {pendiente ? 'Elegí lugar…' : 'Ubicar'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSeleccion({
                                        tipo: 'cama',
                                        id: cama.cama_id,
                                      })
                                    }
                                    className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200"
                                  >
                                    Seleccionar
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  )}

                  {editandoPlano && seleccionActual && (
                    <Card>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                            Seleccionado
                          </p>
                          <h3 className="mt-1 text-base font-semibold text-zinc-950">
                            {seleccionActual.nombre}
                          </h3>
                          <p className="mt-1 text-xs text-zinc-500">
                            {seleccionActual.tipo} · {seleccionActual.rotacion}°
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={rotarSeleccionado}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-lg font-bold text-white"
                          title="Girar 90°"
                        >
                          ↻
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <DatoCompacto
                          titulo="X"
                          valor={
                            seleccionActual.x === null
                              ? '—'
                              : `${formatear(seleccionActual.x)} m`
                          }
                        />
                        <DatoCompacto
                          titulo="Y"
                          valor={
                            seleccionActual.y === null
                              ? '—'
                              : `${formatear(seleccionActual.y)} m`
                          }
                        />
                      </div>

                      {seleccionActual.x !== null && seleccionActual.y !== null && (
                        <div className="mt-4 rounded-2xl bg-zinc-50 p-3">
                          <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                            Ajuste fino · 5 cm
                          </p>

                          <div className="mx-auto grid w-[132px] grid-cols-3 gap-1.5">
                            <span />
                            <BotonFlecha
                              texto="↑"
                              onClick={() => moverSeleccionado(0, -0.05)}
                            />
                            <span />
                            <BotonFlecha
                              texto="←"
                              onClick={() => moverSeleccionado(-0.05, 0)}
                            />
                            <BotonFlecha
                              texto="↓"
                              onClick={() => moverSeleccionado(0, 0.05)}
                            />
                            <BotonFlecha
                              texto="→"
                              onClick={() => moverSeleccionado(0.05, 0)}
                            />
                          </div>
                        </div>
                      )}

                      <div className="mt-4 grid gap-2">
                        {seleccion?.tipo === 'cama' ? (
                          <button
                            type="button"
                            onClick={sacarCamaDelPlano}
                            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-500 transition hover:bg-zinc-50"
                          >
                            Sacar cama del plano
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={eliminarElemento}
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600"
                          >
                            Eliminar elemento
                          </button>
                        )}
                      </div>
                    </Card>
                  )}

                  {editandoPlano && (
                    <Card>
                      <CardHeader
                        titulo="Elementos físicos"
                        descripcion="Puerta, columna u obstáculo que condiciona la distribución."
                      />

                      <div className="space-y-3">
                        <div>
                          <label className="etiqueta">Tipo</label>
                          <select
                            value={nuevoElemento.tipo}
                            onChange={(e) =>
                              cambiarTipoNuevoElemento(
                                e.target.value as NuevoElemento['tipo']
                              )
                            }
                            className="campo"
                          >
                            <option>Puerta</option>
                            <option>Columna</option>
                            <option>Obstáculo</option>
                            <option>Otro</option>
                          </select>
                        </div>

                        <div>
                          <label className="etiqueta">Nombre</label>
                          <input
                            value={nuevoElemento.nombre}
                            onChange={(e) =>
                              setNuevoElemento((actual) => ({
                                ...actual,
                                nombre: e.target.value,
                              }))
                            }
                            placeholder="Ej. Puerta principal"
                            className="campo"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <CampoMedidaPlano
                            titulo="Ancho"
                            valor={nuevoElemento.ancho_m}
                            onChange={(valor) =>
                              setNuevoElemento((actual) => ({
                                ...actual,
                                ancho_m: valor,
                              }))
                            }
                          />

                          <CampoMedidaPlano
                            titulo="Profundidad"
                            valor={nuevoElemento.largo_m}
                            onChange={(valor) =>
                              setNuevoElemento((actual) => ({
                                ...actual,
                                largo_m: valor,
                              }))
                            }
                          />
                        </div>

                        <button
                          type="button"
                          onClick={prepararElemento}
                          className="w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                        >
                          Colocar en plano
                        </button>
                      </div>
                    </Card>
                  )}

                  {!editandoPlano && (
                    <Card>
                      <CardHeader
                        titulo="Elementos físicos"
                        descripcion="Elementos que condicionan la distribución de camas."
                      />

                      {elementos.length === 0 ? (
                        <p className="text-sm text-zinc-400">
                          Todavía no hay puerta, columnas ni obstáculos agregados.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {elementos.map((elemento) => (
                            <div
                              key={elemento.key}
                              className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-zinc-800">
                                  {elemento.nombre}
                                </p>
                                <p className="text-[11px] text-zinc-400">
                                  {elemento.tipo}
                                </p>
                              </div>
                              <span className="text-xs font-semibold text-zinc-600">
                                {formatear(elemento.ancho_m)} ×{' '}
                                {formatear(elemento.largo_m)} m
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            SETUP
        ====================================================== */}

        {tab === 'setup' && (
          <div className="mt-5 space-y-5">
            <GestionSala
              sala={sala}
              onActualizada={cargarFicha}
            />

            {/* CABECERA DEL SETUP */}
            <Card className="overflow-hidden p-0">
              <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                    Setup de sala
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">
                    Configuración física actual
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Espacio, camas y equipamiento que definen esta sala.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setTab('plano')}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Ver plano
                </button>
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-4">
                <SetupMetrica
                  icono={<IconoRegla />}
                  titulo="Espacio"
                  principal={`${formatear(superficieSala)} m²`}
                  detalle={`${formatear(anchoSala)} × ${formatear(largoSala)} × ${formatear(altoSala)} m`}
                  pie={`${formatear(volumenSala)} m³ de volumen`}
                />

                <SetupMetrica
                  icono={<IconoCama />}
                  titulo="Área productiva"
                  principal={`${formatear(superficieProductiva)} m²`}
                  detalle={`${totalCamas} camas instaladas`}
                  pie={`${formatear(porcentajeProductivo)}% de la superficie`}
                />

                <SetupMetrica
                  icono={<IconoPlanta />}
                  titulo="Capacidad"
                  principal={`${capacidadMaxima} plantas`}
                  detalle={`${formatear(espacioLibre)} m² fuera de camas`}
                  pie="Capacidad física del setup"
                />

                <SetupMetrica
                  icono={<IconoRayo />}
                  titulo="Electricidad"
                  principal={`${formatear(consumoDia)} kWh/d`}
                  detalle={`${cantidadEquipos} unidades · ${categoriasEquipamiento} categorías`}
                  pie={`${formatear(consumoMes)} kWh/mes teóricos`}
                />
              </div>
            </Card>

            {/* CAMAS */}
            <Card className="overflow-hidden p-0">
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <IconoCama />
                  </div>

                  <div>
                    <h2 className="text-sm font-semibold text-zinc-950">
                      Camas instaladas
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {totalCamas} camas · {formatear(superficieProductiva)} m² productivos · {capacidadMaxima} plantas
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={comenzarEditarPlano}
                  className="self-start rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 sm:self-auto"
                >
                  Editar distribución →
                </button>
              </div>

              {camas.length === 0 ? (
                <div className="border-t border-zinc-100 px-5 py-8">
                  <EstadoVacio
                    titulo="Sin camas instaladas"
                    texto="Esta sala todavía no tiene camas configuradas."
                  />
                </div>
              ) : (
                <div className="grid gap-px border-t border-zinc-200 bg-zinc-200 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {camas.map((cama) => {
                    const dims = dimensionesCama(cama)
                    const ubicada =
                      cama.plano_x_m !== null && cama.plano_y_m !== null

                    return (
                      <div
                        key={cama.cama_id}
                        className="min-w-0 bg-white px-4 py-3.5 transition hover:bg-zinc-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-emerald-700 ring-1 ring-zinc-200">
                              <IconoCama />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-zinc-900">
                                {cama.nombre}
                              </p>
                              <p className="mt-0.5 whitespace-nowrap text-[11px] text-zinc-500">
                                {formatear(dims.ancho)} × {formatear(dims.largo)} m
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${
                              ubicada
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {ubicada ? 'Ubicada' : 'Pendiente'}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-zinc-100 pt-2.5 text-[11px]">
                          <span className="font-semibold text-zinc-800">
                            {formatear(numero(cama.superficie_m2))} m²
                          </span>
                          <span className="text-zinc-300">•</span>
                          <span className="font-semibold text-zinc-800">
                            {cama.capacidad_plantas} plantas
                          </span>

                          {ubicada && cama.plano_rotacion === 90 && (
                            <>
                              <span className="text-zinc-300">•</span>
                              <span className="font-medium text-zinc-500">
                                Girada 90°
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* EQUIPAMIENTO */}
            <Card className="overflow-hidden p-0">
              <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-6">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                      <IconoHerramienta />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-zinc-950">
                        Equipamiento de sala
                      </h2>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Equipos instalados y consumo teórico actual.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={abrirAgregarEquipo}
                  disabled={equiposDisponibles.length === 0 || guardandoEquipo}
                  className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + Agregar equipo
                </button>
              </div>

              {/* RESUMEN EQUIPAMIENTO */}
              <div className="grid border-b border-zinc-100 bg-zinc-50/60 sm:grid-cols-4">
                <SetupDatoRapido
                  titulo="Unidades"
                  valor={String(cantidadEquipos)}
                  detalle="instaladas"
                />
                <SetupDatoRapido
                  titulo="Tipos"
                  valor={String(equipos.length)}
                  detalle="configurados"
                />
                <SetupDatoRapido
                  titulo="Consumo diario"
                  valor={`${formatear(consumoDia)} kWh`}
                  detalle="teórico"
                />
                <SetupDatoRapido
                  titulo="Consumo mensual"
                  valor={`${formatear(consumoMes)} kWh`}
                  detalle="30 días"
                />
              </div>

              {/* AGREGAR EQUIPO */}
              {agregandoEquipo && (
                <div className="border-b border-zinc-100 bg-emerald-50/40 px-5 py-5 lg:px-6">
                  <div className="mx-auto max-w-5xl rounded-2xl border border-emerald-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          Agregar equipamiento
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Elegí un elemento del catálogo de Sala y completá solo lo necesario.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={cancelarAgregarEquipo}
                        className="text-xs font-semibold text-zinc-400 transition hover:text-zinc-700"
                      >
                        Cancelar
                      </button>
                    </div>

                    {equiposDisponibles.length === 0 ? (
                      <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                        Ya están agregados todos los equipos disponibles del catálogo.
                      </p>
                    ) : (
                      <>
                        <div className="mt-4 grid gap-3 lg:grid-cols-[1.25fr_.45fr_.7fr_.7fr]">
                          <div>
                            <label className="etiqueta">Equipo</label>
                            <select
                              value={nuevoEquipoCatalogoId}
                              onChange={(e) => {
                                setNuevoEquipoCatalogoId(e.target.value)
                                setNuevoEquipoEditor({
                                  cantidad: '1',
                                  potencia_w: '',
                                  horas_uso_dia: '',
                                  observaciones: '',
                                })
                              }}
                              className="campo"
                            >
                              {equiposDisponibles.map((equipo) => (
                                <option key={equipo.id} value={equipo.id}>
                                  {equipo.categoria} · {equipo.nombre}
                                </option>
                              ))}
                            </select>
                          </div>

                          <CampoEquipoSetup
                            titulo="Cantidad"
                            valor={nuevoEquipoEditor.cantidad}
                            step="1"
                            onChange={(valor) =>
                              actualizarNuevoEquipo('cantidad', valor)
                            }
                          />

                          {catalogoPorId.get(Number(nuevoEquipoCatalogoId))
                            ?.calcula_consumo ? (
                            <>
                              <CampoEquipoSetup
                                titulo="Potencia c/u"
                                valor={nuevoEquipoEditor.potencia_w}
                                unidad="W"
                                step="1"
                                onChange={(valor) =>
                                  actualizarNuevoEquipo('potencia_w', valor)
                                }
                              />

                              <CampoEquipoSetup
                                titulo="Uso diario"
                                valor={nuevoEquipoEditor.horas_uso_dia}
                                unidad="h"
                                step="0.1"
                                onChange={(valor) =>
                                  actualizarNuevoEquipo('horas_uso_dia', valor)
                                }
                              />
                            </>
                          ) : (
                            <div className="lg:col-span-2 flex items-end">
                              <div className="w-full rounded-xl bg-zinc-50 px-3 py-3 text-xs text-zinc-500">
                                Este elemento no participa del cálculo eléctrico.
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                          <div>
                            <label className="etiqueta">Observaciones</label>
                            <input
                              value={nuevoEquipoEditor.observaciones}
                              onChange={(e) =>
                                actualizarNuevoEquipo(
                                  'observaciones',
                                  e.target.value
                                )
                              }
                              placeholder="Opcional"
                              className="campo"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={agregarEquipoSala}
                            disabled={guardandoEquipo || !nuevoEquipoCatalogoId}
                            className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-40"
                          >
                            {guardandoEquipo ? 'Guardando...' : 'Agregar a la sala'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* LISTADO POR CATEGORÍA */}
              {equipos.length === 0 ? (
                <div className="p-5 lg:p-6">
                  <EstadoVacio
                    titulo="Sin equipamiento cargado"
                    texto="Agregá los elementos instalados dentro de esta sala para mantener el setup actualizado."
                  />
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {equiposPorCategoria.map(([categoria, lista]) => {
                    const totalCategoria = lista.reduce(
                      (total, item) => total + Number(item.cantidad ?? 0),
                      0
                    )

                    const consumoCategoria = lista.reduce(
                      (total, item) =>
                        total + numero(item.consumo_estimado_kwh_dia),
                      0
                    )

                    return (
                      <section key={categoria} className="px-5 py-5 lg:px-6">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">
                              {categoria}
                            </p>
                            <p className="mt-0.5 text-[11px] text-zinc-500">
                              {lista.length} {lista.length === 1 ? 'tipo' : 'tipos'} · {totalCategoria}{' '}
                              {totalCategoria === 1 ? 'unidad' : 'unidades'}
                            </p>
                          </div>

                          {consumoCategoria > 0 && (
                            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold text-zinc-600">
                              {formatear(consumoCategoria)} kWh/d
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          {lista.map((equipo) => {
                            const catalogo = catalogoPorId.get(
                              equipo.catalogo_equipo_id
                            )
                            const calculaConsumo =
                              catalogo?.calcula_consumo ??
                              (equipo.potencia_w !== null ||
                                equipo.horas_uso_dia !== null)
                            const editando = equipoEditandoId === equipo.id
                            const confirmandoQuitar =
                              confirmarQuitarId === equipo.id

                            return (
                              <div
                                key={equipo.id}
                                className={`overflow-hidden rounded-2xl border transition ${
                                  editando
                                    ? 'border-emerald-300 bg-emerald-50/30'
                                    : 'border-zinc-200 bg-white'
                                }`}
                              >
                                <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                                      <IconoHerramienta />
                                    </div>

                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-zinc-900">
                                        {equipo.equipo}
                                      </p>
                                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                                        <span>
                                          {equipo.cantidad}{' '}
                                          {equipo.cantidad === 1 ? 'unidad' : 'unidades'}
                                        </span>

                                        {calculaConsumo && equipo.potencia_w && (
                                          <span>
                                            {formatear(numero(equipo.potencia_w))} W c/u
                                          </span>
                                        )}

                                        {calculaConsumo && equipo.horas_uso_dia && (
                                          <span>
                                            {formatear(numero(equipo.horas_uso_dia))} h/día
                                          </span>
                                        )}

                                        {!calculaConsumo && (
                                          <span>Sin cálculo eléctrico</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-zinc-900">
                                        {calculaConsumo &&
                                        equipo.consumo_estimado_kwh_dia
                                          ? `${formatear(
                                              numero(
                                                equipo.consumo_estimado_kwh_dia
                                              )
                                            )} kWh/d`
                                          : '—'}
                                      </p>
                                      {calculaConsumo && (
                                        <p className="text-[10px] text-zinc-400">
                                          consumo teórico
                                        </p>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        editando
                                          ? cancelarEdicionEquipo()
                                          : editarEquipo(equipo)
                                      }
                                      disabled={guardandoEquipo}
                                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                        editando
                                          ? 'bg-zinc-100 text-zinc-600'
                                          : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                                      }`}
                                    >
                                      {editando ? 'Cerrar' : 'Editar'}
                                    </button>
                                  </div>
                                </div>

                                {editando && editorEquipo && (
                                  <div className="border-t border-emerald-100 bg-white px-4 py-4">
                                    <div
                                      className={`grid gap-3 ${
                                        calculaConsumo
                                          ? 'sm:grid-cols-3'
                                          : 'sm:grid-cols-[220px_1fr]'
                                      }`}
                                    >
                                      <CampoEquipoSetup
                                        titulo="Cantidad"
                                        valor={editorEquipo.cantidad}
                                        step="1"
                                        onChange={(valor) =>
                                          actualizarEditorEquipo('cantidad', valor)
                                        }
                                      />

                                      {calculaConsumo && (
                                        <>
                                          <CampoEquipoSetup
                                            titulo="Potencia eléctrica c/u"
                                            valor={editorEquipo.potencia_w}
                                            unidad="W"
                                            step="1"
                                            onChange={(valor) =>
                                              actualizarEditorEquipo(
                                                'potencia_w',
                                                valor
                                              )
                                            }
                                          />

                                          <CampoEquipoSetup
                                            titulo="Uso diario"
                                            valor={editorEquipo.horas_uso_dia}
                                            unidad="h"
                                            step="0.1"
                                            onChange={(valor) =>
                                              actualizarEditorEquipo(
                                                'horas_uso_dia',
                                                valor
                                              )
                                            }
                                          />
                                        </>
                                      )}
                                    </div>

                                    <div className="mt-3">
                                      <label className="etiqueta">Observaciones</label>
                                      <input
                                        value={editorEquipo.observaciones}
                                        onChange={(e) =>
                                          actualizarEditorEquipo(
                                            'observaciones',
                                            e.target.value
                                          )
                                        }
                                        placeholder="Observaciones opcionales"
                                        className="campo"
                                      />
                                    </div>

                                    {calculaConsumo && (
                                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2.5">
                                        <span className="text-xs text-zinc-500">
                                          Consumo con esta configuración
                                        </span>
                                        <span className="text-sm font-semibold text-zinc-900">
                                          {formatear(
                                            calcularConsumoEditor(
                                              editorEquipo,
                                              calculaConsumo
                                            )
                                          )}{' '}
                                          kWh/día
                                        </span>
                                      </div>
                                    )}

                                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                      <div>
                                        {!confirmandoQuitar ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setConfirmarQuitarId(equipo.id)
                                            }
                                            disabled={guardandoEquipo}
                                            className="text-xs font-semibold text-zinc-400 transition hover:text-red-600"
                                          >
                                            Quitar de la sala
                                          </button>
                                        ) : (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-red-600">
                                              ¿Quitar este equipo?
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => quitarEquipo(equipo)}
                                              disabled={guardandoEquipo}
                                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                                            >
                                              Sí, quitar
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setConfirmarQuitarId(null)}
                                              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600"
                                            >
                                              No
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={cancelarEdicionEquipo}
                                          disabled={guardandoEquipo}
                                          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => guardarEdicionEquipo(equipo)}
                                          disabled={guardandoEquipo}
                                          className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-40"
                                        >
                                          {guardandoEquipo
                                            ? 'Guardando...'
                                            : 'Guardar cambios'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </section>
                    )
                  })}
                </div>
              )}
            </Card>

            {sala.observaciones && (
              <Card>
                <CardHeader titulo="Observaciones de la sala" />
                <p className="text-sm leading-6 text-zinc-600">
                  {sala.observaciones}
                </p>
              </Card>
            )}
          </div>
        )}

        {/* =====================================================
            CULTIVO ACTUAL
        ====================================================== */}

        {tab === 'cultivo' && (
          <div className="mt-5">
            <CultivoActual
              salaId={salaId}
              camas={camas}
              capacidadMaxima={capacidadMaxima}
            />
          </div>
        )}

        {/* =====================================================
            RIEGO
        ====================================================== */}

        {tab === 'riego' && (
          <div className="mt-5">
            <Riego
              salaId={salaId}
              salaNombre={sala.nombre}
            />
          </div>
        )}

        {/* =====================================================
            PRODUCCIÓN
        ====================================================== */}

        {tab === 'produccion' && (
          <div className="mt-5">
            <Produccion
              salaId={salaId}
              salaNombre={sala.nombre}
            />
          </div>
        )}

        {/* =====================================================
            HISTORIAL
        ====================================================== */}

        {tab === 'historial' && (
          <div className="mt-5">
            <HistorialSala
              salaId={salaId}
              salaNombre={sala.nombre}
            />
          </div>
        )}
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

/* =========================================================
   MINI PLANO
========================================================= */

function MiniPlano({
  camas,
  elementos,
  anchoSala,
  largoSala,
}: {
  camas: CamaPlano[]
  elementos: ElementoPlano[]
  anchoSala: number
  largoSala: number
}) {
  if (anchoSala <= 0 || largoSala <= 0) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-400">
        Sin dimensiones para mostrar el plano
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 text-center text-[11px] font-semibold text-zinc-400">
        {formatear(anchoSala)} m
      </div>

      <div className="grid grid-cols-[26px_minmax(0,1fr)] gap-2">
        <div
          className="flex items-center justify-center text-[11px] font-semibold text-zinc-400"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          {formatear(largoSala)} m
        </div>

        <div
          className="relative w-full overflow-hidden rounded-2xl border-2 border-zinc-300 bg-white"
          style={{
            aspectRatio: `${anchoSala} / ${largoSala}`,
            backgroundImage:
              'linear-gradient(to right, rgba(161,161,170,.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(161,161,170,.12) 1px, transparent 1px)',
            backgroundSize: `${Math.max(5, (0.5 / anchoSala) * 100)}% ${Math.max(
              5,
              (0.5 / largoSala) * 100
            )}%`,
          }}
        >
          {camas.map((cama) => {
            if (cama.plano_x_m === null || cama.plano_y_m === null) return null

            const anchoBase = numero(cama.ancho_base_m)
            const largoBase = numero(cama.largo_base_m)
            const ancho = cama.plano_rotacion === 90 ? largoBase : anchoBase
            const largo = cama.plano_rotacion === 90 ? anchoBase : largoBase

            return (
              <div
                key={cama.cama_id}
                className="absolute flex items-center justify-center overflow-hidden rounded-lg border border-emerald-500 bg-emerald-50 px-1 text-center text-[9px] font-bold text-emerald-800"
                style={{
                  left: `${(numero(cama.plano_x_m) / anchoSala) * 100}%`,
                  top: `${(numero(cama.plano_y_m) / largoSala) * 100}%`,
                  width: `${(ancho / anchoSala) * 100}%`,
                  height: `${(largo / largoSala) * 100}%`,
                }}
              >
                {cama.nombre}
              </div>
            )
          })}

          {elementos.map((elemento) => {
            const ancho =
              elemento.rotacion === 90 ? elemento.largo_m : elemento.ancho_m
            const largo =
              elemento.rotacion === 90 ? elemento.ancho_m : elemento.largo_m

            return (
              <div
                key={elemento.key}
                className={`absolute overflow-hidden rounded-sm border ${claseElemento(
                  elemento.tipo
                )}`}
                style={{
                  left: `${(elemento.plano_x_m / anchoSala) * 100}%`,
                  top: `${(elemento.plano_y_m / largoSala) * 100}%`,
                  width: `${(ancho / anchoSala) * 100}%`,
                  height: `${(largo / largoSala) * 100}%`,
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   COMPONENTES VISUALES
========================================================= */

function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </section>
  )
}

function CardHeader({
  titulo,
  descripcion,
  accion,
  className = '',
}: {
  titulo: string
  descripcion?: string
  accion?: ReactNode
  className?: string
}) {
  return (
    <div className={`mb-5 flex items-start justify-between gap-4 ${className}`}>
      <div>
        <h2 className="text-sm font-semibold text-zinc-950">{titulo}</h2>
        {descripcion && (
          <p className="mt-1 text-xs leading-5 text-zinc-500">{descripcion}</p>
        )}
      </div>
      {accion}
    </div>
  )
}

function TabButton({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-4 py-3.5 text-sm font-medium transition ${
        activo ? 'text-emerald-700' : 'text-zinc-500 hover:text-zinc-950'
      }`}
    >
      {children}
      {activo && (
        <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-600" />
      )}
    </button>
  )
}

function HeaderKpi({
  icono,
  titulo,
  valor,
  detalle,
  destacado = false,
}: {
  icono: ReactNode
  titulo: string
  valor: string
  detalle?: string
  destacado?: boolean
}) {
  return (
    <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0 sm:border-r xl:border-b-0 lg:px-5">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          destacado
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-zinc-100 text-zinc-500'
        }`}
      >
        {icono}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
          {titulo}
        </p>
        <p
          className={`mt-0.5 truncate text-base font-semibold ${
            destacado ? 'text-emerald-700' : 'text-zinc-950'
          }`}
        >
          {valor}
        </p>
        {detalle && <p className="text-[10px] text-zinc-400">{detalle}</p>}
      </div>
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
      <span className="text-xs text-zinc-500">{titulo}</span>
      <span
        className={`text-sm font-semibold ${
          alerta ? 'text-red-600' : 'text-zinc-800'
        }`}
      >
        {valor}
      </span>
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const activo = estado === 'Activa'

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
        activo
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-zinc-100 text-zinc-600'
      }`}
    >
      {estado}
    </span>
  )
}

function EstadoPlanoResumen({
  completo,
  totalCamas,
  camasUbicadas,
}: {
  completo: boolean
  totalCamas: number
  camasUbicadas: number
}) {
  return (
    <div
      className={`mt-5 rounded-2xl px-4 py-3 ${
        completo ? 'bg-emerald-50' : 'bg-amber-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
            completo
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {completo ? '✓' : '!'}
        </div>

        <div>
          <p
            className={`text-xs font-semibold ${
              completo ? 'text-emerald-800' : 'text-amber-800'
            }`}
          >
            {completo ? 'Plano completo' : 'Plano pendiente'}
          </p>
          <p
            className={`mt-1 text-[11px] leading-4 ${
              completo ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {completo
              ? 'Todas las camas tienen una ubicación definida.'
              : `${camasUbicadas} de ${totalCamas} camas tienen ubicación definida.`}
          </p>
        </div>
      </div>
    </div>
  )
}

function ChecklistItem({
  completo,
  titulo,
  texto,
}: {
  completo: boolean
  titulo: string
  texto: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/60 px-3 py-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
          completo
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-zinc-200 text-zinc-500'
        }`}
      >
        {completo ? '✓' : '·'}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-800">{titulo}</p>
        <p className="mt-0.5 truncate text-[11px] text-zinc-500">{texto}</p>
      </div>
    </div>
  )
}

function ResumenBloque({
  icono,
  titulo,
  valor,
  texto,
}: {
  icono: ReactNode
  titulo: string
  valor: string
  texto: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
          {icono}
        </div>

        <div>
          <p className="text-xs font-semibold text-zinc-500">{titulo}</p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight text-zinc-950">
            {valor}
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">{texto}</p>
        </div>
      </div>
    </Card>
  )
}

function SetupMetrica({
  icono,
  titulo,
  principal,
  detalle,
  pie,
}: {
  icono: ReactNode
  titulo: string
  principal: string
  detalle: string
  pie: string
}) {
  return (
    <div className="border-b border-zinc-100 p-5 last:border-b-0 lg:border-b-0 lg:border-r lg:p-6 lg:last:border-r-0">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600">
        {icono}
      </div>

      <p className="mt-4 text-xs font-semibold text-zinc-500">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
        {principal}
      </p>
      <p className="mt-2 text-sm text-zinc-600">{detalle}</p>
      <p className="mt-1 text-xs text-zinc-400">{pie}</p>
    </div>
  )
}

function SetupDatoRapido({
  titulo,
  valor,
  detalle,
}: {
  titulo: string
  valor: string
  detalle: string
}) {
  return (
    <div className="border-b border-zinc-100 px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
        {titulo}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-zinc-950">
        {valor}
      </p>
      <p className="mt-0.5 text-[10px] text-zinc-400">{detalle}</p>
    </div>
  )
}

function CampoEquipoSetup({
  titulo,
  valor,
  unidad,
  step,
  onChange,
}: {
  titulo: string
  valor: string
  unidad?: string
  step: string
  onChange: (valor: string) => void
}) {
  return (
    <div>
      <label className="etiqueta">{titulo}</label>
      <div className="relative">
        <input
          type="number"
          min="0"
          step={step}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className={unidad ? 'campo pr-10' : 'campo'}
        />
        {unidad && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">
            {unidad}
          </span>
        )}
      </div>
    </div>
  )
}

function InfoCompacta({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-zinc-400">
        {titulo}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-zinc-800">
        {valor}
      </p>
    </div>
  )
}

function BotonMovimiento({
  simbolo,
  onClick,
}: {
  simbolo: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white text-base font-bold text-zinc-700 transition hover:bg-zinc-50"
    >
      {simbolo}
    </button>
  )
}

function AyudaPlano({ icono, texto }: { icono: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-bold text-zinc-700">{icono}</span>
      {texto}
    </span>
  )
}

function LeyendaPlano({ clase, texto }: { clase: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-3 w-3 rounded-sm border ${clase}`} />
      {texto}
    </span>
  )
}

function DatoCompacto({
  titulo,
  valor,
  alerta = false,
}: {
  titulo: string
  valor: string
  alerta?: boolean
}) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ${
      alerta ? 'bg-red-50' : 'bg-zinc-50'
    }`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-zinc-400">
        {titulo}
      </p>
      <p className={`mt-1 text-sm font-semibold ${
        alerta ? 'text-red-700' : 'text-zinc-900'
      }`}>
        {valor}
      </p>
    </div>
  )
}

function BotonFlecha({
  texto,
  onClick,
}: {
  texto: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-sm font-bold text-zinc-700 transition hover:bg-zinc-100"
    >
      {texto}
    </button>
  )
}

function ConceptoPlano({
  numero,
  titulo,
  texto,
}: {
  numero: string
  titulo: string
  texto: string
}) {
  return (
    <div className="border-b border-zinc-100 px-5 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-[10px] font-bold text-emerald-700">
          {numero}
        </span>
        <div>
          <p className="text-xs font-semibold text-zinc-800">{titulo}</p>
          <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">{texto}</p>
        </div>
      </div>
    </div>
  )
}

function BadgePlano({ texto, ok }: { texto: string; ok: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
        ok
          ? 'bg-white text-emerald-800 ring-1 ring-emerald-200'
          : 'bg-amber-100 text-amber-800'
      }`}
    >
      {texto}
    </span>
  )
}

function capitalizar(valor: string) {
  if (!valor) return valor
  return valor.charAt(0).toUpperCase() + valor.slice(1)
}

function CampoMedidaPlano({
  titulo,
  valor,
  onChange,
}: {
  titulo: string
  valor: string
  onChange: (valor: string) => void
}) {
  return (
    <div>
      <label className="etiqueta">{titulo}</label>
      <div className="relative">
        <input
          type="number"
          min="0"
          step="0.01"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="campo pr-8"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">
          m
        </span>
      </div>
    </div>
  )
}

function EstadoVacio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-5 py-9 text-center">
      <p className="text-sm font-semibold text-zinc-800">{titulo}</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-zinc-500">
        {texto}
      </p>
    </div>
  )
}

function ModuloPendiente({
  icono,
  titulo,
  descripcion,
  texto,
}: {
  icono: ReactNode
  titulo: string
  descripcion: string
  texto: string
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-0 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="border-b border-zinc-100 bg-zinc-50 p-6 lg:border-b-0 lg:border-r">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
            {icono}
          </div>
          <h2 className="mt-5 text-xl font-semibold text-zinc-950">{titulo}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{descripcion}</p>
        </div>

        <div className="flex items-center p-6 lg:p-8">
          <div className="w-full rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-8">
            <p className="text-sm font-semibold text-zinc-800">
              Próxima etapa del desarrollo
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              {texto}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

/* =========================================================
   UTILIDADES DEL PLANO
========================================================= */

function construirRectangulos(
  camas: CamaPlano[],
  elementos: ElementoPlano[]
): RectanguloPlano[] {
  const rects: RectanguloPlano[] = []

  camas.forEach((cama) => {
    if (cama.plano_x_m === null || cama.plano_y_m === null) return

    const anchoBase = numero(cama.ancho_base_m)
    const largoBase = numero(cama.largo_base_m)
    const ancho = cama.plano_rotacion === 90 ? largoBase : anchoBase
    const largo = cama.plano_rotacion === 90 ? anchoBase : largoBase

    rects.push({
      key: `cama-${cama.cama_id}`,
      nombre: cama.nombre,
      x: numero(cama.plano_x_m),
      y: numero(cama.plano_y_m),
      ancho,
      largo,
    })
  })

  elementos.forEach((elemento) => {
    const ancho =
      elemento.rotacion === 90 ? elemento.largo_m : elemento.ancho_m
    const largo =
      elemento.rotacion === 90 ? elemento.ancho_m : elemento.largo_m

    rects.push({
      key: elemento.key,
      nombre: elemento.nombre,
      x: elemento.plano_x_m,
      y: elemento.plano_y_m,
      ancho,
      largo,
    })
  })

  return rects
}

function detectarSuperposiciones(rectangulos: RectanguloPlano[]) {
  const conflictos: {
    keyA: string
    keyB: string
    a: string
    b: string
  }[] = []

  for (let i = 0; i < rectangulos.length; i++) {
    for (let j = i + 1; j < rectangulos.length; j++) {
      const a = rectangulos[i]
      const b = rectangulos[j]

      const seCruzan =
        a.x < b.x + b.ancho &&
        a.x + a.ancho > b.x &&
        a.y < b.y + b.largo &&
        a.y + a.largo > b.y

      if (seCruzan) {
        conflictos.push({
          keyA: a.key,
          keyB: b.key,
          a: a.nombre,
          b: b.nombre,
        })
      }
    }
  }

  return conflictos
}

function rectanguloTieneConflicto(
  key: string,
  conflictos: ReturnType<typeof detectarSuperposiciones>
) {
  return conflictos.some(
    (conflicto) => conflicto.keyA === key || conflicto.keyB === key
  )
}

function calcularDistribucionSugerida({
  camas,
  elementos,
  anchoSala,
  largoSala,
  pasilloObjetivo,
}: {
  camas: CamaPlano[]
  elementos: ElementoPlano[]
  anchoSala: number
  largoSala: number
  pasilloObjetivo: number
}):
  | {
      posiciones: PosicionSugerida[]
      ejeMovimiento: 'horizontal' | 'vertical'
      aperturaEstimada: number
      pasilloObjetivo: number
      puertaConsiderada: boolean
    }
  | null {
  const paso = 0.1
  const margen = 0.1
  const separacion = 0.05
  const puertaConsiderada = elementos.some((item) => item.tipo === 'Puerta')
  const bloqueos = construirBloqueosSugerencia(
    elementos,
    anchoSala,
    largoSala,
    pasilloObjetivo
  )

  const camasOrdenadas = [...camas].sort((a, b) => {
    const areaA = numero(a.ancho_base_m) * numero(a.largo_base_m)
    const areaB = numero(b.ancho_base_m) * numero(b.largo_base_m)
    return areaB - areaA || a.cama_id - b.cama_id
  })

  const candidatos: {
    posiciones: PosicionSugerida[]
    ejeMovimiento: 'horizontal' | 'vertical'
    aperturaEstimada: number
    puntaje: number
  }[] = []

  for (const preferenciaRotacion of [0, 90]) {
    for (const ejeEscaneo of ['horizontal', 'vertical'] as const) {
      for (const invertirX of [false, true]) {
        for (const invertirY of [false, true]) {
          const colocados: RectanguloPlano[] = []
          const posiciones: PosicionSugerida[] = []
          let valido = true

          for (const cama of camasOrdenadas) {
            const rotaciones = [preferenciaRotacion, preferenciaRotacion === 0 ? 90 : 0]
            let ubicada = false

            for (const rotacion of rotaciones) {
              const anchoBase = numero(cama.ancho_base_m)
              const largoBase = numero(cama.largo_base_m)
              const ancho = rotacion === 90 ? largoBase : anchoBase
              const largo = rotacion === 90 ? anchoBase : largoBase

              if (ancho <= 0 || largo <= 0 || ancho > anchoSala || largo > largoSala) {
                continue
              }

              const xs = crearSecuenciaPosiciones(
                margen,
                Math.max(margen, anchoSala - ancho - margen),
                paso,
                invertirX
              )
              const ys = crearSecuenciaPosiciones(
                margen,
                Math.max(margen, largoSala - largo - margen),
                paso,
                invertirY
              )

              const primario = ejeEscaneo === 'horizontal' ? ys : xs
              const secundario = ejeEscaneo === 'horizontal' ? xs : ys

              outer: for (const a of primario) {
                for (const b of secundario) {
                  const x = snap(ejeEscaneo === 'horizontal' ? b : a)
                  const y = snap(ejeEscaneo === 'horizontal' ? a : b)

                  const rect: RectanguloPlano = {
                    key: `cama-${cama.cama_id}`,
                    nombre: cama.nombre,
                    x,
                    y,
                    ancho,
                    largo,
                  }

                  if (
                    x < 0 ||
                    y < 0 ||
                    x + ancho > anchoSala + 0.001 ||
                    y + largo > largoSala + 0.001
                  ) {
                    continue
                  }

                  const chocaFijo = bloqueos.some((bloqueo) =>
                    rectangulosSeCruzan(rect, bloqueo, separacion)
                  )

                  if (chocaFijo) continue

                  const chocaCama = colocados.some((otro) =>
                    rectangulosSeCruzan(rect, otro, separacion)
                  )

                  if (chocaCama) continue

                  colocados.push(rect)
                  posiciones.push({
                    cama_id: cama.cama_id,
                    x,
                    y,
                    rotacion,
                  })
                  ubicada = true
                  break outer
                }
              }

              if (ubicada) break
            }

            if (!ubicada) {
              valido = false
              break
            }
          }

          if (!valido || posiciones.length !== camas.length) continue

          const minX = Math.min(...colocados.map((r) => r.x))
          const maxX = Math.max(...colocados.map((r) => r.x + r.ancho))
          const minY = Math.min(...colocados.map((r) => r.y))
          const maxY = Math.max(...colocados.map((r) => r.y + r.largo))
          const bloqueAncho = maxX - minX
          const bloqueLargo = maxY - minY
          const holguraX = Math.max(0, anchoSala - bloqueAncho)
          const holguraY = Math.max(0, largoSala - bloqueLargo)
          const ejeMovimiento: 'horizontal' | 'vertical' =
            holguraX >= holguraY ? 'horizontal' : 'vertical'
          const aperturaEstimada = Math.max(holguraX, holguraY)
          const areaBloque = bloqueAncho * bloqueLargo
          const cumplePasillo = aperturaEstimada >= pasilloObjetivo

          const puntaje =
            (cumplePasillo ? 100000 : 0) +
            aperturaEstimada * 1000 -
            areaBloque * 10 -
            (puertaConsiderada ? 0 : 50)

          candidatos.push({
            posiciones,
            ejeMovimiento,
            aperturaEstimada,
            puntaje,
          })
        }
      }
    }
  }

  if (candidatos.length === 0) return null

  candidatos.sort((a, b) => b.puntaje - a.puntaje)
  const mejor = candidatos[0]

  return {
    posiciones: mejor.posiciones,
    ejeMovimiento: mejor.ejeMovimiento,
    aperturaEstimada: mejor.aperturaEstimada,
    pasilloObjetivo,
    puertaConsiderada,
  }
}

function construirBloqueosSugerencia(
  elementos: ElementoPlano[],
  anchoSala: number,
  largoSala: number,
  pasilloObjetivo: number
) {
  const bloqueos: RectanguloPlano[] = []

  elementos.forEach((elemento) => {
    const ancho = elemento.rotacion === 90 ? elemento.largo_m : elemento.ancho_m
    const largo = elemento.rotacion === 90 ? elemento.ancho_m : elemento.largo_m

    const base: RectanguloPlano = {
      key: elemento.key,
      nombre: elemento.nombre,
      x: elemento.plano_x_m,
      y: elemento.plano_y_m,
      ancho,
      largo,
    }

    if (elemento.tipo !== 'Puerta') {
      bloqueos.push(base)
      return
    }

    bloqueos.push(base)

    const distancias = [
      { pared: 'izquierda', valor: elemento.plano_x_m },
      { pared: 'derecha', valor: anchoSala - (elemento.plano_x_m + ancho) },
      { pared: 'arriba', valor: elemento.plano_y_m },
      { pared: 'abajo', valor: largoSala - (elemento.plano_y_m + largo) },
    ].sort((a, b) => a.valor - b.valor)

    const pared = distancias[0]?.pared
    const extra = 0.15

    if (pared === 'izquierda') {
      bloqueos.push({
        key: `${elemento.key}-acceso`,
        nombre: 'Acceso puerta',
        x: 0,
        y: Math.max(0, elemento.plano_y_m - extra),
        ancho: Math.min(anchoSala, pasilloObjetivo + ancho),
        largo: Math.min(largoSala, largo + extra * 2),
      })
      return
    }

    if (pared === 'derecha') {
      const anchoAcceso = Math.min(anchoSala, pasilloObjetivo + ancho)
      bloqueos.push({
        key: `${elemento.key}-acceso`,
        nombre: 'Acceso puerta',
        x: Math.max(0, anchoSala - anchoAcceso),
        y: Math.max(0, elemento.plano_y_m - extra),
        ancho: anchoAcceso,
        largo: Math.min(largoSala, largo + extra * 2),
      })
      return
    }

    if (pared === 'arriba') {
      bloqueos.push({
        key: `${elemento.key}-acceso`,
        nombre: 'Acceso puerta',
        x: Math.max(0, elemento.plano_x_m - extra),
        y: 0,
        ancho: Math.min(anchoSala, ancho + extra * 2),
        largo: Math.min(largoSala, pasilloObjetivo + largo),
      })
      return
    }

    const largoAcceso = Math.min(largoSala, pasilloObjetivo + largo)
    bloqueos.push({
      key: `${elemento.key}-acceso`,
      nombre: 'Acceso puerta',
      x: Math.max(0, elemento.plano_x_m - extra),
      y: Math.max(0, largoSala - largoAcceso),
      ancho: Math.min(anchoSala, ancho + extra * 2),
      largo: largoAcceso,
    })
  })

  return bloqueos
}

function crearSecuenciaPosiciones(
  minimo: number,
  maximo: number,
  paso: number,
  invertir: boolean
) {
  const valores: number[] = []
  const inicio = Math.max(0, minimo)
  const fin = Math.max(inicio, maximo)

  for (let valor = inicio; valor <= fin + 0.0001; valor += paso) {
    valores.push(snap(valor))
  }

  return invertir ? valores.reverse() : valores
}

function rectangulosSeCruzan(
  a: RectanguloPlano,
  b: RectanguloPlano,
  separacion = 0
) {
  return (
    a.x < b.x + b.ancho + separacion &&
    a.x + a.ancho + separacion > b.x &&
    a.y < b.y + b.largo + separacion &&
    a.y + a.largo + separacion > b.y
  )
}

function obtenerSeleccionActual(
  seleccion: Seleccion,
  camas: CamaPlano[],
  elementos: ElementoPlano[]
) {
  if (!seleccion) return null

  if (seleccion.tipo === 'cama') {
    const cama = camas.find((item) => item.cama_id === seleccion.id)
    if (!cama) return null

    return {
      tipo: 'Cama',
      nombre: cama.nombre,
      rotacion: cama.plano_rotacion,
      x: cama.plano_x_m === null ? null : numero(cama.plano_x_m),
      y: cama.plano_y_m === null ? null : numero(cama.plano_y_m),
    }
  }

  const elemento = elementos.find((item) => item.key === seleccion.key)
  if (!elemento) return null

  return {
    tipo: elemento.tipo,
    nombre: elemento.nombre,
    rotacion: elemento.rotacion,
    x: elemento.plano_x_m,
    y: elemento.plano_y_m,
  }
}

function crearPlantillaElemento(
  tipo: NuevoElemento['tipo']
): NuevoElemento {
  switch (tipo) {
    case 'Puerta':
      return {
        tipo,
        nombre: '',
        ancho_m: '0.90',
        largo_m: '0.10',
      }

    case 'Columna':
      return {
        tipo,
        nombre: '',
        ancho_m: '0.30',
        largo_m: '0.30',
      }

    case 'Obstáculo':
      return {
        tipo,
        nombre: '',
        ancho_m: '0.50',
        largo_m: '0.50',
      }

    default:
      return {
        tipo,
        nombre: '',
        ancho_m: '0.50',
        largo_m: '0.50',
      }
  }
}

function claseElemento(tipo: ElementoPlano['tipo']) {
  switch (tipo) {
    case 'Puerta':
      return 'border-amber-600 bg-amber-200 text-amber-950'

    case 'Columna':
      return 'border-zinc-700 bg-zinc-400 text-white'

    case 'Obstáculo':
      return 'border-red-500 bg-red-100 text-red-800'

    default:
      return 'border-violet-500 bg-violet-100 text-violet-800'
  }
}

function calcularConsumoEditor(
  editor: EquipoEditor,
  calculaConsumo: boolean
) {
  if (!calculaConsumo) return 0

  const cantidad = Number(editor.cantidad)
  const potencia = numero(editor.potencia_w)
  const horas = numero(editor.horas_uso_dia)

  if (
    !Number.isFinite(cantidad) ||
    cantidad <= 0 ||
    potencia <= 0 ||
    horas <= 0
  ) {
    return 0
  }

  return (cantidad * potencia * horas) / 1000
}

function numero(valor: number | string | null | undefined) {
  if (valor === null || valor === undefined || valor === '') return 0

  const resultado = Number(valor)
  return Number.isFinite(resultado) ? resultado : 0
}

function limitar(valor: number, minimo: number, maximo: number) {
  return Math.min(maximo, Math.max(minimo, valor))
}

function snap(valor: number) {
  return Math.round(valor / 0.05) * 0.05
}

function formatear(valor: number) {
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 2,
  }).format(valor)
}

/* =========================================================
   ICONOS
========================================================= */

function IconoRegla() {
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
      <path d="M4 17 17 4l3 3L7 20H4v-3Z" />
      <path d="m14 7 3 3" />
      <path d="m11 10 2 2" />
      <path d="m8 13 2 2" />
    </svg>
  )
}

function IconoCama() {
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
      <path d="M4 18v-7" />
      <path d="M20 18v-5" />
      <path d="M4 14h16" />
      <path d="M7 11h5a3 3 0 0 1 3 3H7v-3Z" />
      <path d="M4 18v2" />
      <path d="M20 18v2" />
    </svg>
  )
}

function IconoPlanta() {
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
      <path d="M12 21V9" />
      <path d="M12 13c-4 0-7-2-7-6 4 0 7 2 7 6Z" />
      <path d="M12 10c0-4 3-7 7-7 0 4-3 7-7 7Z" />
    </svg>
  )
}

function IconoPlano() {
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
      <path d="M4 5h16v14H4z" />
      <path d="M9 5v5H4" />
      <path d="M14 19v-6h6" />
      <path d="M9 14h2" />
    </svg>
  )
}

function IconoRayo() {
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
      <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" />
    </svg>
  )
}

function IconoHerramienta() {
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
      <path d="M14 7a5 5 0 0 0-6.8 6.8L3 18l3 3 4.2-4.2A5 5 0 0 0 17 10" />
      <path d="m15 4 5 5" />
    </svg>
  )
}

function IconoBrote() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22V12" />
      <path d="M12 15c-5 0-8-3-8-8 5 0 8 3 8 8Z" />
      <path d="M12 12c0-5 3-8 8-8 0 5-3 8-8 8Z" />
    </svg>
  )
}

function IconoGota() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2s6 6.5 6 12a6 6 0 1 1-12 0c0-5.5 6-12 6-12Z" />
    </svg>
  )
}

function IconoGrafico() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20V8" />
    </svg>
  )
}

function IconoHistorial() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}
