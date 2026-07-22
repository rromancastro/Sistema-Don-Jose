"use client"

import { FiLogOut } from "react-icons/fi"
import { useAuth } from "./AuthProvider"

export const NavComponent = ({main = false, children, bgColor = "#fff"}) => {
    const { cerrarSesion } = useAuth()

    return <nav style={{backgroundColor: bgColor}} className={main ? "main-nav" : ""}>
        {children}
        <button type="button" className="navLogoutButton" onClick={cerrarSesion} aria-label="Cerrar sesion">
            <FiLogOut />
        </button>
    </nav>
}
