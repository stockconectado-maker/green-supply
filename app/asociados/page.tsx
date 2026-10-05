import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AsociadosClient from './asociados-client'

export default async function AsociadosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: asociados, error } = await supabase
    .from('asociados')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
  }

  return <AsociadosClient asociados={asociados ?? []} />
}