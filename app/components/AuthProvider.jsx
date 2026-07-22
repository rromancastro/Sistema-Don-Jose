"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "../lib/firebase"
import { LoginComponent } from "./LoginComponent"

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [usuario, setUsuario] = useState(null)
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        const cancelarSuscripcion = onAuthStateChanged(auth, (usuarioActual) => {
            setUsuario(usuarioActual)
            setCargando(false)
        })

        return cancelarSuscripcion
    }, [])

    const valor = useMemo(() => ({
        usuario,
        cerrarSesion: () => signOut(auth),
    }), [usuario])

    if (cargando) {
        return (
            <main className="authLoading">
                <p>Cargando sesion...</p>
            </main>
        )
    }

    return (
        <AuthContext.Provider value={valor}>
            {usuario ? children : <LoginComponent />}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const contexto = useContext(AuthContext)

    if (!contexto) {
        throw new Error("useAuth debe usarse dentro de AuthProvider")
    }

    return contexto
}
