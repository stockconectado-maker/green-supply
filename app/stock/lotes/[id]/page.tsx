import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Movimiento = {
  id: number
  tipo:
    | 'Ingreso'
    | 'Salida'
    | 'Ajuste positivo'
    | 'Ajuste negativo'
  cantidad: number | string
  fecha: string
  motivo: string | null
  observaciones: string | null
  created_at: string
}

export default async function LotePage({
  params,
}: {
  params: Promise<{
    id: string
  }>
}) {
  const { id } = await params

  const loteId = Number(id)

  if (!Number.isInteger(loteId)) {
    notFound()
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const {
    data: lote,
    error: loteError,
  } = await supabase
    .from('lotes')
    .select(`
      id,
      codigo_lote,
      genetica_id,
      fecha_ingreso,
      fecha_cosecha,
      estado,
      observaciones,
      created_at,
      geneticas (
        id,
        nombre,
        activa
      )
    `)
    .eq('id', loteId)
    .single()

  if (
    loteError ||
    !lote
  ) {
    notFound()
  }

  const {
    data: movimientos,
    error: movimientosError,
  } = await supabase
    .from('movimientos_stock')
    .select(`
      id,
      tipo,
      cantidad,
      fecha,
      motivo,
      observaciones,
      created_at
    `)
    .eq('lote_id', loteId)
    .order('created_at', {
      ascending: true,
    })

  if (movimientosError) {
    console.error(
      movimientosError
    )
  }

  const listaMovimientos =
    (movimientos ?? []) as Movimiento[]

  function impactoMovimiento(
    movimiento: Movimiento
  ) {
    const cantidad =
      Number(
        movimiento.cantidad
      )

    if (
      movimiento.tipo ===
        'Ingreso' ||
      movimiento.tipo ===
        'Ajuste positivo'
    ) {
      return cantidad
    }

    return -cantidad
  }

  const existenciaActual =
    listaMovimientos.reduce(
      (
        total,
        movimiento
      ) =>
        total +
        impactoMovimiento(
          movimiento
        ),
      0
    )

  const ingresoInicial =
    listaMovimientos.find(
      (movimiento) =>
        movimiento.tipo ===
        'Ingreso'
    )

  const movimientosRecientes =
    [...listaMovimientos]
      .reverse()

  const geneticaRaw =
    lote.geneticas

  const genetica =
    Array.isArray(
      geneticaRaw
    )
      ? geneticaRaw[0]
      : geneticaRaw

  function cantidad(
    valor:
      | number
      | string
  ) {
    return new Intl.NumberFormat(
      'es-AR',
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    ).format(
      Number(valor)
    )
  }

  function fecha(
    valor:
      | string
      | null
  ) {
    if (!valor) {
      return '—'
    }

    return new Intl.DateTimeFormat(
      'es-AR'
    ).format(
      new Date(
        `${valor}T12:00:00`
      )
    )
  }

  function claseMovimiento(
    tipo:
      Movimiento['tipo']
  ) {
    if (
      tipo === 'Ingreso' ||
      tipo ===
        'Ajuste positivo'
    ) {
      return {
        badge:
          'border-emerald-200 bg-emerald-50 text-emerald-700',

        cantidad:
          'text-emerald-700',

        signo: '+',
      }
    }

    if (
      tipo === 'Salida'
    ) {
      return {
        badge:
          'border-blue-200 bg-blue-50 text-blue-700',

        cantidad:
          'text-zinc-950',

        signo: '-',
      }
    }

    return {
      badge:
        'border-amber-200 bg-amber-50 text-amber-700',

      cantidad:
        'text-amber-700',

      signo: '-',
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f6f7]">

      <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-8">

        {/* VOLVER */}

        <Link
          href="/stock"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
        >
          <span>
            ←
          </span>

          Volver a Stock
        </Link>

        {/* CABECERA */}

        <div className="mt-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">

          <div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Trazabilidad
            </p>

            <div className="flex flex-wrap items-center gap-3">

              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                {
                  lote.codigo_lote
                }
              </h1>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                  lote.estado ===
                  'Activo'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-zinc-200 bg-zinc-100 text-zinc-600'
                }`}
              >
                {
                  lote.estado
                }
              </span>

            </div>

            <p className="mt-2 text-sm text-zinc-600">
              {genetica?.nombre ||
                'Genética sin identificar'}
            </p>

          </div>

        </div>

        {/* RESUMEN */}

        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <Tarjeta
            titulo="Existencia actual"
            valor={`${cantidad(
              existenciaActual
            )} g`}
            descripcion="Saldo calculado por movimientos"
            destacada
          />

          <Tarjeta
            titulo="Ingreso inicial"
            valor={
              ingresoInicial
                ? `${cantidad(
                    ingresoInicial.cantidad
                  )} g`
                : '0 g'
            }
            descripcion="Cantidad con la que nació el lote"
          />

          <Tarjeta
            titulo="Fecha de cosecha"
            valor={fecha(
              lote.fecha_cosecha
            )}
            descripcion="Origen del lote"
          />

          <Tarjeta
            titulo="Movimientos"
            valor={String(
              listaMovimientos.length
            )}
            descripcion="Registros asociados al lote"
          />

        </div>

        {/* CONTENIDO */}

        <div className="mt-6 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">

          {/* INFORMACION DEL LOTE */}

          <div className="space-y-6">

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">

              <h2 className="text-base font-semibold text-zinc-950">
                Información del lote
              </h2>

              <p className="mt-1 text-sm text-zinc-600">
                Datos principales de esta partida.
              </p>

              <div className="mt-5 space-y-4">

                <Dato
                  titulo="Código"
                  valor={
                    lote.codigo_lote
                  }
                />

                <Dato
                  titulo="Genética"
                  valor={
                    genetica?.nombre ||
                    '—'
                  }
                />

                <Dato
                  titulo="Fecha de ingreso"
                  valor={fecha(
                    lote.fecha_ingreso
                  )}
                />

                <Dato
                  titulo="Fecha de cosecha"
                  valor={fecha(
                    lote.fecha_cosecha
                  )}
                />

                <Dato
                  titulo="Estado"
                  valor={
                    lote.estado
                  }
                />

              </div>

            </section>

            {/* OBSERVACIONES */}

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">

              <h2 className="text-base font-semibold text-zinc-950">
                Observaciones
              </h2>

              {lote.observaciones ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                  {
                    lote.observaciones
                  }
                </p>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">
                  Sin observaciones registradas.
                </p>
              )}

            </section>

          </div>

          {/* MOVIMIENTOS */}

          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

            <div className="border-b border-zinc-200 px-5 py-5">

              <h2 className="text-base font-semibold text-zinc-950">
                Movimientos del lote
              </h2>

              <p className="mt-1 text-sm text-zinc-600">
                Historial completo de ingresos, salidas y ajustes.
              </p>

            </div>

            {movimientosRecientes.length ===
            0 ? (

              <div className="px-6 py-16 text-center">

                <p className="font-semibold text-zinc-900">
                  No hay movimientos
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Este lote todavía no registra movimientos.
                </p>

              </div>

            ) : (

              <div className="divide-y divide-zinc-100">

                {movimientosRecientes.map(
                  (
                    movimiento
                  ) => {
                    const estilo =
                      claseMovimiento(
                        movimiento.tipo
                      )

                    return (
                      <div
                        key={
                          movimiento.id
                        }
                        className="flex flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center"
                      >

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${estilo.badge}`}
                            >
                              {
                                movimiento.tipo
                              }
                            </span>

                            <p className="text-sm font-semibold text-zinc-950">
                              {movimiento.motivo ||
                                movimiento.tipo}
                            </p>

                          </div>

                          <p className="mt-2 text-xs text-zinc-500">
                            {fecha(
                              movimiento.fecha
                            )}
                          </p>

                          {movimiento.observaciones && (

                            <p className="mt-2 max-w-2xl text-sm leading-5 text-zinc-600">
                              {
                                movimiento.observaciones
                              }
                            </p>

                          )}

                        </div>

                        <div className="text-left sm:text-right">

                          <p
                            className={`text-lg font-semibold ${estilo.cantidad}`}
                          >
                            {
                              estilo.signo
                            }
                            {cantidad(
                              movimiento.cantidad
                            )}{' '}
                            g
                          </p>

                        </div>

                      </div>
                    )
                  }
                )}

              </div>

            )}

            {/* SALDO */}

            <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-5 py-4">

              <p className="text-sm font-semibold text-zinc-700">
                Existencia actual
              </p>

              <p className="text-lg font-semibold text-zinc-950">
                {cantidad(
                  existenciaActual
                )}{' '}
                g
              </p>

            </div>

          </section>

        </div>

      </div>

    </main>
  )
}

function Tarjeta({
  titulo,
  valor,
  descripcion,
  destacada = false,
}: {
  titulo: string
  valor: string
  descripcion: string
  destacada?: boolean
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3.5 shadow-sm ${
        destacada
          ? 'border-emerald-200 bg-emerald-50/60'
          : 'border-zinc-200 bg-white'
      }`}
    >

      <div className="mb-2.5 h-[3px] w-6 rounded-full bg-emerald-600" />

      <p className="text-[13px] font-semibold text-zinc-800">
        {titulo}
      </p>

      <p
        className={`mt-1.5 text-2xl font-semibold tracking-tight ${
          destacada
            ? 'text-emerald-800'
            : 'text-zinc-950'
        }`}
      >
        {valor}
      </p>

      <p className="mt-1 text-[11px] leading-4 text-zinc-500">
        {descripcion}
      </p>

    </div>
  )
}

function Dato({
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