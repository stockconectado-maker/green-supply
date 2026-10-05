import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FichaAsociadoClient from './ficha-client'

export default async function FichaAsociadoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const asociadoId = Number(id)

  if (!Number.isInteger(asociadoId)) {
    notFound()
  }

  const { data: asociado, error } = await supabase
    .from('asociados')
    .select('*')
    .eq('id', asociadoId)
    .single()

  if (error || !asociado) {
    notFound()
  }

  return <FichaAsociadoClient asociado={asociado} />
}