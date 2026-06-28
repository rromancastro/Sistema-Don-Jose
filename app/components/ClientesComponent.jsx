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
const formatearMetodoPago = (metodo) => metodo === "transferencia" ? "Transferencia" : "Efectivo"
const formatearEstadoPago = (estado) => estado === "incompleto" ? "Incompleto" : "Completo"

export const ClientesComponent = () => {
    const [clientes, setClientes] = useState([])
    const [comprobantesVenta, setComprobantesVenta] = useState([])
    const [busqueda, setBusqueda] = useState("")
    const [creandoCliente, setCreandoCliente] = useState(false)
    const [clienteEditandoId, setClienteEditandoId] = useState(null)
    const [clienteConfirmandoId, setClienteConfirmandoId] = useState(null)
    const [clienteAbiertoId, setClienteAbiertoId] = useState(null)
    const [nuevoCliente, setNuevoCliente] = useState(clienteVacio)
    const [clienteEditado, setClienteEditado] = useState(clienteVacio)

    useEffect(() => {
        const cargarClientes = async () => {
            const [clientesData, comprobantesData] = await Promise.all([
                obtenerDocumentos("clientes"),
                obtenerDocumentos("comprobantes_venta"),
            ])

            setClientes(clientesData)
            setComprobantesVenta(comprobantesData)
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
            deuda: 0,
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
        setClienteAbiertoId(null)
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

    const obtenerVentasCliente = (clienteId) => {
        return comprobantesVenta
            .filter((comprobante) => comprobante.cliente?.id === clienteId || comprobante.cliente_id === clienteId)
            .sort((a, b) => String(b.fecha_hora || "").localeCompare(String(a.fecha_hora || "")))
    }

    const alternarCliente = (clienteId) => {
        setClienteAbiertoId((clienteActual) => clienteActual === clienteId ? null : clienteId)
    }

    const completarPago = async (cliente, venta) => {
        const deudaVenta = Number(venta.monto_debe || venta.pago?.monto_debe || 0)

        if (deudaVenta <= 0) return

        const pagoActualizado = {
            ...(venta.pago || {}),
            estado: "completo",
            estado_label: "Completo",
            metodo: venta.metodo_pago || venta.pago?.metodo || "efectivo",
            metodo_label: formatearMetodoPago(venta.metodo_pago || venta.pago?.metodo),
            monto_debe: 0,
            monto_pagado: Number(venta.total || 0),
            total: Number(venta.total || 0),
        }
        const ventaActualizada = {
            estado_pago: "completo",
            monto_debe: 0,
            monto_pagado: Number(venta.total || 0),
            pago: pagoActualizado,
        }
        const deudaClienteActualizada = Math.max(Number(cliente.deuda || 0) - deudaVenta, 0)

        await actualizarDocumento("comprobantes_venta", venta.id, ventaActualizada)

        if (Array.isArray(venta.venta_ids) && venta.venta_ids.length > 0) {
            await Promise.all(venta.venta_ids.map((ventaId) => actualizarDocumento("ventas", ventaId, ventaActualizada)))
        }

        await actualizarDocumento("clientes", cliente.id, {
            deuda: deudaClienteActualizada,
        })

        setComprobantesVenta((comprobantesActuales) => comprobantesActuales.map((comprobante) => {
            if (comprobante.id !== venta.id) return comprobante

            return {
                ...comprobante,
                ...ventaActualizada,
            }
        }))
        setClientes((clientesActuales) => clientesActuales.map((clienteActual) => {
            if (clienteActual.id !== cliente.id) return clienteActual

            return {
                ...clienteActual,
                deuda: deudaClienteActualizada,
            }
        }))
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
                clientesFiltrados.map((cliente) => {
                    const ventasCliente = obtenerVentasCliente(cliente.id)
                    const clienteAbierto = clienteAbiertoId === cliente.id

                    return <article
                        key={cliente.id}
                        className={`clienteCard bdRadius ${clienteEditandoId === cliente.id ? "clienteCardEditando" : ""} ${clienteConfirmandoId === cliente.id ? "clienteCardConfirmando" : ""} ${clienteAbierto ? "clienteCardAbierta" : ""}`}
                        onClick={() => {
                            if (clienteEditandoId === cliente.id || clienteConfirmandoId === cliente.id) return

                            alternarCliente(cliente.id)
                        }}
                    >
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
                                        <p>Deuda <span className="clienteDeudaNumero">{formatearDinero(cliente.deuda)}</span></p>
                                    </div>
                                    <div className="clienteActions">
                                        <button type="button" onClick={(e) => {
                                            e.stopPropagation()
                                            editarCliente(cliente)
                                        }} aria-label={`Editar ${cliente.nombre}`}>
                                            <GoPencil />
                                        </button>
                                        <button type="button" onClick={(e) => {
                                            e.stopPropagation()
                                            setClienteConfirmandoId(cliente.id)
                                        }} aria-label={`Eliminar ${cliente.nombre}`}>
                                            <GoTrash />
                                        </button>
                                    </div>
                                    {
                                        clienteAbierto && (
                                            <div className="clienteVentas">
                                                <h3>Ventas del cliente</h3>
                                                {
                                                    ventasCliente.length === 0 ? (
                                                        <p className="clienteVentasVacio">No hay ventas registradas</p>
                                                    ) : (
                                                        ventasCliente.map((venta) => (
                                                            <article key={venta.id} className="clienteVentaItem">
                                                                <div>
                                                                    <p>{venta.fecha_hora || venta.fecha}</p>
                                                                    <span>{venta.items?.length || 0} {Number(venta.items?.length || 0) === 1 ? "producto" : "productos"}</span>
                                                                </div>
                                                                <div>
                                                                    <strong>{formatearDinero(venta.total)}</strong>
                                                                    <span>{formatearMetodoPago(venta.metodo_pago)} - {formatearEstadoPago(venta.estado_pago)}</span>
                                                                    {
                                                                        venta.estado_pago === "incompleto" && (
                                                                            <>
                                                                                <span className="clienteVentaDeuda">Falta pagar {formatearDinero(venta.monto_debe)}</span>
                                                                                <button type="button" onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    completarPago(cliente, venta)
                                                                                }}>
                                                                                    <FaCheck />
                                                                                    Completar pago
                                                                                </button>
                                                                            </>
                                                                        )
                                                                    }
                                                                </div>
                                                            </article>
                                                        ))
                                                    )
                                                }
                                            </div>
                                        )
                                    }
                                </>
                            )
                        }
                    </article>
                })
            }
        </div>
    </section>
}
