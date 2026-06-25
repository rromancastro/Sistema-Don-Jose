"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa"
import { FiSearch } from "react-icons/fi"
import { GoPencil, GoTrash } from "react-icons/go"
import { AiOutlinePlus } from "react-icons/ai"
import { actualizarDocumento, crearDocumento, eliminarDocumento, obtenerDocumentos } from "../lib/firebase"
import { NavComponent } from "./NavComponent"

const clienteVacio = {
    nombre: "",
    telefono: "",
    email: "",
}

const formatearDinero = (valor) => `$${Number(valor || 0).toLocaleString("es-AR")}`

export const ClientesComponent = () => {
    const [clientes, setClientes] = useState([])
    const [busqueda, setBusqueda] = useState("")
    const [creandoCliente, setCreandoCliente] = useState(false)
    const [clienteEditandoId, setClienteEditandoId] = useState(null)
    const [clienteConfirmandoId, setClienteConfirmandoId] = useState(null)
    const [nuevoCliente, setNuevoCliente] = useState(clienteVacio)
    const [clienteEditado, setClienteEditado] = useState(clienteVacio)

    useEffect(() => {
        const cargarClientes = async () => {
            const data = await obtenerDocumentos("clientes")
            setClientes(data)
        }

        cargarClientes()
    }, [])

    const clientesFiltrados = useMemo(() => {
        const textoBusqueda = busqueda.trim().toLowerCase()

        if (!textoBusqueda) return clientes

        return clientes.filter((cliente) => {
            const nombre = String(cliente.nombre || "").toLowerCase()
            const telefono = String(cliente.telefono || cliente.contacto || "").toLowerCase()
            const email = String(cliente.email || "").toLowerCase()

            return nombre.includes(textoBusqueda) || telefono.includes(textoBusqueda) || email.includes(textoBusqueda)
        })
    }, [clientes, busqueda])

    const abrirCrearCliente = () => {
        setCreandoCliente(true)
        setClienteEditandoId(null)
        setClienteConfirmandoId(null)
    }

    const cancelarCrearCliente = () => {
        setCreandoCliente(false)
        setNuevoCliente(clienteVacio)
    }

    const guardarNuevoCliente = async () => {
        const clienteParaCrear = {
            nombre: nuevoCliente.nombre,
            telefono: nuevoCliente.telefono,
            email: nuevoCliente.email,
            ventas: 0,
            facturacion: 0,
            ganancia: 0,
        }

        const id = await crearDocumento("clientes", clienteParaCrear)

        setClientes((clientesActuales) => [
            {
                id,
                ...clienteParaCrear,
            },
            ...clientesActuales,
        ])

        cancelarCrearCliente()
    }

    const editarCliente = (cliente) => {
        setCreandoCliente(false)
        setClienteEditandoId(cliente.id)
        setClienteConfirmandoId(null)
        setClienteEditado({
            nombre: cliente.nombre || "",
            telefono: cliente.telefono || cliente.contacto || "",
            email: cliente.email || "",
        })
    }

    const cancelarEdicion = () => {
        setClienteEditandoId(null)
        setClienteEditado(clienteVacio)
    }

    const guardarCliente = async (clienteId) => {
        const clienteActualizado = {
            nombre: clienteEditado.nombre,
            telefono: clienteEditado.telefono,
            email: clienteEditado.email,
        }

        await actualizarDocumento("clientes", clienteId, clienteActualizado)

        setClientes((clientesActuales) => clientesActuales.map((cliente) => {
            if (cliente.id !== clienteId) return cliente

            return {
                ...cliente,
                ...clienteActualizado,
            }
        }))

        cancelarEdicion()
    }

    const borrarCliente = async (cliente) => {
        await eliminarDocumento("clientes", cliente.id)
        setClientes((clientesActuales) => clientesActuales.filter((clienteActual) => clienteActual.id !== cliente.id))
        setClienteConfirmandoId(null)

        if (clienteEditandoId === cliente.id) {
            cancelarEdicion()
        }
    }

    return <section>
        <NavComponent bgColor="#00A63E" >
            <Link href={'/'}>
                <FaArrowLeft />
            </Link>
            <h1>Clientes</h1>
            <AiOutlinePlus color="#00A63E" onClick={abrirCrearCliente} />
        </NavComponent>

        <div id="clientesContainer">
            <div className="clienteSearch">
                <FiSearch />
                <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar cliente..."
                    aria-label="Buscar cliente"
                />
            </div>

            {
                creandoCliente && (
                    <article className="clienteCard clienteCardEditando bdRadius">
                        <form className="clienteEditForm" onSubmit={(e) => {
                            e.preventDefault()
                            guardarNuevoCliente()
                        }}>
                            <input
                                type="text"
                                value={nuevoCliente.nombre}
                                onChange={(e) => setNuevoCliente((clienteActual) => ({
                                    ...clienteActual,
                                    nombre: e.target.value,
                                }))}
                                placeholder="Nombre del cliente"
                                aria-label="Nombre del cliente"
                            />
                            <input
                                type="text"
                                value={nuevoCliente.telefono}
                                onChange={(e) => setNuevoCliente((clienteActual) => ({
                                    ...clienteActual,
                                    telefono: e.target.value,
                                }))}
                                placeholder="Telefono"
                                aria-label="Telefono del cliente"
                            />
                            <input
                                type="email"
                                value={nuevoCliente.email}
                                onChange={(e) => setNuevoCliente((clienteActual) => ({
                                    ...clienteActual,
                                    email: e.target.value,
                                }))}
                                placeholder="Email"
                                aria-label="Email del cliente"
                            />
                            <div className="clienteEditActions">
                                <button type="submit">
                                    <FaCheck />
                                    Guardar
                                </button>
                                <button type="button" onClick={cancelarCrearCliente}>
                                    <FaTimes />
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </article>
                )
            }

            {
                clientesFiltrados.map((cliente) => (
                    <article key={cliente.id} className={`clienteCard bdRadius ${clienteEditandoId === cliente.id ? "clienteCardEditando" : ""} ${clienteConfirmandoId === cliente.id ? "clienteCardConfirmando" : ""}`}>
                        {
                            clienteEditandoId === cliente.id ? (
                                <form className="clienteEditForm" onSubmit={(e) => {
                                    e.preventDefault()
                                    guardarCliente(cliente.id)
                                }}>
                                    <input
                                        type="text"
                                        value={clienteEditado.nombre}
                                        onChange={(e) => setClienteEditado((clienteActual) => ({
                                            ...clienteActual,
                                            nombre: e.target.value,
                                        }))}
                                        aria-label="Nombre del cliente"
                                    />
                                    <input
                                        type="text"
                                        value={clienteEditado.telefono}
                                        onChange={(e) => setClienteEditado((clienteActual) => ({
                                            ...clienteActual,
                                            telefono: e.target.value,
                                        }))}
                                        aria-label="Telefono del cliente"
                                    />
                                    <input
                                        type="email"
                                        value={clienteEditado.email}
                                        onChange={(e) => setClienteEditado((clienteActual) => ({
                                            ...clienteActual,
                                            email: e.target.value,
                                        }))}
                                        aria-label="Email del cliente"
                                    />
                                    <div className="clienteEditActions">
                                        <button type="submit">
                                            <FaCheck />
                                            Guardar
                                        </button>
                                        <button type="button" onClick={cancelarEdicion}>
                                            <FaTimes />
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                            ) : clienteConfirmandoId === cliente.id ? (
                                <div className="clienteDeleteConfirm">
                                    <p>Esta seguro que desea eliminar a {cliente.nombre}?</p>
                                    <div className="clienteDeleteActions">
                                        <button type="button" onClick={() => borrarCliente(cliente)}>
                                            <GoTrash />
                                            Eliminar
                                        </button>
                                        <button type="button" onClick={() => setClienteConfirmandoId(null)}>
                                            <FaTimes />
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p>{cliente.nombre}</p>
                                    <p>{cliente.telefono ? cliente.telefono : ""} - {cliente.email ? cliente.email : ""}</p>
                                    <div className="clienteStats">
                                        <p>Ventas <span>{Number(cliente.ventas || 0)}</span></p>
                                        <p>Facturacion <span>{formatearDinero(cliente.facturacion)}</span></p>
                                        <p>Ganancia <span>{formatearDinero(cliente.ganancia)}</span></p>
                                    </div>
                                    <div className="clienteActions">
                                        <button type="button" onClick={() => editarCliente(cliente)} aria-label={`Editar ${cliente.nombre}`}>
                                            <GoPencil />
                                        </button>
                                        <button type="button" onClick={() => setClienteConfirmandoId(cliente.id)} aria-label={`Eliminar ${cliente.nombre}`}>
                                            <GoTrash />
                                        </button>
                                    </div>
                                </>
                            )
                        }
                    </article>
                ))
            }
        </div>
    </section>
}
