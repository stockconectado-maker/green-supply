'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Saldos = {
  fecha_inicio: string
  efectivo_ars: number | string
  banco_ars: number | string
  efectivo_usd: number | string
  total_ars: number | string
  movimientos_sin_clasificar: number
}

type Configuracion = {
  id: number
  fecha_inicio: string
  efectivo_ars_inicial: number | string
  banco_ars_inicial: number | string
  efectivo_usd_inicial: number | string
}

type Transferencia = {
  id: number
  fecha: string
  origen: string
  destino: string
  importe: number | string
  observaciones: string | null
  created_at: string
}

type Arqueo = {
  id: number
  fecha: string
  cuenta: string
  saldo_esperado: number | string
  saldo_real: number | string
  diferencia: number | string
  observaciones: string | null
}

type Modal =
  | 'inicial'
  | 'transferencia'
  | 'arqueo'
  | null

export default function CajaPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [saldos, setSaldos] =
    useState<Saldos | null>(null)

  const [configuracion, setConfiguracion] =
    useState<Configuracion | null>(null)

  const [transferencias, setTransferencias] =
    useState<Transferencia[]>([])

  const [arqueos, setArqueos] =
    useState<Arqueo[]>([])

  const [cargando, setCargando] =
    useState(true)

  const [guardando, setGuardando] =
    useState(false)

  const [error, setError] =
    useState('')

  const [modal, setModal] =
    useState<Modal>(null)

  // SALDO INICIAL

  const [
    fechaInicio,
    setFechaInicio,
  ] = useState('')

  const [
    efectivoInicial,
    setEfectivoInicial,
  ] = useState('')

  const [
    bancoInicial,
    setBancoInicial,
  ] = useState('')

  const [
    usdInicial,
    setUsdInicial,
  ] = useState('')

  // TRANSFERENCIA

  const [
    transferenciaFecha,
    setTransferenciaFecha,
  ] = useState(fechaLocal())

  const [
    transferenciaOrigen,
    setTransferenciaOrigen,
  ] = useState('Banco ARS')

  const [
    transferenciaImporte,
    setTransferenciaImporte,
  ] = useState('')

  const [
    transferenciaObs,
    setTransferenciaObs,
  ] = useState('')

  // ARQUEO

  const [
    arqueoCuenta,
    setArqueoCuenta,
  ] = useState('Efectivo ARS')

  const [
    arqueoReal,
    setArqueoReal,
  ] = useState('')

  const [
    arqueoObs,
    setArqueoObs,
  ] = useState('')

  useEffect(() => {
    void cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    setError('')

    const [
      resultadoSaldos,
      resultadoConfiguracion,
      resultadoTransferencias,
      resultadoArqueos,
    ] = await Promise.all([
      supabase
        .from('vista_caja_saldos')
        .select('*')
        .single(),

      supabase
        .from('caja_configuracion')
        .select('*')
        .eq('id', 1)
        .single(),

      supabase
        .from('caja_transferencias')
        .select('*')
        .order('fecha', {
          ascending: false,
        })
        .order('created_at', {
          ascending: false,
        })
        .limit(15),

      supabase
        .from('caja_arqueos')
        .select('*')
        .order('fecha', {
          ascending: false,
        })
        .limit(10),
    ])

    const primerError =
      resultadoSaldos.error ||
      resultadoConfiguracion.error ||
      resultadoTransferencias.error ||
      resultadoArqueos.error

    if (primerError) {
      setError(
        primerError.message ||
          'No se pudo cargar Caja.'
      )
      setCargando(false)
      return
    }

    const config =
      resultadoConfiguracion.data as Configuracion

    setSaldos(
      resultadoSaldos.data as Saldos
    )

    setConfiguracion(config)

    setTransferencias(
      (resultadoTransferencias.data ??
        []) as Transferencia[]
    )

    setArqueos(
      (resultadoArqueos.data ??
        []) as Arqueo[]
    )

    setFechaInicio(config.fecha_inicio)

    setEfectivoInicial(
      String(
        config.efectivo_ars_inicial
      )
    )

    setBancoInicial(
      String(
        config.banco_ars_inicial
      )
    )

    setUsdInicial(
      String(
        config.efectivo_usd_inicial
      )
    )

    setCargando(false)
  }

  async function guardarSaldoInicial() {
    const efectivo =
      numeroNoNegativo(
        efectivoInicial
      )

    const banco =
      numeroNoNegativo(
        bancoInicial
      )

    const usd =
      numeroNoNegativo(
        usdInicial
      )

    if (
      efectivo === null ||
      banco === null ||
      usd === null
    ) {
      setError(
        'Ingresá saldos válidos.'
      )
      return
    }

    if (!fechaInicio) {
      setError(
        'Seleccioná la fecha de inicio.'
      )
      return
    }

    setGuardando(true)
    setError('')

    const { error } =
      await supabase
        .from('caja_configuracion')
        .update({
          fecha_inicio: fechaInicio,
          efectivo_ars_inicial:
            efectivo,
          banco_ars_inicial:
            banco,
          efectivo_usd_inicial:
            usd,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', 1)

    if (error) {
      setError(error.message)
      setGuardando(false)
      return
    }

    setModal(null)
    setGuardando(false)

    await cargar()
  }

  async function guardarTransferencia() {
    const importe =
      numeroPositivo(
        transferenciaImporte
      )

    if (importe <= 0) {
      setError(
        'Ingresá un importe válido.'
      )
      return
    }

    const destino =
      transferenciaOrigen ===
      'Banco ARS'
        ? 'Efectivo ARS'
        : 'Banco ARS'

    setGuardando(true)
    setError('')

    const { error } =
      await supabase
        .from('caja_transferencias')
        .insert({
          fecha:
            transferenciaFecha,
          origen:
            transferenciaOrigen,
          destino,
          importe,
          observaciones:
            transferenciaObs.trim() ||
            null,
        })

    if (error) {
      setError(error.message)
      setGuardando(false)
      return
    }

    setTransferenciaImporte('')
    setTransferenciaObs('')
    setModal(null)
    setGuardando(false)

    await cargar()
  }

  async function guardarArqueo() {
    if (!saldos) return

    const saldoReal =
      numeroNoNegativo(
        arqueoReal
      )

    if (saldoReal === null) {
      setError(
        'Ingresá el saldo contado.'
      )
      return
    }

    const esperado =
      arqueoCuenta ===
      'Efectivo ARS'
        ? numero(
            saldos.efectivo_ars
          )
        : numero(
            saldos.efectivo_usd
          )

    setGuardando(true)
    setError('')

    const { error } =
      await supabase
        .from('caja_arqueos')
        .insert({
          cuenta:
            arqueoCuenta,
          saldo_esperado:
            esperado,
          saldo_real:
            saldoReal,
          observaciones:
            arqueoObs.trim() ||
            null,
        })

    if (error) {
      setError(error.message)
      setGuardando(false)
      return
    }

    setArqueoReal('')
    setArqueoObs('')
    setModal(null)
    setGuardando(false)

    await cargar()
  }

  const destinoTransferencia =
    transferenciaOrigen ===
    'Banco ARS'
      ? 'Efectivo ARS'
      : 'Banco ARS'

  return (
    <main className="min-h-screen bg-[#f5f6f7]">
      <div className="mx-auto max-w-[1450px] px-5 py-6 lg:px-7">

        {/* CABECERA */}

        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>
            <Link
              href="/finanzas"
              className="text-xs font-semibold text-zinc-500 transition hover:text-zinc-900"
            >
              ← Volver a Finanzas
            </Link>

            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              Finanzas
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
              Caja
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              Control del dinero disponible del club.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() =>
                setModal(
                  'transferencia'
                )
              }
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              Mover dinero
            </button>

            <button
              type="button"
              onClick={() =>
                setModal(
                  'arqueo'
                )
              }
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              Arqueo
            </button>

            <button
              type="button"
              onClick={() =>
                setModal(
                  'inicial'
                )
              }
              className="rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800"
            >
              Configurar caja
            </button>

          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {cargando || !saldos ? (
          <section className="rounded-2xl border border-zinc-200 bg-white px-5 py-14 text-center text-sm text-zinc-500 shadow-sm">
            Cargando Caja...
          </section>
        ) : (
          <>
            {/* SALDOS */}

            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

              <div className="flex flex-col gap-2 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                    Posición actual
                  </p>

                  <h2 className="mt-0.5 text-base font-semibold text-zinc-950">
                    Dinero disponible
                  </h2>
                </div>

                <p className="text-[11px] text-zinc-400">
                  Desde{' '}
                  {formatearFecha(
                    saldos.fecha_inicio
                  )}
                </p>

              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-4">

                <SaldoCard
                  titulo="Efectivo ARS"
                  valor={formatearPesos(
                    numero(
                      saldos.efectivo_ars
                    )
                  )}
                  detalle="Dinero físico"
                />

                <SaldoCard
                  titulo="Banco / Transferencias"
                  valor={formatearPesos(
                    numero(
                      saldos.banco_ars
                    )
                  )}
                  detalle="Saldo bancario ARS"
                />

                <SaldoCard
                  titulo="Efectivo USD"
                  valor={formatearUsd(
                    numero(
                      saldos.efectivo_usd
                    )
                  )}
                  detalle="Dólares físicos"
                />

                <SaldoCard
                  titulo="Total ARS"
                  valor={formatearPesos(
                    numero(
                      saldos.total_ars
                    )
                  )}
                  detalle="Efectivo + banco"
                  destacado
                />

              </div>
            </section>

            {/* ALERTA */}

            {Number(
              saldos
                .movimientos_sin_clasificar
            ) > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                Hay{' '}
                <strong>
                  {
                    saldos
                      .movimientos_sin_clasificar
                  }
                </strong>{' '}
                movimientos posteriores al inicio de Caja que no tienen un medio de pago compatible.
              </div>
            )}

            {/* CUERPO */}

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">

              {/* TRANSFERENCIAS */}

              <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

                <div className="border-b border-zinc-100 px-5 py-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                    Movimientos internos
                  </p>

                  <h2 className="mt-0.5 text-base font-semibold text-zinc-950">
                    Transferencias entre cajas
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    No generan ingresos ni gastos.
                  </p>
                </div>

                {!transferencias.length ? (
                  <Vacio
                    texto="Todavía no hay transferencias internas."
                  />
                ) : (
                  <div className="divide-y divide-zinc-100">

                    {transferencias.map(
                      (item) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                        >

                          <div>
                            <p className="text-sm font-semibold text-zinc-900">
                              {item.origen}
                              {' → '}
                              {item.destino}
                            </p>

                            <p className="mt-1 text-[10px] text-zinc-400">
                              {formatearFecha(
                                item.fecha
                              )}

                              {item.observaciones
                                ? ` · ${item.observaciones}`
                                : ''}
                            </p>
                          </div>

                          <strong className="text-sm font-semibold text-zinc-950">
                            {formatearPesos(
                              numero(
                                item.importe
                              )
                            )}
                          </strong>

                        </div>
                      )
                    )}

                  </div>
                )}
              </section>

              {/* ARQUEOS */}

              <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

                <div className="border-b border-zinc-100 px-5 py-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                    Control
                  </p>

                  <h2 className="mt-0.5 text-base font-semibold text-zinc-950">
                    Últimos arqueos
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    Esperado vs contado.
                  </p>
                </div>

                {!arqueos.length ? (
                  <Vacio
                    texto="Todavía no realizaste arqueos."
                  />
                ) : (
                  <div className="divide-y divide-zinc-100">

                    {arqueos.map(
                      (item) => {
                        const diferencia =
                          numero(
                            item.diferencia
                          )

                        const esUsd =
                          item.cuenta ===
                          'Efectivo USD'

                        return (
                          <div
                            key={item.id}
                            className="px-5 py-3.5"
                          >
                            <div className="flex items-start justify-between gap-3">

                              <div>
                                <p className="text-xs font-semibold text-zinc-900">
                                  {item.cuenta}
                                </p>

                                <p className="mt-1 text-[10px] text-zinc-400">
                                  {formatearFechaHora(
                                    item.fecha
                                  )}
                                </p>
                              </div>

                              <strong
                                className={`text-sm ${
                                  diferencia ===
                                  0
                                    ? 'text-emerald-700'
                                    : 'text-red-700'
                                }`}
                              >
                                {diferencia >
                                0
                                  ? '+ '
                                  : ''}

                                {esUsd
                                  ? formatearUsd(
                                      diferencia
                                    )
                                  : formatearPesos(
                                      diferencia
                                    )}
                              </strong>

                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-zinc-50 p-3">

                              <MiniDato
                                titulo="Esperado"
                                valor={
                                  esUsd
                                    ? formatearUsd(
                                        numero(
                                          item.saldo_esperado
                                        )
                                      )
                                    : formatearPesos(
                                        numero(
                                          item.saldo_esperado
                                        )
                                      )
                                }
                              />

                              <MiniDato
                                titulo="Contado"
                                valor={
                                  esUsd
                                    ? formatearUsd(
                                        numero(
                                          item.saldo_real
                                        )
                                      )
                                    : formatearPesos(
                                        numero(
                                          item.saldo_real
                                        )
                                      )
                                }
                              />

                            </div>
                          </div>
                        )
                      }
                    )}

                  </div>
                )}

              </section>
            </div>

            {/* PIE */}

            <section className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[10px] leading-5 text-zinc-400 shadow-sm">
              Los movimientos financieros históricos anteriores al inicio de Caja no modifican estos saldos. Caja comienza desde los saldos reales configurados.
            </section>
          </>
        )}

      </div>

      {/* CONFIGURACION */}

      {modal === 'inicial' && (
        <ModalBase
          titulo="Configurar Caja"
          descripcion="Definí el punto de partida real. Los movimientos anteriores a esta fecha quedan fuera del saldo de Caja."
          onCerrar={() =>
            !guardando &&
            setModal(null)
          }
        >

          <Campo titulo="Fecha de inicio">
            <input
              type="date"
              value={fechaInicio}
              onChange={(event) =>
                setFechaInicio(
                  event.target.value
                )
              }
              className="campo-caja"
            />
          </Campo>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">

            <Campo titulo="Efectivo ARS inicial">
              <input
                type="number"
                min="0"
                step="1"
                value={efectivoInicial}
                onChange={(event) =>
                  setEfectivoInicial(
                    event.target.value
                  )
                }
                className="campo-caja"
              />
            </Campo>

            <Campo titulo="Banco ARS inicial">
              <input
                type="number"
                min="0"
                step="1"
                value={bancoInicial}
                onChange={(event) =>
                  setBancoInicial(
                    event.target.value
                  )
                }
                className="campo-caja"
              />
            </Campo>

          </div>

          <div className="mt-4">

            <Campo titulo="Efectivo USD inicial">
              <input
                type="number"
                min="0"
                step="1"
                value={usdInicial}
                onChange={(event) =>
                  setUsdInicial(
                    event.target.value
                  )
                }
                className="campo-caja"
              />
            </Campo>

          </div>

          <Acciones
            guardando={guardando}
            onCancelar={() =>
              setModal(null)
            }
            onGuardar={
              guardarSaldoInicial
            }
          />

        </ModalBase>
      )}

      {/* TRANSFERENCIA */}

      {modal ===
        'transferencia' && (
        <ModalBase
          titulo="Mover dinero"
          descripcion="Traslado interno entre banco y efectivo. No genera ingreso ni gasto."
          onCerrar={() =>
            !guardando &&
            setModal(null)
          }
        >

          <Campo titulo="Fecha">
            <input
              type="date"
              value={
                transferenciaFecha
              }
              onChange={(event) =>
                setTransferenciaFecha(
                  event.target.value
                )
              }
              className="campo-caja"
            />
          </Campo>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">

            <Campo titulo="Desde">
              <select
                value={
                  transferenciaOrigen
                }
                onChange={(event) =>
                  setTransferenciaOrigen(
                    event.target.value
                  )
                }
                className="campo-caja"
              >
                <option value="Banco ARS">
                  Banco ARS
                </option>

                <option value="Efectivo ARS">
                  Efectivo ARS
                </option>
              </select>
            </Campo>

            <Campo titulo="Hacia">
              <input
                value={
                  destinoTransferencia
                }
                disabled
                className="campo-caja bg-zinc-50"
              />
            </Campo>

          </div>

          <div className="mt-4">

            <Campo titulo="Importe">
              <input
                type="number"
                min="0"
                step="1"
                value={
                  transferenciaImporte
                }
                onChange={(event) =>
                  setTransferenciaImporte(
                    event.target.value
                  )
                }
                className="campo-caja"
              />
            </Campo>

          </div>

          <div className="mt-4">

            <Campo titulo="Observaciones">
              <input
                value={
                  transferenciaObs
                }
                onChange={(event) =>
                  setTransferenciaObs(
                    event.target.value
                  )
                }
                className="campo-caja"
              />
            </Campo>

          </div>

          <Acciones
            guardando={guardando}
            onCancelar={() =>
              setModal(null)
            }
            onGuardar={
              guardarTransferencia
            }
          />

        </ModalBase>
      )}

      {/* ARQUEO */}

      {modal === 'arqueo' && (
        <ModalBase
          titulo="Arqueo de efectivo"
          descripcion="Contá el efectivo físico y comparalo contra el saldo esperado por el sistema."
          onCerrar={() =>
            !guardando &&
            setModal(null)
          }
        >

          <Campo titulo="Cuenta">
            <select
              value={arqueoCuenta}
              onChange={(event) =>
                setArqueoCuenta(
                  event.target.value
                )
              }
              className="campo-caja"
            >
              <option value="Efectivo ARS">
                Efectivo ARS
              </option>

              <option value="Efectivo USD">
                Efectivo USD
              </option>
            </select>
          </Campo>

          <div className="mt-4">

            <Campo titulo="Saldo contado">
              <input
                type="number"
                min="0"
                step="0.01"
                value={arqueoReal}
                onChange={(event) =>
                  setArqueoReal(
                    event.target.value
                  )
                }
                className="campo-caja"
              />
            </Campo>

          </div>

          <div className="mt-4">

            <Campo titulo="Observaciones">
              <input
                value={arqueoObs}
                onChange={(event) =>
                  setArqueoObs(
                    event.target.value
                  )
                }
                className="campo-caja"
              />
            </Campo>

          </div>

          <Acciones
            guardando={guardando}
            onCancelar={() =>
              setModal(null)
            }
            onGuardar={
              guardarArqueo
            }
          />

        </ModalBase>
      )}

      <style jsx global>{`
        .campo-caja {
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

        .campo-caja:focus {
          border-color: rgb(52 211 153);
          box-shadow: 0 0 0 4px rgb(209 250 229);
        }
      `}</style>
    </main>
  )
}

