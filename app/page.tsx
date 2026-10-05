'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Asociado = {
  id: number
  nombre_apellido: string | null
  estado_asociado: string | null
  estado_reprocann: string | null
  vencimiento_reprocann: string | null
  documentacion: string | null
}

type Sala = {
  id: number
  nombre: string
  tipo: string | null
  archivada: boolean | null
  capacidad_maxima?: number | string | null
}

type Ciclo = {
  ciclo_id: number
  sala_id: number
  estado: string
  etapa_actual: string
  fecha_corte_planificada: string | null
  cantidad_total: number | string | null
  semana_floracion: number | null
  dia_semana_floracion?: number | null
  camas_utilizadas?: number | null
  meta_produccion_g?: number | string | null
  codigo_cosecha?: string | null
}

type Existencia = {
  genetica_id: number
  genetica: string
  stock_disponible_g: number | string
}

type Dispensa = {
  dispensa_id: number
  fecha: string
  created_at: string
  asociado: string
  genetica: string
  cantidad_g: number | string
}

type GeneticaAsignada = {
  ciclo_id: number
  genetica_id: number
  cantidad: number | string
}
type GeneticaCatalogo = {
  id: number
  nombre: string
}
type PlanRiego = { ciclo_id: number }
type Capacidad = { id: number; capacidad_maxima: number | string | null }
type CicloDetalle = {
  ciclo_id: number
  dia_semana_floracion: number | null
  camas_utilizadas: number | null
  meta_produccion_g: number | string | null
  codigo_cosecha: string | null
}
type DispensaSemana = Dispensa & { asociado_id: number }

type FinanzasMes = {
  periodo: string
  ingresos: number | string
  gastos: number | string
  saldo: number | string
  aportes_dispensa: number | string
}

type Datos = {
  asociados: Asociado[] | null
  salas: Sala[] | null
  ciclos: Ciclo[] | null
  existencias: Existencia[] | null
  dispensas: Dispensa[] | null
  dispensasSemana: DispensaSemana[] | null
  ultimasDispensas: Dispensa[] | null
  capacidades: Capacidad[] | null
  detallesCiclos: CicloDetalle[] | null
  distribucion: GeneticaAsignada[] | null
  catalogoGeneticas: GeneticaCatalogo[] | null
  planesRiego: PlanRiego[] | null
  finanzas: FinanzasMes | null | undefined
}

const ESTADO_INICIAL: Datos = {
  asociados: null,
  salas: null,
  ciclos: null,
  existencias: null,
  dispensas: null,
  dispensasSemana: null,
  ultimasDispensas: null,
  capacidades: null,
  detallesCiclos: null,
  distribucion: null,
  catalogoGeneticas: null,
  planesRiego: null,
  finanzas: undefined,
}

