'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type ClaveState = { error: string }

export async function guardarClave(
  _prev: ClaveState,
  form: FormData
): Promise<ClaveState> {
  const clave = String(form.get('password') ?? '')
  const repetir = String(form.get('confirmacion') ?? '')

  if (clave.length < 12) return { error: 'Usá al menos 12 caracteres.' }
  if (clave !== repetir) return { error: 'Las contraseñas no coinciden.' }

  const supabase = await createClient()
  const { data: { user }, error: usuarioError } = await supabase.auth.getUser()
  if (usuarioError || !user?.email) return { error: 'Tu enlace venció. Solicitá uno nuevo desde el login.' }

  const permitidos = [
    process.env.GS_LOGIN_MORPHEUS_EMAIL,
    process.env.GS_LOGIN_NEO_EMAIL,
    process.env.GS_LOGIN_TANK_EMAIL,
  ].filter(Boolean).map((email) => email!.trim().toLowerCase())

  if (!permitidos.includes(user.email.toLowerCase())) {
    await supabase.auth.signOut()
    return { error: 'Esta cuenta no está autorizada.' }
  }

  const { error } = await supabase.auth.updateUser({ password: clave })
  if (error) return { error: 'No se pudo guardar la contraseña. Intentá nuevamente.' }

  await supabase.auth.signOut()
  redirect('/login?activada=1')
}
