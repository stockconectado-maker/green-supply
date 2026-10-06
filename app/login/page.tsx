'use client'

import Image from 'next/image'
import { useActionState, useState } from 'react'
import {
  ingresar,
  solicitarActivacion,
  type LoginState,
} from './actions'

const usuarios = [
  {
    id: 'morpheus',
    inicial: 'S',
    nombre: 'Sebastián',
  },
  {
    id: 'neo',
    inicial: 'G',
    nombre: 'Gonzalo',
  },
  {
    id: 'tank',
    inicial: 'M',
    nombre: 'Máximo',
  },
]

const estadoInicial: LoginState = {
  error: '',
  mensaje: '',
}

export default function LoginPage() {
  const [
    seleccionado,
    setSeleccionado,
  ] = useState('')

  const [
    mostrarRecuperacion,
    setMostrarRecuperacion,
  ] = useState(false)

  const [
    estadoLogin,
    accionLogin,
    entrando,
  ] = useActionState(
    ingresar,
    estadoInicial
  )

  const [
    estadoRecuperacion,
    accionRecuperacion,
    enviando,
  ] = useActionState(
    solicitarActivacion,
    estadoInicial
  )

  const usuario =
    usuarios.find(
      (item) =>
        item.id ===
        seleccionado
    )

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6f7] px-4 py-8 sm:py-10">

      <div className="w-full max-w-[440px]">

        {/* LOGO */}

        <div className="mb-7 flex justify-center sm:mb-9">

          <Image
            src="/green-supply-logo.png"
            alt="Green Supply"
            width={881}
            height={338}
            priority
            className="h-auto w-full max-w-[245px] object-contain sm:max-w-[275px]"
          />

        </div>

        {/* LOGIN */}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

          <div className="px-5 pb-7 pt-7 sm:px-9 sm:pb-8 sm:pt-8">

            <div className="text-center">

              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                Acceso privado
              </p>

              <h1 className="text-[23px] font-semibold tracking-tight text-zinc-950">

                {mostrarRecuperacion
                  ? 'Recuperar contraseña'
                  : 'Bienvenido'}

              </h1>

              <p className="mt-2 text-sm leading-5 text-zinc-500">

                {mostrarRecuperacion
                  ? 'Seleccioná tu usuario para recibir un correo de recuperación.'
                  : 'Seleccioná tu usuario para ingresar.'}

              </p>

            </div>

            {/* USUARIOS */}

            <div className="mt-7 grid grid-cols-3 gap-2.5 sm:mt-8 sm:gap-3">

              {usuarios.map(
                (item) => {

                  const activo =
                    seleccionado ===
                    item.id

                  return (
                    <button
                      key={
                        item.id
                      }
                      type="button"
                      aria-pressed={
                        activo
                      }
                      onClick={() =>
                        setSeleccionado(
                          item.id
                        )
                      }
                      className={`flex min-w-0 flex-col items-center rounded-xl border px-2 py-4 transition sm:py-5 ${
                        activo
                          ? 'border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50'
                      }`}
                    >

                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold sm:h-14 sm:w-14 sm:text-xl ${
                          activo
                            ? 'bg-emerald-700 text-white'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {
                          item.inicial
                        }
                      </div>

                      <span className="mt-2.5 truncate text-[11px] font-semibold text-zinc-700 sm:mt-3 sm:text-xs">

                        {
                          item.nombre
                        }

                      </span>

                    </button>
                  )
                }
              )}

            </div>

            {mostrarRecuperacion ? (

              /* RECUPERAR CONTRASEÑA */

              <form
                action={
                  accionRecuperacion
                }
                className="mt-7 sm:mt-8"
              >

                <input
                  type="hidden"
                  name="alias"
                  value={
                    seleccionado
                  }
                />

                {usuario && (
                  <p className="mb-4 text-center text-sm text-zinc-600">

                    Usuario seleccionado:{' '}

                    <strong>
                      {
                        usuario.nombre
                      }
                    </strong>

                  </p>
                )}

                {estadoRecuperacion.error && (
                  <p
                    role="alert"
                    className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {
                      estadoRecuperacion.error
                    }
                  </p>
                )}

                {estadoRecuperacion.mensaje && (
                  <p
                    role="status"
                    className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
                  >
                    {
                      estadoRecuperacion.mensaje
                    }
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    !seleccionado ||
                    enviando
                  }
                  className="w-full rounded-xl bg-zinc-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-40"
                >

                  {enviando
                    ? 'Enviando...'
                    : 'Enviar correo de recuperación'}

                </button>

                <button
                  type="button"
                  onClick={() =>
                    setMostrarRecuperacion(
                      false
                    )
                  }
                  className="mt-5 w-full text-center text-xs font-semibold text-zinc-500 transition hover:text-zinc-900"
                >
                  Volver al inicio de sesión
                </button>

              </form>

            ) : (

              /* LOGIN */

              <form
                action={
                  accionLogin
                }
                className="mt-7 sm:mt-8"
              >

                <input
                  type="hidden"
                  name="alias"
                  value={
                    seleccionado
                  }
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
                  disabled={
                    !seleccionado ||
                    entrando
                  }
                  placeholder={
                    seleccionado
                      ? 'Ingresá tu contraseña'
                      : 'Seleccioná un usuario'
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50 disabled:opacity-60"
                />

                {estadoLogin.error && (
                  <p
                    role="alert"
                    className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700"
                  >
                    {
                      estadoLogin.error
                    }
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    !seleccionado ||
                    entrando
                  }
                  className="mt-5 w-full rounded-xl bg-zinc-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-40"
                >

                  {entrando
                    ? 'Ingresando...'
                    : 'Ingresar'}

                </button>

                <button
                  type="button"
                  onClick={() =>
                    setMostrarRecuperacion(
                      true
                    )
                  }
                  className="mt-5 w-full text-center text-xs font-medium text-zinc-500 transition hover:text-emerald-700"
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