"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AiOutlinePlus } from "react-icons/ai"
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa"
import { FiSearch } from "react-icons/fi"
import { GoPencil, GoTrash } from "react-icons/go"
import { actualizarDocumento, crearDocumento, eliminarDocumento, obtenerDocumentos } from "../lib/firebase"
import {
    formatearCantidad,
    formatearDinero,
    formatearTipoStock,
    normalizarCompra,
    normalizarLista,
    normalizarProveedor,
} from "../lib/normalizadores"
import { NavComponent } from "./NavComponent"

const proveedorVacio = {
    nombre: "",
    telefono: "",
    email: "",
}

export const ProveedoresComponent = () => {
    const [proveedores, setProveedores] = useState([])
    const [compras, setCompras] = useState([])
    const [busqueda, setBusqueda] = useState("")
    const [creandoProveedor, setCreandoProveedor] = useState(false)
    const [proveedorEditandoId, setProveedorEditandoId] = useState(null)
    const [proveedorConfirmandoId, setProveedorConfirmandoId] = useState(null)
    const [proveedorAbiertoId, setProveedorAbiertoId] = useState(null)
    const [nuevoProveedor, setNuevoProveedor] = useState(proveedorVacio)
    const [proveedorEditado, setProveedorEditado] = useState(proveedorVacio)

    useEffect(() => {
        const cargarDatos = async () => {
            const [proveedoresData, comprasData] = await Promise.all([
                obtenerDocumentos("proveedores"),
                obtenerDocumentos("compras"),
            ])

            setProveedores(normalizarLista(proveedoresData, normalizarProveedor))
            setCompras(normalizarLista(comprasData, normalizarCompra))
        }

        cargarDatos()
    }, [])

    const obtenerComprasProveedor = (proveedorId) => {
        return compras
            .filter((compra) => compra.proveedor_id === proveedorId || compra.proveedor?.id === proveedorId)
            .sort((a, b) => String(b.fecha_hora || b.fecha || "").localeCompare(String(a.fecha_hora || a.fecha || "")))
    }

    const obtenerResumenProveedor = (proveedor) => {
        const comprasProveedor = obtenerComprasProveedor(proveedor.id)
        const totalKg = comprasProveedor.reduce((total, compra) => total + Number(compra.cantidad_kg || 0), 0)
        const totalPrecio = comprasProveedor.reduce((total, compra) => total + Number(compra.total_compra || 0), 0)

        return {
            compras: comprasProveedor,
            total_kg: totalKg,
            total_precio: totalPrecio,
        }
    }

    const proveedoresFiltrados = useMemo(() => {
        const textoBusqueda = busqueda.trim().toLowerCase()

        if (!textoBusqueda) return proveedores

        return proveedores.filter((proveedor) => {
            const nombre = String(proveedor.nombre || "").toLowerCase()
            const telefono = String(proveedor.telefono || "").toLowerCase()
            const email = String(proveedor.email || "").toLowerCase()

            return nombre.includes(textoBusqueda) || telefono.includes(textoBusqueda) || email.includes(textoBusqueda)
        })
    }, [proveedores, busqueda])

    useEffect(() => {
        if (!proveedorAbiertoId) return

        const proveedorSigueVisible = proveedoresFiltrados.some((proveedor) => proveedor.id === proveedorAbiertoId)

        if (!proveedorSigueVisible) {
            setProveedorAbiertoId(null)
        }
    }, [proveedoresFiltrados, proveedorAbiertoId])

    const proveedorSeleccionado = proveedores.find((proveedor) => proveedor.id === proveedorAbiertoId)
    const resumenProveedorSeleccionado = proveedorSeleccionado ? obtenerResumenProveedor(proveedorSeleccionado) : null
    const filasProveedores = proveedoresFiltrados.reduce((filas, proveedor, index) => {
        if (index % 2 === 0) {
            filas.push([proveedor])
        } else {
            filas[filas.length - 1].push(proveedor)
        }

        return filas
    }, [])

    const abrirCrearProveedor = () => {
        setCreandoProveedor(true)
        setProveedorEditandoId(null)
        setProveedorConfirmandoId(null)
    }

    const cancelarCrearProveedor = () => {
        setCreandoProveedor(false)
        setNuevoProveedor(proveedorVacio)
    }

    const guardarNuevoProveedor = async () => {
        const proveedorParaCrear = {
            nombre: nuevoProveedor.nombre,
            telefono: nuevoProveedor.telefono,
            email: nuevoProveedor.email,
            compras: 0,
        }
        const id = await crearDocumento("proveedores", proveedorParaCrear)

        setProveedores((proveedoresActuales) => [
            normalizarProveedor({
                id,
                ...proveedorParaCrear,
            }),
            ...proveedoresActuales,
        ])
        cancelarCrearProveedor()
    }

    const editarProveedor = (proveedor) => {
        setCreandoProveedor(false)
        setProveedorEditandoId(proveedor.id)
        setProveedorConfirmandoId(null)
        setProveedorAbiertoId(null)
        setProveedorEditado({
            nombre: proveedor.nombre || "",
            telefono: proveedor.telefono || "",
            email: proveedor.email || "",
        })
    }

    const cancelarEdicion = () => {
        setProveedorEditandoId(null)
        setProveedorEditado(proveedorVacio)
    }

    const guardarProveedor = async (proveedorId) => {
        const proveedorActualizado = {
            nombre: proveedorEditado.nombre,
            telefono: proveedorEditado.telefono,
            email: proveedorEditado.email,
        }

        await actualizarDocumento("proveedores", proveedorId, proveedorActualizado)

        setProveedores((proveedoresActuales) => proveedoresActuales.map((proveedor) => {
            if (proveedor.id !== proveedorId) return proveedor

            return normalizarProveedor({
                ...proveedor,
                ...proveedorActualizado,
            })
        }))
        cancelarEdicion()
    }

    const borrarProveedor = async (proveedor) => {
        await eliminarDocumento("proveedores", proveedor.id)
        setProveedores((proveedoresActuales) => proveedoresActuales.filter((proveedorActual) => proveedorActual.id !== proveedor.id))
        setProveedorConfirmandoId(null)

        if (proveedorEditandoId === proveedor.id) {
            cancelarEdicion()
        }
    }

    const alternarProveedor = (proveedorId) => {
        setProveedorAbiertoId((proveedorActual) => proveedorActual === proveedorId ? null : proveedorId)
    }

    const renderDetalleProveedor = () => {
        if (!proveedorSeleccionado || !resumenProveedorSeleccionado || proveedorEditandoId || proveedorConfirmandoId) return null

        return <article className="proveedorDetalleCard proveedorDetalleEnGrid">
            <div className="proveedorDetalleHeader">
                <div>
                    <h2>{proveedorSeleccionado.nombre}</h2>
                    <p>{proveedorSeleccionado.telefono || "Sin telefono"}</p>
                </div>
                <div className="proveedorActions">
                    <button type="button" onClick={() => editarProveedor(proveedorSeleccionado)} aria-label={`Editar ${proveedorSeleccionado.nombre}`}>
                        <GoPencil />
                    </button>
                    <button type="button" onClick={() => setProveedorConfirmandoId(proveedorSeleccionado.id)} aria-label={`Eliminar ${proveedorSeleccionado.nombre}`}>
                        <GoTrash />
                    </button>
                </div>
            </div>

            <div className="proveedorDatosGrid">
                <p>Email <span>{proveedorSeleccionado.email || "-"}</span></p>
                <p>Telefono <span>{proveedorSeleccionado.telefono || "-"}</span></p>
                <p>Compras <span>{resumenProveedorSeleccionado.compras.length}</span></p>
                <p>Total comprado <span>{formatearDinero(resumenProveedorSeleccionado.total_precio)}</span></p>
            </div>

            <div className="proveedorStats">
                <p>Compras <span>{resumenProveedorSeleccionado.compras.length}</span></p>
                <p>Total kg <span>{formatearCantidad(resumenProveedorSeleccionado.total_kg)} kg</span></p>
                <p>Total $ <span>{formatearDinero(resumenProveedorSeleccionado.total_precio)}</span></p>
            </div>

            <div className="proveedorCompras">
                <h3>Historial de Compras</h3>
                {
                    resumenProveedorSeleccionado.compras.length === 0 ? (
                        <p className="proveedorComprasVacio">No hay compras registradas</p>
                    ) : (
                        resumenProveedorSeleccionado.compras.map((compra) => (
                            <article key={compra.id} className="proveedorCompraItem">
                                <div className="proveedorCompraHeader">
                                    <div>
                                        <p>{compra.producto || compra.producto_nombre || "Producto sin nombre"}</p>
                                        <span>{compra.fecha_hora || compra.fecha || "-"}</span>
                                    </div>
                                    <div>
                                        <strong>{formatearDinero(compra.total_compra)}</strong>
                                        <span>{formatearCantidad(compra.cantidad_kg)} {formatearTipoStock(compra.tipo_stock, compra.cantidad_kg)}</span>
                                    </div>
                                </div>
                                <div className="proveedorCompraDetalle">
                                    <p>Costo unitario <span>{formatearDinero(compra.costo_kg)}</span></p>
                                    <p>Cantidad <span>{formatearCantidad(compra.cantidad_kg)} {formatearTipoStock(compra.tipo_stock, compra.cantidad_kg)}</span></p>
                                    <p>Total <span>{formatearDinero(compra.total_compra)}</span></p>
                                </div>
                            </article>
                        ))
                    )
                }
            </div>
        </article>
    }

    return <section>
        <NavComponent bgColor="#155DFC" >
            <Link href={'/'}>
                <FaArrowLeft />
            </Link>
            <h1>Proveedores</h1>
            <AiOutlinePlus color="#155DFC" onClick={abrirCrearProveedor} />
        </NavComponent>

        <div id="proveedoresContainer">
            <div className="proveedorSearch">
                <FiSearch />
                <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar proveedor..."
                    aria-label="Buscar proveedor"
                />
            </div>

            {
                creandoProveedor && (
                    <article className="proveedorDetalleCard proveedorCardEditando">
                        <form className="proveedorEditForm" onSubmit={(e) => {
                            e.preventDefault()
                            guardarNuevoProveedor()
                        }}>
                            <input
                                type="text"
                                value={nuevoProveedor.nombre}
                                onChange={(e) => setNuevoProveedor((proveedorActual) => ({
                                    ...proveedorActual,
                                    nombre: e.target.value,
                                }))}
                                placeholder="Nombre del proveedor"
                                aria-label="Nombre del proveedor"
                            />
                            <input
                                type="text"
                                value={nuevoProveedor.telefono}
                                onChange={(e) => setNuevoProveedor((proveedorActual) => ({
                                    ...proveedorActual,
                                    telefono: e.target.value,
                                }))}
                                placeholder="Telefono"
                                aria-label="Telefono del proveedor"
                            />
                            <input
                                type="email"
                                value={nuevoProveedor.email}
                                onChange={(e) => setNuevoProveedor((proveedorActual) => ({
                                    ...proveedorActual,
                                    email: e.target.value,
                                }))}
                                placeholder="Email"
                                aria-label="Email del proveedor"
                            />
                            <div className="proveedorEditActions">
                                <button type="submit">
                                    <FaCheck />
                                    Guardar
                                </button>
                                <button type="button" onClick={cancelarCrearProveedor}>
                                    <FaTimes />
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </article>
                )
            }

            <div className="proveedoresGrid">
                {
                    filasProveedores.map((fila) => {
                        const filaActiva = fila.some((proveedor) => proveedor.id === proveedorAbiertoId)

                        return <div key={fila.map((proveedor) => proveedor.id).join("-")} className="proveedoresFila">
                            {
                                fila.map((proveedor) => {
                                    const resumen = obtenerResumenProveedor(proveedor)
                                    const proveedorAbierto = proveedorAbiertoId === proveedor.id

                                    return <button
                                        key={proveedor.id}
                                        type="button"
                                        className={`proveedorResumenCard ${proveedorAbierto ? "proveedorResumenCardActiva" : ""}`}
                                        onClick={() => alternarProveedor(proveedor.id)}
                                    >
                                        <span className="proveedorComprasBadge">{resumen.compras.length}</span>
                                        <strong>{proveedor.nombre}</strong>
                                        <span>{proveedor.telefono || "Sin telefono"}</span>
                                        <span>Comprado</span>
                                        <p>{formatearDinero(resumen.total_precio)}</p>
                                    </button>
                                })
                            }
                            {filaActiva && renderDetalleProveedor()}
                        </div>
                    })
                }
            </div>

            {
                proveedoresFiltrados.length === 0 && (
                    <p className="proveedoresVacio">No hay proveedores para mostrar</p>
                )
            }

            {
                proveedorEditandoId && (
                    <article className="proveedorDetalleCard proveedorCardEditando">
                        <form className="proveedorEditForm" onSubmit={(e) => {
                            e.preventDefault()
                            guardarProveedor(proveedorEditandoId)
                        }}>
                            <input
                                type="text"
                                value={proveedorEditado.nombre}
                                onChange={(e) => setProveedorEditado((proveedorActual) => ({
                                    ...proveedorActual,
                                    nombre: e.target.value,
                                }))}
                                aria-label="Nombre del proveedor"
                            />
                            <input
                                type="text"
                                value={proveedorEditado.telefono}
                                onChange={(e) => setProveedorEditado((proveedorActual) => ({
                                    ...proveedorActual,
                                    telefono: e.target.value,
                                }))}
                                aria-label="Telefono del proveedor"
                            />
                            <input
                                type="email"
                                value={proveedorEditado.email}
                                onChange={(e) => setProveedorEditado((proveedorActual) => ({
                                    ...proveedorActual,
                                    email: e.target.value,
                                }))}
                                aria-label="Email del proveedor"
                            />
                            <div className="proveedorEditActions">
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
                proveedorConfirmandoId && (
                    <article className="proveedorDetalleCard proveedorCardConfirmando">
                        <div className="proveedorDeleteConfirm">
                            <p>Esta seguro que desea eliminar este proveedor?</p>
                            <div className="proveedorDeleteActions">
                                <button type="button" onClick={() => {
                                    const proveedor = proveedores.find((proveedorActual) => proveedorActual.id === proveedorConfirmandoId)

                                    if (proveedor) borrarProveedor(proveedor)
                                }}>
                                    <GoTrash />
                                    Eliminar
                                </button>
                                <button type="button" onClick={() => setProveedorConfirmandoId(null)}>
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