function SaldoCard({
  titulo,
  valor,
  detalle,
  destacado = false,
}: {
  titulo: string
  valor: string
  detalle: string
  destacado?: boolean
}) {
  return (
    <div
      className={`border-b border-zinc-100 px-5 py-5 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0 ${
        destacado
          ? 'bg-emerald-50/40'
          : ''
      }`}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.09em] text-zinc-400">
        {titulo}
      </p>

      <p
        className={`mt-1 text-xl font-semibold tabular-nums tracking-tight ${
          destacado
            ? 'text-emerald-800'
            : 'text-zinc-950'
        }`}
      >
        {valor}
      </p>

      <p className="mt-1 text-xs text-zinc-500">
        {detalle}
      </p>
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
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">
        {titulo}
      </p>

      <p className="mt-1 text-xs font-semibold text-zinc-900">
        {valor}
      </p>
    </div>
  )
}

function Vacio({
  texto,
}: {
  texto: string
}) {
  return (
    <div className="px-5 py-10 text-center text-sm text-zinc-500">
      {texto}
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
            onClick={onCerrar}
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

function Acciones({
  guardando,
  onCancelar,
  onGuardar,
}: {
  guardando: boolean
  onCancelar: () => void
  onGuardar: () => void
}) {
  return (
    <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4">

      <button
        type="button"
        onClick={onCancelar}
        disabled={guardando}
        className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
      >
        Cancelar
      </button>

      <button
        type="button"
        onClick={onGuardar}
        disabled={guardando}
        className="rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:bg-zinc-300"
      >
        {guardando
          ? 'Guardando...'
          : 'Guardar'}
      </button>

    </div>
  )
}

function numero(valor: unknown) {
  const n = Number(valor)

  return Number.isFinite(n)
    ? n
    : 0
}

function numeroPositivo(
  valor: string
) {
  const n = Number(
    String(valor).replace(',', '.')
  )

  return Number.isFinite(n) &&
    n > 0
    ? n
    : 0
}

function numeroNoNegativo(
  valor: string
) {
  const n = Number(
    String(valor).replace(',', '.')
  )

  if (
    !Number.isFinite(n) ||
    n < 0
  ) {
    return null
  }

  return n
}

function fechaLocal() {
  const hoy = new Date()

  return `${hoy.getFullYear()}-${String(
    hoy.getMonth() + 1
  ).padStart(2, '0')}-${String(
    hoy.getDate()
  ).padStart(2, '0')}`
}

function formatearPesos(
  importe: number
) {
  return new Intl.NumberFormat(
    'es-AR',
    {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }
  ).format(importe)
}

function formatearUsd(
  importe: number
) {
  return new Intl.NumberFormat(
    'es-AR',
    {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }
  ).format(importe)
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

function formatearFechaHora(
  fecha: string
) {
  return new Intl.DateTimeFormat(
    'es-AR',
    {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }
  ).format(
    new Date(fecha)
  )
}