// Dashboard de Inicio: conserva el diseño existente y muestra actividad y cultivo enriquecido.
export default function DashboardGreenSupply() {
  const supabase = useMemo(() => createClient(), [])
  const [datos, setDatos] = useState<Datos>(ESTADO_INICIAL)
  const [errores, setErrores] = useState<string[]>([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    const hoy = new Date()
    const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
    // Fecha local del navegador; se convierte a UTC solo para filtrar created_at.
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1)
    const inicioSemana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 6)

    const [a, s, c, st, d, f, semana, ultimas] = await Promise.all([
      supabase.from('asociados').select('id,nombre_apellido,estado_asociado,estado_reprocann,vencimiento_reprocann,documentacion'),
      supabase.from('salas').select('id,nombre,tipo,archivada'),
      supabase.from('vista_ciclos_cultivo').select('ciclo_id,sala_id,estado,etapa_actual,fecha_corte_planificada,cantidad_total,semana_floracion').eq('estado', 'Activo'),
      supabase.from('vista_stock_geneticas_dispensa').select('genetica_id,genetica,stock_disponible_g'),
      supabase.from('vista_dispensas').select('dispensa_id,fecha,created_at,asociado,genetica,cantidad_g').gte('created_at', inicioHoy.toISOString()).lt('created_at', finHoy.toISOString()),
      supabase.from('vista_finanzas_resumen_mensual').select('periodo,ingresos,gastos,saldo,aportes_dispensa').eq('periodo', periodo).maybeSingle(),
      supabase.from('vista_dispensas').select('dispensa_id,fecha,created_at,asociado_id,asociado,genetica,cantidad_g').gte('created_at', inicioSemana.toISOString()).lt('created_at', finHoy.toISOString()),
      supabase.from('vista_dispensas').select('dispensa_id,fecha,created_at,asociado,genetica,cantidad_g').order('created_at', { ascending: false }).limit(3),
    ])

    // Consultas complementarias: si un dato aún no existe en la vista,
    // el módulo principal sigue funcionando sin inventar valores.
    const ciclosBase = c.error ? null : (c.data ?? []) as Ciclo[]
    const idsCiclos = (ciclosBase ?? []).map(x => x.ciclo_id)
    const [capacidadesResp, detallesResp, distribucionResp, catalogoResp, planesResp] = await Promise.all([
      supabase.from('salas').select('id,capacidad_maxima'),
      idsCiclos.length ? supabase.from('vista_ciclos_cultivo').select('ciclo_id,dia_semana_floracion,camas_utilizadas,meta_produccion_g,codigo_cosecha').in('ciclo_id', idsCiclos) : Promise.resolve(null),
      idsCiclos.length ? supabase.from('ciclo_camas_geneticas').select('ciclo_id,genetica_id,cantidad').in('ciclo_id', idsCiclos) : Promise.resolve(null),
      idsCiclos.length ? supabase.from('geneticas').select('id,nombre') : Promise.resolve(null),
      idsCiclos.length ? supabase.from('planes_riego_ciclo').select('ciclo_id').in('ciclo_id', idsCiclos) : Promise.resolve(null),
    ])

    const avisos: string[] = []
    if (a.error) avisos.push('Asociados no disponible')
    if (s.error) avisos.push('Salas no disponible')
    if (c.error) avisos.push('Ciclos no disponible')
    if (st.error) avisos.push('Stock no disponible')
    if (d.error || semana.error || ultimas.error) avisos.push('Dispensa no disponible')
    if (f.error) avisos.push('Finanzas no disponible')

    setDatos({
      asociados: a.error ? null : (a.data ?? []) as Asociado[],
      salas: s.error ? null : (s.data ?? []) as Sala[],
      ciclos: c.error ? null : (c.data ?? []) as Ciclo[],
      existencias: st.error ? null : (st.data ?? []) as Existencia[],
      dispensas: d.error ? null : (d.data ?? []) as Dispensa[],
      dispensasSemana: semana.error ? null : (semana.data ?? []) as DispensaSemana[],
      ultimasDispensas: ultimas.error ? null : (ultimas.data ?? []) as Dispensa[],
      capacidades: capacidadesResp.error ? null : (capacidadesResp.data ?? []) as Capacidad[],
      detallesCiclos: detallesResp === null ? [] : detallesResp.error ? null : (detallesResp.data ?? []) as CicloDetalle[],
      distribucion: distribucionResp === null ? [] : distribucionResp.error ? null : (distribucionResp.data ?? []) as GeneticaAsignada[],
      catalogoGeneticas: catalogoResp === null ? [] : catalogoResp.error ? null : (catalogoResp.data ?? []) as GeneticaCatalogo[],
      planesRiego: planesResp === null ? [] : planesResp.error ? null : (planesResp.data ?? []) as PlanRiego[],
      finanzas: f.error ? undefined : ((f.data ?? null) as FinanzasMes | null),
    })
    setErrores(avisos)
    setCargando(false)
  }, [supabase])

  useEffect(() => { void cargar() }, [cargar])

  const asociadosActivos = datos.asociados?.filter(x => texto(x.estado_asociado) === 'asociado activo') ?? null
  const estadosAlta = new Set(['interesado', 'consulta médica pendiente', 'reprocann en trámite', 'reprocann aprobado', 'alta pendiente'])
  const pendientesAlta = datos.asociados?.filter(x => estadosAlta.has(texto(x.estado_asociado))) ?? null
  const salasNoArchivadas = datos.salas?.filter(s => !s.archivada) ?? null
  const salasConCiclo = new Set((datos.ciclos ?? []).map(x => x.sala_id)).size
  const stockGramos = datos.existencias?.reduce((sum, g) => sum + numero(g.stock_disponible_g), 0) ?? null
  const dispensasGramos = datos.dispensas?.reduce((sum, d) => sum + numero(d.cantidad_g), 0) ?? null
  const geneticas = [...(datos.existencias ?? [])].filter(g => numero(g.stock_disponible_g) > 0).sort((x, y) => numero(y.stock_disponible_g) - numero(x.stock_disponible_g)).slice(0, 5)
  const stockMax = Math.max(1, ...geneticas.map(x => numero(x.stock_disponible_g)))
  const dispensasSemanaGramos = datos.dispensasSemana?.reduce((sum, x) => sum + numero(x.cantidad_g), 0) ?? null
  const asociadosAtendidosSemana = datos.dispensasSemana === null ? null : new Set(datos.dispensasSemana.map(x => x.asociado_id)).size

  return (
    <main className="min-h-screen bg-[#f5f6f7]">
      <div className="mx-auto max-w-[1500px] px-5 py-6 lg:px-7">
        <header className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Green Supply</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">Inicio</h1>
            <p className="mt-1 text-sm text-zinc-500">Panorama operativo del club, actualizado desde los módulos.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/asociados/nuevo" className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50">+ Asociado</Link>
            <Link href="/dispensa" className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50">Ir a Dispensa</Link>
            <Link href="/stock" className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50">Ir a Stock</Link>
            <button type="button" onClick={() => void cargar()} disabled={cargando} className="rounded-xl bg-zinc-950 px-3.5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{cargando ? 'Actualizando…' : 'Actualizar'}</button>
          </div>
        </header>

        {errores.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            No se pudo leer: {errores.join(' · ')}. Los campos afectados se muestran sin datos, nunca como cero.
          </div>
        )}

        <section className="grid overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-4">
          <Indicador titulo="Asociados activos" valor={cargando ? '…' : asociadosActivos === null ? '—' : entero(asociadosActivos.length)} detalle={pendientesAlta === null ? 'Pendientes no disponibles' : `${entero(pendientesAlta.length)} en proceso`} />
          <Indicador titulo="Stock disponible" valor={cargando ? '…' : stockGramos === null ? '—' : gramos(stockGramos)} detalle="Existencia calculada desde Stock" />
          <Indicador titulo="Salas con ciclo activo" valor={cargando ? '…' : datos.ciclos === null ? '—' : entero(salasConCiclo)} detalle={salasNoArchivadas === null ? 'Salas no disponibles' : `de ${salasNoArchivadas.length} salas no archivadas`} />
          <Indicador titulo="Dispensas de hoy" valor={cargando ? '…' : datos.dispensas === null ? '—' : entero(datos.dispensas.length)} detalle={dispensasGramos === null ? 'Volumen no disponible' : `${gramos(dispensasGramos)} dispensados`} />
        </section>

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[.8fr_1.2fr]">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-5">
            <Titulo titulo="Actividad del club" subtitulo="Dispensas y movimientos recientes." href="/dispensa/estadisticas" textoLink="Ver actividad →" />
            <div className="mt-4 grid grid-cols-3 divide-x divide-zinc-100 rounded-xl border border-zinc-100 bg-zinc-50/70 py-3">
              <DatoActividad titulo="Últimos 7 días" valor={datos.dispensasSemana === null ? '—' : entero(datos.dispensasSemana.length)} detalle="dispensas" />
              <DatoActividad titulo="Volumen" valor={dispensasSemanaGramos === null ? '—' : gramos(dispensasSemanaGramos)} detalle="dispensados" />
              <DatoActividad titulo="Asociados" valor={asociadosAtendidosSemana === null ? '—' : entero(asociadosAtendidosSemana)} detalle="atendidos" />
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <h3 className="text-[10px] font-bold uppercase tracking-[.08em] text-zinc-400">Últimas dispensas</h3>
              <Link href="/dispensa" className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900">Nueva dispensa →</Link>
            </div>
            {datos.ultimasDispensas === null ? (
              <Vacio texto="No se pudo consultar la actividad reciente." />
            ) : datos.ultimasDispensas.length === 0 ? (
              <div className="mt-3 rounded-xl border border-zinc-100 px-3.5 py-5">
                <p className="text-xs font-semibold text-zinc-700">Todavía no hay dispensas registradas.</p>
                <p className="mt-1 text-[11px] text-zinc-500">Los movimientos aparecerán aquí automáticamente.</p>
              </div>
            ) : (
              <div className="mt-2 divide-y divide-zinc-100">
                {datos.ultimasDispensas.map(d => (
                  <div key={d.dispensa_id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-zinc-900">{d.genetica}</p>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">{d.asociado} · {fechaHora(d.created_at)}</p>
                    </div>
                    <strong className="shrink-0 text-xs font-semibold tabular-nums text-zinc-800">{gramos(numero(d.cantidad_g))}</strong>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 text-[11px] text-zinc-500">
              <span>{asociadosActivos === null ? 'Asociados activos: —' : `${entero(asociadosActivos.length)} asociados activos`}</span>
              <Link href="/asociados" className="font-semibold text-emerald-700 hover:text-emerald-900">Ver asociados →</Link>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-5">
            <Titulo titulo="Cultivo activo" subtitulo="Estado y planificación de cada sala." href="/cultivo" textoLink="Todas las salas →" />
            {datos.ciclos === null || datos.salas === null ? (
              <Vacio texto="Cultivo no disponible." />
            ) : datos.ciclos.length === 0 ? (
              <Vacio texto="Todavía no hay ciclos activos registrados." />
            ) : (
              <div className="mt-3 divide-y divide-zinc-100">
                {[...datos.ciclos]
                  .filter(c => salasNoArchivadas?.some(s => s.id === c.sala_id))
                  .sort((a, b) => (a.fecha_corte_planificada ?? '9999').localeCompare(b.fecha_corte_planificada ?? '9999'))
                  .map(ciclo => {
                    const sala = datos.salas?.find(s => s.id === ciclo.sala_id)
                    const detalle = datos.detallesCiclos?.find(x => x.ciclo_id === ciclo.ciclo_id)
                    const capacidad = datos.capacidades?.find(x => x.id === ciclo.sala_id)?.capacidad_maxima
                    const ocupacion = numero(capacidad) > 0 && ciclo.cantidad_total !== null ? Math.round(numero(ciclo.cantidad_total) / numero(capacidad) * 100) : null
                    const distribucion = datos.distribucion === null || datos.catalogoGeneticas === null ? null : datos.distribucion.filter(g => g.ciclo_id === ciclo.ciclo_id)
                    const geneticasAgrupadas = distribucion === null ? null : distribucion.reduce<{id: number; nombre: string; cantidad: number}[]>((ac, item) => {
                      const existe = ac.find(g => g.id === item.genetica_id)
                      if (existe) existe.cantidad += numero(item.cantidad)
                      else ac.push({id: item.genetica_id, nombre: datos.catalogoGeneticas?.find(g => g.id === item.genetica_id)?.nombre ?? `Genética ${item.genetica_id}`, cantidad: numero(item.cantidad)})
                      return ac
                    }, [])
                    const riegoRegistrado = datos.planesRiego === null ? null : datos.planesRiego.some(p => p.ciclo_id === ciclo.ciclo_id)
                    return (
                      <article key={ciclo.ciclo_id} className="py-4 first:pt-2 last:pb-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link href={`/cultivo/salas/${ciclo.sala_id}`} className="text-sm font-semibold text-zinc-950 hover:text-emerald-800">{sala?.nombre ?? `Sala ${ciclo.sala_id}`}</Link>
                              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">{ciclo.etapa_actual || sala?.tipo || 'En curso'}</span>
                            </div>
                            <p className="mt-1 text-[11px] text-zinc-500">{detalle?.codigo_cosecha ? `${detalle.codigo_cosecha} · ` : ''}{sala?.tipo ?? 'Sala activa'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-zinc-400">Próximo corte</p>
                            <p className="mt-0.5 text-xs font-semibold text-zinc-900">{fechaCorta(ciclo.fecha_corte_planificada)}</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 divide-x divide-zinc-200 rounded-lg bg-[#f7f9f8] py-2.5">
                          <DatoActividad titulo="Etapa" valor={ciclo.semana_floracion && texto(ciclo.etapa_actual) === 'floración' ? `Semana ${ciclo.semana_floracion}` : ciclo.etapa_actual || '—'} detalle={detalle?.dia_semana_floracion ? `Día ${detalle.dia_semana_floracion}` : 'actual'} />
                          <DatoActividad titulo="Plantas" valor={ciclo.cantidad_total === null ? '—' : entero(numero(ciclo.cantidad_total))} detalle={numero(capacidad) > 0 ? `de ${entero(numero(capacidad))} posibles` : 'en este ciclo'} />
                          <DatoActividad titulo="Camas en uso" valor={detalle?.camas_utilizadas == null ? '—' : entero(detalle.camas_utilizadas)} detalle="en el ciclo" />
                        </div>
                        {ocupacion !== null && (
                          <div className="mt-3">
                            <div className="flex justify-between gap-2 text-[10px] text-zinc-500"><span>Ocupación</span><strong className="tabular-nums text-zinc-800">{entero(ocupacion)}%</strong></div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${Math.max(0, Math.min(100, ocupacion))}%` }} /></div>
                          </div>
                        )}
                        {geneticasAgrupadas !== null && geneticasAgrupadas.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {geneticasAgrupadas.map(g => (
                              <span key={g.id} className="rounded-md border border-zinc-200 px-2.5 py-1 text-[10px] text-zinc-600">{g.nombre} <strong className="ml-1 tabular-nums text-zinc-900">{entero(g.cantidad)}</strong></span>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-500">
                          {detalle?.meta_produccion_g != null && numero(detalle.meta_produccion_g) > 0 && <span>Objetivo: <strong className="font-semibold text-zinc-800">{gramos(numero(detalle.meta_produccion_g))}</strong></span>}
                          {riegoRegistrado !== null && <span>Riego: <strong className="font-semibold text-zinc-700">{riegoRegistrado ? 'plan registrado' : 'sin plan registrado'}</strong></span>}
                          <Link href={`/cultivo/salas/${ciclo.sala_id}`} className="ml-auto font-semibold text-emerald-700 hover:text-emerald-900">Abrir sala →</Link>
                        </div>
                      </article>
                    )
                  })}
              </div>
            )}
          </section>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-5">
            <Titulo titulo="Existencias por genética" subtitulo="Mayor disponibilidad registrada; no es una clasificación comercial." href="/stock" textoLink="Ver inventario →" />
            {!geneticas.length ? <Vacio texto={datos.existencias === null ? 'Stock no disponible.' : 'Sin existencias registradas.'} /> : (
              <div className="mt-4 space-y-3">
                {geneticas.map(g => (
                  <div key={g.genetica_id}>
                    <div className="flex justify-between gap-3 text-xs"><span className="truncate font-medium text-zinc-700">{g.genetica}</span><strong className="tabular-nums text-zinc-900">{gramos(numero(g.stock_disponible_g))}</strong></div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${Math.max(3, numero(g.stock_disponible_g) / stockMax * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-5">
            <Titulo titulo="Finanzas del mes" subtitulo="Resumen discreto. El detalle y la auditoría están en Finanzas." href="/finanzas" textoLink="Abrir Finanzas →" />
            {datos.finanzas === undefined ? <Vacio texto="Finanzas no disponible o pendiente de instalación." /> : (
              <div className="mt-4 divide-y divide-zinc-100">
                <Linea titulo="Ingresos registrados" valor={pesos(numero(datos.finanzas?.ingresos))} />
                <Linea titulo="Gastos registrados" valor={pesos(numero(datos.finanzas?.gastos))} />
                <Linea titulo="De esos ingresos, desde Dispensa" valor={pesos(numero(datos.finanzas?.aportes_dispensa))} secundario />
                <Linea titulo="Resultado del mes" valor={pesos(numero(datos.finanzas?.saldo))} fuerte />
              </div>
            )}
            <p className="mt-4 text-[10px] leading-4 text-zinc-400">El resultado incluye el historial cargado y los movimientos adicionales. No representa necesariamente el saldo de caja o banco.</p>
          </section>
        </div>
      </div>
    </main>
  )
}

function Indicador({ titulo, valor, detalle }: { titulo: string, valor: string, detalle: string }) {
  return <div className="border-b border-zinc-100 px-4 py-4 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0"><p className="text-[10px] font-bold uppercase tracking-[.08em] text-zinc-400">{titulo}</p><p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-zinc-950">{valor}</p><p className="mt-1 text-xs text-zinc-500">{detalle}</p></div>
}
function Titulo({ titulo, subtitulo, href, textoLink }: { titulo: string, subtitulo: string, href: string, textoLink: string }) {
  return <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-zinc-950">{titulo}</h2><p className="mt-1 text-xs text-zinc-500">{subtitulo}</p></div><Link href={href} className="shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-800">{textoLink}</Link></div>
}
function Linea({ titulo, valor, fuerte = false, secundario = false }: { titulo: string, valor: string, fuerte?: boolean, secundario?: boolean }) {
  return <div className={`flex justify-between gap-3 py-3 ${fuerte ? 'font-semibold' : ''}`}><span className={secundario ? 'text-xs text-zinc-400' : 'text-sm text-zinc-600'}>{titulo}</span><span className={`shrink-0 tabular-nums ${secundario ? 'text-xs text-zinc-600' : 'text-sm text-zinc-950'}`}>{valor}</span></div>
}
function Vacio({ texto }: { texto: string }) { return <p className="mt-4 rounded-xl bg-zinc-50 p-4 text-xs text-zinc-500">{texto}</p> }
function numero(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0 }
function texto(v: string | null): string { return (v ?? '').trim().toLowerCase() }
function pesos(v: number): string { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v) }
function entero(v: number): string { return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(v) }
function gramos(v: number): string { return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(v)} g` }
function fechaCorta(d: string | null): string { return d ? new Intl.DateTimeFormat('es-AR', {day:'2-digit', month:'2-digit'}).format(new Date(`${d}T12:00:00`)) : 'Sin definir' }
function fechaHora(v: string): string { return new Intl.DateTimeFormat('es-AR', {day:'2-digit', month:'2-digit'}).format(new Date(v)) }
function DatoActividad({ titulo, valor, detalle }: { titulo: string; valor: string; detalle: string }) {
  return <div className="min-w-0 px-2.5 first:pl-3.5 last:pr-3.5"><p className="text-[9px] text-zinc-500">{titulo}</p><p className="mt-1 break-words text-sm font-semibold tabular-nums text-zinc-950">{valor}</p><p className="mt-0.5 text-[10px] text-zinc-400">{detalle}</p></div>
}
