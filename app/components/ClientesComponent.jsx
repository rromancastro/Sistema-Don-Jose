"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa"
import { FiSearch } from "react-icons/fi"
import { GoPencil, GoTrash } from "react-icons/go"
import { AiOutlinePlus } from "react-icons/ai"
import { actualizarDocumento, crearDocumento, eliminarDocumento, obtenerDocumentos } from "../lib/firebase"
import {
    formatearCantidad,
    formatearDinero,
    formatearEstadoPago,
    formatearMetodoPago,
    formatearTipoStock,
    normalizarCliente,
    normalizarComprobanteVenta,
    normalizarLista,
} from "../lib/normalizadores"
import { NavComponent } from "./NavComponent"

const clienteVacio = {
    nombre: "",
    telefono: "",
    email: "",
    dni_cuit: "",
    direccion: "",
}

export const ClientesComponent = () => {
    const [clientes, setClientes] = useState([])
    const [comprobantesVenta, setComprobantesVenta] = useState([])
    const [busqueda, setBusqueda] = useState("")
    const [soloConDeuda, setSoloConDeuda] = useState(false)
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

            setClientes(normalizarLista(clientesData, normalizarCliente))
            setComprobantesVenta(normalizarLista(comprobantesData, normalizarComprobanteVenta))
        }

        cargarClientes()
    }, [])

    const clientesFiltrados = useMemo(() => {
        const textoBusqueda = busqueda.trim().toLowerCase()
        const clientesPorBusqueda = textoBusqueda ? clientes.filter((cliente) => {
            const nombre = String(cliente.nombre || "").toLowerCase()
            const telefono = String(cliente.telefono || "").toLowerCase()
            const email = String(cliente.email || "").toLowerCase()
            const dniCuit = String(cliente.dni_cuit || "").toLowerCase()
            const direccion = String(cliente.direccion || "").toLowerCase()

            return nombre.includes(textoBusqueda) || telefono.includes(textoBusqueda) || email.includes(textoBusqueda) || dniCuit.includes(textoBusqueda) || direccion.includes(textoBusqueda)
        }) : clientes

        if (!soloConDeuda) return clientesPorBusqueda

        return clientesPorBusqueda.filter((cliente) => Number(cliente.deuda || 0) > 0)
    }, [clientes, busqueda, soloConDeuda])

    useEffect(() => {
        if (!clienteAbiertoId) return

        const clienteSigueVisible = clientesFiltrados.some((cliente) => cliente.id === clienteAbiertoId)

        if (!clienteSigueVisible) {
            setClienteAbiertoId(null)
        }
    }, [clientesFiltrados, clienteAbiertoId])

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
            dni_cuit: nuevoCliente.dni_cuit,
            direccion: nuevoCliente.direccion,
            ventas: 0,
            facturacion: 0,
            ganancia: 0,
            deuda: 0,
        }

        const id = await crearDocumento("clientes", clienteParaCrear)

        setClientes((clientesActuales) => [
            normalizarCliente({
                id,
                ...clienteParaCrear,
            }),
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
            telefono: cliente.telefono || "",
            email: cliente.email || "",
            dni_cuit: cliente.dni_cuit || "",
            direccion: cliente.direccion || "",
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
            dni_cuit: clienteEditado.dni_cuit,
            direccion: clienteEditado.direccion,
        }

        await actualizarDocumento("clientes", clienteId, clienteActualizado)

        setClientes((clientesActuales) => clientesActuales.map((cliente) => {
            if (cliente.id !== clienteId) return cliente

            return normalizarCliente({
                ...cliente,
                ...clienteActualizado,
            })
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

            return normalizarComprobanteVenta({
                ...comprobante,
                ...ventaActualizada,
            })
        }))
        setClientes((clientesActuales) => clientesActuales.map((clienteActual) => {
            if (clienteActual.id !== cliente.id) return clienteActual

            return normalizarCliente({
                ...clienteActual,
                deuda: deudaClienteActualizada,
            })
        }))
    }

    const obtenerResumenCliente = (cliente) => {
        const ventasCliente = obtenerVentasCliente(cliente.id)
        const facturacion = ventasCliente.reduce((total, venta) => total + Number(venta.total || 0), 0)
        const ganancia = ventasCliente.reduce((total, venta) => total + Number(venta.ganancia_total || 0), 0)
        const deuda = Number(cliente.deuda || 0)

        return {
            deuda,
            facturacion: facturacion || Number(cliente.facturacion || 0),
            ganancia: ganancia || Number(cliente.ganancia || 0),
            ventas: ventasCliente,
        }
    }

    const clienteSeleccionado = clientes.find((cliente) => cliente.id === clienteAbiertoId)
    const resumenClienteSeleccionado = clienteSeleccionado ? obtenerResumenCliente(clienteSeleccionado) : null
    const filasClientes = clientesFiltrados.reduce((filas, cliente, index) => {
        if (index % 2 === 0) {
            filas.push([cliente])
        } else {
            filas[filas.length - 1].push(cliente)
        }

        return filas
    }, [])

    const renderDetalleCliente = () => {
        if (!clienteSeleccionado || !resumenClienteSeleccionado || clienteEditandoId || clienteConfirmandoId) return null

        return <article className="clienteDetalleCard clienteDetalleEnGrid">
            <div className="clienteDetalleHeader">
                <div>
                    <h2>{clienteSeleccionado.nombre}</h2>
                    <p>{clienteSeleccionado.telefono || "Sin telefono"}</p>
                </div>
                <div className="clienteActions">
                    <button type="button" onClick={() => editarCliente(clienteSeleccionado)} aria-label={`Editar ${clienteSeleccionado.nombre}`}>
                        <GoPencil />
                    </button>
                    <button type="button" onClick={() => setClienteConfirmandoId(clienteSeleccionado.id)} aria-label={`Eliminar ${clienteSeleccionado.nombre}`}>
                        <GoTrash />
                    </button>
                </div>
            </div>

            <div className="clienteDatosGrid">
                <p>Email <span>{clienteSeleccionado.email || "-"}</span></p>
                <p>DNI/CUIT <span>{clienteSeleccionado.dni_cuit || "-"}</span></p>
                <p>Domicilio <span>{clienteSeleccionado.direccion || "-"}</span></p>
                <p>Deuda <span className="clienteDeudaNumero">{formatearDinero(resumenClienteSeleccionado.deuda)}</span></p>
            </div>

            <div className="clienteStats">
                <p>Ventas <span>{resumenClienteSeleccionado.ventas.length}</span></p>
                <p>Facturacion <span>{formatearDinero(resumenClienteSeleccionado.facturacion)}</span></p>
                <p>Ganancia <span>{formatearDinero(resumenClienteSeleccionado.ganancia)}</span></p>
            </div>

            <div className="clienteVentas">
                <h3>Historial de Ventas</h3>
                {
                    resumenClienteSeleccionado.ventas.length === 0 ? (
                        <p className="clienteVentasVacio">No hay ventas registradas</p>
                    ) : (
                        resumenClienteSeleccionado.ventas.map((venta) => (
                            <article key={venta.id} className="clienteVentaItem">
                                <div className="clienteVentaInfo">
                                    <div className="clienteVentaHeader">
                                        <div>
                                            <p>{venta.fecha_hora || venta.fecha}</p>
                                            <span>{venta.items?.length || 0} {Number(venta.items?.length || 0) === 1 ? "producto" : "productos"}</span>
                                        </div>
                                        <div>
                                            <strong>{formatearDinero(venta.total)}</strong>
                                            <span>{formatearMetodoPago(venta.metodo_pago)} - {formatearEstadoPago(venta.estado_pago)}</span>
                                        </div>
                                    </div>

                                    <div className="clienteVentaProductos">
                                        {
                                            (venta.items || []).map((item, index) => (
                                                <div key={item.id || item.producto_id || `${item.nombre}-${index}`}>
                                                    <div>
                                                        <p>{item.nombre || "Producto sin nombre"}</p>
                                                        <span>
                                                            {formatearCantidad(item.cantidad_kg ?? item.cantidad)} {formatearTipoStock(item.tipo_stock, item.cantidad_kg ?? item.cantidad)}
                                                            {" x "}
                                                            {formatearDinero(item.precio_unitario)}
                                                        </span>
                                                    </div>
                                                    <strong>{formatearDinero(item.subtotal)}</strong>
                                                </div>
                                            ))
                                        }
                                    </div>

                                    {
                                        venta.estado_pago === "incompleto" && (
                                            <div className="clienteVentaPendiente">
                                                <span className="clienteVentaDeuda">Falta pagar {formatearDinero(venta.monto_debe)}</span>
                                                <button type="button" onClick={() => completarPago(clienteSeleccionado, venta)}>
                                                    <FaCheck />
                                                    Completar pago
                                                </button>
                                            </div>
                                        )
                                    }
                                </div>
                            </article>
                        ))
                    )
                }
            </div>
        </article>
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

            <div className="clienteFiltros">
                <button type="button" className={!soloConDeuda ? "clienteFiltroActivo" : ""} onClick={() => setSoloConDeuda(false)}>
                    Todos
                </button>
                <button type="button" className={soloConDeuda ? "clienteFiltroActivo" : ""} onClick={() => setSoloConDeuda(true)}>
                    Con deuda
                </button>
            </div>

            {
                creandoCliente && (
                    <article className="clienteDetalleCard clienteCardEditando">
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
                            <input
                                type="text"
                                value={nuevoCliente.dni_cuit}
                                onChange={(e) => setNuevoCliente((clienteActual) => ({
                                    ...clienteActual,
                                    dni_cuit: e.target.value,
                                }))}
                                placeholder="DNI/CUIT"
                                aria-label="DNI o CUIT del cliente"
                            />
                            <input
                                type="text"
                                value={nuevoCliente.direccion}
                                onChange={(e) => setNuevoCliente((clienteActual) => ({
                                    ...clienteActual,
                                    direccion: e.target.value,
                                }))}
                                placeholder="Direccion"
                                aria-label="Direccion del cliente"
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

            <div className="clientesGrid">
                {
                    filasClientes.map((fila) => {
                        const filaActiva = fila.some((cliente) => cliente.id === clienteAbiertoId)

                        return <div key={fila.map((cliente) => cliente.id).join("-")} className="clientesFila">
                            {
                                fila.map((cliente) => {
                                    const resumen = obtenerResumenCliente(cliente)
                                    const clienteAbierto = clienteAbiertoId === cliente.id

                                    return <button
                                        key={cliente.id}
                                        type="button"
                                        className={`clienteResumenCard ${clienteAbierto ? "clienteResumenCardActiva" : ""}`}
                                        onClick={() => alternarCliente(cliente.id)}
                                    >
                                        <span className="clienteVentasBadge">{resumen.ventas.length}</span>
                                        <strong>{cliente.nombre}</strong>
                                        <span>{cliente.telefono || "Sin telefono"}</span>
                                        <span>Facturado</span>
                                        <p>{formatearDinero(resumen.facturacion)}</p>
                                        {
                                            resumen.deuda > 0 && (
                                                <em>Debe {formatearDinero(resumen.deuda)}</em>
                                            )
                                        }
                                    </button>
                                })
                            }
                            {filaActiva && renderDetalleCliente()}
                        </div>
                    })
                }
            </div>

            {
                clientesFiltrados.length === 0 && (
                    <p className="clientesVacio">No hay clientes para mostrar</p>
                )
            }

            {
                clienteEditandoId && (
                    <article className="clienteDetalleCard clienteCardEditando">
                        <form className="clienteEditForm" onSubmit={(e) => {
                            e.preventDefault()
                            guardarCliente(clienteEditandoId)
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
                            <input
                                type="text"
                                value={clienteEditado.dni_cuit}
                                onChange={(e) => setClienteEditado((clienteActual) => ({
                                    ...clienteActual,
                                    dni_cuit: e.target.value,
                                }))}
                                aria-label="DNI o CUIT del cliente"
                                placeholder="DNI/CUIT"
                            />
                            <input
                                type="text"
                                value={clienteEditado.direccion}
                                onChange={(e) => setClienteEditado((clienteActual) => ({
                                    ...clienteActual,
                                    direccion: e.target.value,
                                }))}
                                aria-label="Direccion del cliente"
                                placeholder="Direccion"
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
                    </article>
                )
            }

            {
                clienteConfirmandoId && (
                    <article className="clienteDetalleCard clienteCardConfirmando">
                        <div className="clienteDeleteConfirm">
                            <p>Esta seguro que desea eliminar este cliente?</p>
                            <div className="clienteDeleteActions">
                                <button type="button" onClick={() => {
                                    const cliente = clientes.find((clienteActual) => clienteActual.id === clienteConfirmandoId)

                                    if (cliente) borrarCliente(cliente)
                                }}>
                                    <GoTrash />
                                    Eliminar
                                </button>
                                <button type="button" onClick={() => setClienteConfirmandoId(null)}>
                                    <FaTimes />
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </article>
                )
            }

        </div>
    </section>
}
