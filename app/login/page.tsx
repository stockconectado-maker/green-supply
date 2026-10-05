
'use client'

import Image from 'next/image'
import { useActionState, useState } from 'react'
import {
  ingresar,
  solicitarActivacion,
  type LoginState,
} from './actions'

const usuarios = [
  { id: 'morpheus', inicial: 'S', nombre: 'Sebastián' },
  { id: 'neo', inicial: 'G', nombre: 'Gonzalo' },
  { id: 'tank', inicial: 'M', nombre: 'Máximo' },
]

const estadoInicial: LoginState = {
  error: '',
  mensaje: '',
}

export default function LoginPage() {
  const [seleccionado, setSeleccionado] = useState('')
  const [mostrarRecuperacion, setMostrarRecuperacion] = useState(false)

  const [estadoLogin, accionLogin, entrando] =
    useActionState(ingresar, estadoInicial)

  const [estadoRecuperacion, accionRecuperacion, enviando] =
    useActionState(solicitarActivacion, estadoInicial)

  const usuario = usuarios.find(
    (item) => item.id === seleccionado
  )

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6f7] px-4 py-10">
      <div className="w-full max-w-[440px]">

        <div className="mb-9 flex justify-center">
          <Image
            src="/logo-green-supply.png"
            alt="Green Supply"
            width={260}
            height={110}
            priority
            className="h-auto max-h-28 w-auto max-w-[260px] object-contain"
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="px-7 pb-8 pt-8 sm:px-9">

            <div className="text-center">
              <h1 className="text-[23px] font-semibold tracking-tight text-zinc-950">
                {mostrarRecuperacion
                  ? 'Recuperar contraseña'
                  : 'Bienvenido'}
              </h1>

              <p className="mt-2 text-sm text-zinc-500">
                {mostrarRecuperacion
                  ? 'Seleccioná tu usuario para recibir un correo de recuperación.'
                  : 'Seleccioná tu usuario para ingresar.'}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {usuarios.map((item) => {
                const activo = seleccionado === item.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setSeleccionado(item.id)}
                    className={`flex min-w-0 flex-col items-center rounded-xl border px-2 py-5 transition ${
                      activo
                        ? 'border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50'
                    }`}
                  >
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold ${
                        activo
                          ? 'bg-emerald-700 text-white'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {item.inicial}
                    </div>

                    <span className="mt-3 text-xs font-semibold text-zinc-700">
                      {item.nombre}
                    </span>
                  </button>
                )
              })}
            </div>

            {mostrarRecuperacion ? (
              <form
                action={accionRecuperacion}
                className="mt-8"
              >
                <input
                  type="hidden"
                  name="alias"
                  value={seleccionado}
                />

                {usuario && (
                  <p className="mb-4 text-center text-sm text-zinc-600">
                    Usuario seleccionado:{' '}
                    <strong>{usuario.nombre}</strong>
                  </p>
                )}

                {estadoRecuperacion.error && (
                  <p
                    role="alert"
                    className="mb-4 text-sm text-red-700"
                  >
                    {estadoRecuperacion.error}
                  </p>
                )}

                {estadoRecuperacion.mensaje && (
                  <p
                    role="status"
                    className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
                  >
                    {estadoRecuperacion.mensaje}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!seleccionado || enviando}
                  className="w-full rounded-xl bg-zinc-950 px-5 py-3.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
                >
                  {enviando
                    ? 'Enviando...'
                    : 'Enviar correo de recuperación'}
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarRecuperacion(false)}
                  className="mt-5 w-full text-center text-xs font-semibold text-zinc-500 hover:text-zinc-900"
                >
                  Volver al inicio de sesión
                </button>
              </form>
            ) : (
              <form
                action={accionLogin}
                className="mt-8"
              >
                <input
                  type="hidden"
                  name="alias"
                  value={seleccionado}
                />

                <label
                  htmlFor="password"
                  className="mb-2 block text-xs font-semibold text-zinc-700"
                >
                  Contraseña
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  disabled={!seleccionado || entrando}
                  placeholder={
                    seleccionado
                      ? 'Ingresá tu contraseña'
                      : 'Seleccioná un usuario'
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-sm outline-none focus:border-emerald-600 disabled:opacity-60"
                />

                {estadoLogin.error && (
                  <p
                    role="alert"
                    className="mt-4 text-xs text-red-700"
                  >
                    {estadoLogin.error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!seleccionado || entrando}
                  className="mt-5 w-full rounded-xl bg-zinc-950 px-5 py-3.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
                >
                  {entrando ? 'Ingresando...' : 'Ingresar'}
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarRecuperacion(true)}
                  className="mt-5 w-full text-center text-xs font-medium text-zinc-500 hover:text-emerald-700"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </form>
            )}

          </div>

          <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-4 text-center">
            <p className="text-[11px] font-medium text-zinc-400">
              Acceso exclusivo para usuarios autorizados
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
