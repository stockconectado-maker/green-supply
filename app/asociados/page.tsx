import { createClient } from '@/lib/supabase/server'
import AsociadosClient from './asociados-client'

export default async function AsociadosPage() {
  const supabase = await createClient()

  const { data: asociados, error } =
    await supabase
      .from('asociados')
      .select('*')
      .order('created_at', {
        ascending: false,
      })

  if (error) {
    console.error(
      'Error cargando asociados:',
      error
    )
  }

  return (
    <AsociadosClient
      asociados={asociados ?? []}
    />
  )
}