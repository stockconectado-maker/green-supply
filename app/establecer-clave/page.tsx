'use client'

import Image from 'next/image'
import { useActionState } from 'react'
import { guardarClave, type ClaveState } from './actions'

const inicial: ClaveState = { error: '' }

export default function EstablecerClavePage() {
  const [estado, accion, pendiente] = useActionState(guardarClave, inicial)

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6f7] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <Image src="/logo-green-supply.png" alt="Green Supply" width={250} height={100}
            className="h-auto max-h-24 w-auto object-contain" />
        </div>
        <section className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Acceso privado</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-950">Crear contraseña</h1>
          <p className="mt-2 text-sm text-zinc-500">Elegí una clave personal de al menos 12 caracteres.</p>
          <form action={accion} className="mt-6 space-y-4">
            <div>
              <label htmlFor="clave" className="mb-1.5 block text-sm font-medium">Nueva contraseña</label>
              <input id="clave" name="password" type="password" autoComplete="new-password" required minLength={12}
                className="w-full rounded-xl border border-zinc-200 p-3 outline-none focus:border-emerald-600" />
            </div>
            <div>
              <label htmlFor="confirmacion" className="mb-1.5 block text-sm font-medium">Repetir contraseña</label>
              <input id="confirmacion" name="confirmacion" type="password" autoComplete="new-password" required minLength={12}
                className="w-full rounded-xl border border-zinc-200 p-3 outline-none focus:border-emerald-600" />
            </div>
            {estado.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
            <button disabled={pendiente} type="submit"
              className="w-full rounded-xl bg-zinc-950 p-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-40">
              {pendiente ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
