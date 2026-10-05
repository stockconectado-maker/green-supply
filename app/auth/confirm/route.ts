import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const tipo = request.nextUrl.searchParams.get('type')
  const destino = new URL('/login', request.url)

  if (!tokenHash || (tipo !== 'invite' && tipo !== 'recovery')) {
    destino.searchParams.set('error', 'enlace')
    return NextResponse.redirect(destino)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: tipo,
  })

  if (error) {
    destino.searchParams.set('error', 'enlace')
    return NextResponse.redirect(destino)
  }

  return NextResponse.redirect(new URL('/establecer-clave', request.url))
}
