"use client"

import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { FiLock, FiLogIn, FiMail } from "react-icons/fi"
import Image from "next/image"
import { auth } from "../lib/firebase"

const MENSAJES_ERROR = {
    "auth/invalid-credential": "El correo o la contrasena no son correctos.",
    "auth/invalid-email": "Ingresa un correo valido.",
    "auth/missing-password": "Ingresa tu contrasena.",
    "auth/too-many-requests": "Demasiados intentos. Intenta de nuevo mas tarde.",
    "auth/user-disabled": "Este usuario esta deshabilitado.",
}

export const LoginComponent = () => {
    const [correo, setCorreo] = useState("")
    const [contrasena, setContrasena] = useState("")
    const [error, setError] = useState("")
    const [enviando, setEnviando] = useState(false)

    const iniciarSesion = async (event) => {
        event.preventDefault()
        setError("")
        setEnviando(true)

        try {
            await signInWithEmailAndPassword(auth, correo.trim(), contrasena)
        } catch (firebaseError) {
            setError(MENSAJES_ERROR[firebaseError.code] || "No se pudo iniciar sesion.")
        } finally {
            setEnviando(false)
        }
    }

    return (
        <main className="loginPage">
            <section className="loginPanel">
                <Image src="/logo-blanco.png" alt="Don Jose" width={90} height={68} priority />
                <div>
                    <p>Control de Negocio</p>
                    <h1>Iniciar sesion</h1>
                </div>

                <form onSubmit={iniciarSesion} className="loginForm">
                    <label>
                        <span>Correo</span>
                        <div>
                            <FiMail />
                            <input
                                type="email"
                                value={correo}
                                onChange={(event) => setCorreo(event.target.value)}
                                autoComplete="email"
                                placeholder="correo@ejemplo.com"
                                required
                            />
                        </div>
                    </label>

                    <label>
                        <span>Contrasena</span>
                        <div>
                            <FiLock />
                            <input
                                type="password"
                                value={contrasena}
                                onChange={(event) => setContrasena(event.target.value)}
                                autoComplete="current-password"
                                placeholder="Tu contrasena"
                                required
                            />
                        </div>
                    </label>

                    {error && <p className="loginError">{error}</p>}

                    <button type="submit" disabled={enviando}>
                        <FiLogIn />
                        {enviando ? "Ingresando..." : "Ingresar"}
                    </button>
                </form>
            </section>
        </main>
    )
}
