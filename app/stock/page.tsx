import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StockClient from './stock-client'

export default async function StockPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: geneticas, error: geneticasError } =
    await supabase
      .from('geneticas')
      .select('*')
      .order('nombre', {
        ascending: true,
      })

  const { data: lotes, error: lotesError } =
    await supabase
      .from('lotes')
      .select(`
        *,
        geneticas (
          id,
          nombre,
          activa
        )
      `)
      .order('created_at', {
        ascending: false,
      })

  const {
    data: movimientos,
    error: movimientosError,
  } = await supabase
    .from('movimientos_stock')
    .select(`
      *,
      lotes (
        id,
        codigo_lote,
        genetica_id,
        geneticas (
          id,
          nombre
        )
      )
    `)
    .order('created_at', {
      ascending: false,
    })

  if (
    geneticasError ||
    lotesError ||
    movimientosError
  ) {
    console.error({
      geneticasError,
      lotesError,
      movimientosError,
    })
  }

  return (
    <StockClient
      geneticas={geneticas ?? []}
      lotes={lotes ?? []}
      movimientos={movimientos ?? []}
    />
  )
}