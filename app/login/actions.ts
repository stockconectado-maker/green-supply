
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type LoginState = {
  error: string
  mensaje: string
}

const correos: Record<string, string | undefined> = {
  morpheus: process.env.GS_LOGIN_MORPHEUS_EMAIL,
  neo: process.env.GS_LOGIN_NEO_EMAIL,
  tank: process.env.GS_LOGIN_TANK_EMAIL,
}

const usuariosValidos = ['morpheus', 'neo', 'tank']

function obtenerCorreo(alias: string) {
  return correos[alias]?.trim().toLowerCase()
}

export async function ingresar(
  _prev: LoginState,
  form: FormData
): Promise<LoginState> {
  const alias = String(form.get('alias') ?? '')
    .trim()
    .toLowerCase()

  const password = String(form.get('password') ?? '')

  if (!usuariosValidos.includes(alias)) {
    return {
      error: 'Seleccioná un usuario.',
      mensaje: '',
    }
  }

  const email = obtenerCorreo(alias)

  if (!email) {
    return {
      error: 'Este usuario no tiene su correo configurado.',
      mensaje: '',
    }
  }

  if (!password) {
    return {
      error: 'Ingresá tu contraseña.',
      mensaje: '',
    }
  }

  const supabase = await createClient()

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    })

  if (error) {
    return {
      error: 'No se pudo ingresar. Revisá tu contraseña.',
      mensaje: '',
    }
  }

  redirect('/')
}

export async function solicitarActivacion(
  _prev: LoginState,
  form: FormData
): Promise<LoginState> {
  const alias = String(form.get('alias') ?? '')
    .trim()
    .toLowerCase()

  if (!usuariosValidos.includes(alias)) {
    return {
      error: 'Seleccioná un usuario primero.',
      mensaje: '',
    }
  }

  const email = obtenerCorreo(alias)

  if (!email) {
    return {
      error: 'Falta configurar el correo de este usuario.',
      mensaje: '',
    }
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')

  if (!siteUrl) {
    return {
      error: 'Falta configurar NEXT_PUBLIC_SITE_URL.',
      mensaje: '',
    }
  }

  const supabase = await createClient()

  const { error } =
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/establecer-clave`,
    })

  if (error) {
    console.error(
      'Error al solicitar recuperación:',
      error.message
    )

    return {
      error: 'No se pudo solicitar el correo. Intentá nuevamente.',
      mensaje: '',
    }
  }

  return {
    error: '',
    mensaje:
      'Si la cuenta está habilitada, recibirás un correo de recuperación. Revisá también spam.',
  }
}
