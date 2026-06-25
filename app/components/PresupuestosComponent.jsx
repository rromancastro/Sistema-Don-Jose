"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AiOutlinePlus } from "react-icons/ai"
import { FaArrowLeft, FaCheck, FaDownload, FaEye, FaShoppingCart, FaTimes, FaTrashAlt, FaUserPlus } from "react-icons/fa"
import { FiFileText } from "react-icons/fi"
import { actualizarDocumento, crearDocumento, eliminarDocumento, obtenerDocumentos } from "../lib/firebase"
import { NavComponent } from "./NavComponent"

const clienteVacio = {
    nombre: "",
    contacto: "",
}

const formatearPrecio = (valor) => `$${Number(valor || 0).toFixed(2)}`
const formatearFecha = (fecha) => {
    if (!fecha) return ""

    const [anio, mes, dia] = fecha.split("-")

    if (!anio || !mes || !dia) return fecha

    return `${dia}/${mes}/${anio}`
}
const formatearTipoStock = (tipoStock, cantidad = 1) => {
    if (tipoStock === "unidad") return cantidad === 1 ? "unidad" : "unidades"

    return "kg"
}
const obtenerFechaActual = () => {
    const ahora = new Date()
    const anio = ahora.getFullYear()
    const mes = String(ahora.getMonth() + 1).padStart(2, "0")
    const dia = String(ahora.getDate()).padStart(2, "0")

    return `${anio}-${mes}-${dia}`
}
const formatearFechaHora = (fecha) => new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
}).format(fecha)
const obtenerNombreProducto = (producto) => producto.nombre || producto.producto || "Producto sin nombre"
const obtenerStockProducto = (producto) => Number(producto.stock_kg ?? producto.stock ?? producto.cantidad_kg ?? 0)
const obtenerTipoStock = (producto) => producto.tipo_stock || "kg"
const obtenerPrecioMayorista = (producto) => Number(producto.precio_mayorista ?? producto.mayorista ?? producto.precioMayorista ?? producto.precio_kg ?? producto.precio ?? 0)
const obtenerPrecioMinorista = (producto) => Number(producto.precio_minorista ?? producto.minorista ?? producto.precioMinorista ?? producto.precio_venta ?? producto.precio ?? 0)
const obtenerCostoProducto = (producto) => Number(producto.costo ?? producto.costo_kg ?? producto.precio_costo ?? 0)

export const PresupuestosComponent = () => {
    const [clientes, setClientes] = useState([])
    const [productos, setProductos] = useState([])
    const [presupuestos, setPresupuestos] = useState([])
    const [creandoPresupuesto, setCreandoPresupuesto] = useState(false)
    const [creandoCliente, setCreandoCliente] = useState(false)
    const [clienteId, setClienteId] = useState("")
    const [nuevoCliente, setNuevoCliente] = useState(clienteVacio)
    const [productoId, setProductoId] = useState("")
    const [cantidad, setCantidad] = useState("")
    const [tipoPrecio, setTipoPrecio] = useState("minorista")
    const [items, setItems] = useState([])
    const [presupuestoActivo, setPresupuestoActivo] = useState(null)

    useEffect(() => {
        const cargarDatos = async () => {
            const [clientesData, productosData, presupuestosData] = await Promise.all([
                obtenerDocumentos("clientes"),
                obtenerDocumentos("productos"),
                obtenerDocumentos("presupuestos"),
            ])

            setClientes(clientesData)
            setProductos(productosData)
            setPresupuestos(presupuestosData)
            setClienteId(clientesData[0]?.id || "")
        }

        cargarDatos()
    }, [])

    const clienteSeleccionado = useMemo(() => {
        return clientes.find((cliente) => cliente.id === clienteId)
    }, [clientes, clienteId])

    const productoSeleccionado = useMemo(() => {
        return productos.find((producto) => producto.id === productoId)
    }, [productos, productoId])

    const presupuestosPendientes = useMemo(() => {
        return presupuestos
            .filter((presupuesto) => (presupuesto.estado || "pendiente") === "pendiente")
            .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")))
    }, [presupuestos])

    const tipoStockProducto = productoSeleccionado ? obtenerTipoStock(productoSeleccionado) : "kg"
    const cantidadNumerica = Number(cantidad || 0)
    const stockDisponible = productoSeleccionado ? obtenerStockProducto(productoSeleccionado) : 0
    const precioMayorista = productoSeleccionado ? obtenerPrecioMayorista(productoSeleccionado) : 0
    const precioMinorista = productoSeleccionado ? obtenerPrecioMinorista(productoSeleccionado) : 0
    const precioProducto = tipoPrecio === "mayorista" ? precioMayorista : precioMinorista
    const costoProducto = productoSeleccionado ? obtenerCostoProducto(productoSeleccionado) : 0
    const totalPresupuesto = items.reduce((total, item) => total + Number(item.subtotal || 0), 0)

    const abrirCrearPresupuesto = () => {
        setCreandoPresupuesto(true)
        setPresupuestoActivo(null)
    }

    const cancelarCrearPresupuesto = () => {
        setCreandoPresupuesto(false)
        setCreandoCliente(false)
        setNuevoCliente(clienteVacio)
        setProductoId("")
        setCantidad("")
        setTipoPrecio("minorista")
        setItems([])
    }

    const cambiarCantidad = (valor) => {
        if (valor === "") {
            setCantidad("")
            return
        }

        const valorNumerico = Number(valor)

        if (Number.isNaN(valorNumerico)) return

        const valorNormalizado = tipoStockProducto === "unidad" ? Math.floor(valorNumerico) : valorNumerico

        setCantidad(String(Math.max(Math.min(valorNormalizado, stockDisponible), 0)))
    }

    const guardarCliente = async () => {
        const nombre = nuevoCliente.nombre.trim()

        if (!nombre) return

        const clienteParaCrear = {
            nombre,
            telefono: nuevoCliente.contacto,
            email: "",
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
        setClienteId(id)
        setCreandoCliente(false)
        setNuevoCliente(clienteVacio)
    }

    const agregarProducto = () => {
        if (!productoSeleccionado || cantidadNumerica <= 0) return

        const item = {
            id: `${productoSeleccionado.id}-${Date.now()}`,
            producto_id: productoSeleccionado.id,
            nombre: obtenerNombreProducto(productoSeleccionado),
            cantidad_kg: cantidadNumerica,
            tipo_stock: tipoStockProducto,
            precio_unitario: precioProducto,
            costo_unitario: costoProducto,
            subtotal: cantidadNumerica * precioProducto,
            ganancia: (cantidadNumerica * precioProducto) - (cantidadNumerica * costoProducto),
            tipo_precio: tipoPrecio,
        }

        setItems((itemsActuales) => [...itemsActuales, item])
        setProductoId("")
        setCantidad("")
        setTipoPrecio("minorista")
    }

    const quitarProducto = (itemId) => {
        setItems((itemsActuales) => itemsActuales.filter((item) => item.id !== itemId))
    }

    const guardarPresupuesto = async () => {
        if (!clienteSeleccionado || items.length === 0) return

        const presupuestoParaCrear = {
            cliente: {
                id: clienteSeleccionado.id,
                nombre: clienteSeleccionado.nombre || "",
                telefono: clienteSeleccionado.telefono || "",
                email: clienteSeleccionado.email || "",
            },
            cliente_id: clienteSeleccionado.id,
            estado: "pendiente",
            fecha: obtenerFechaActual(),
            items,
            total: totalPresupuesto,
        }

        const id = await crearDocumento("presupuestos", presupuestoParaCrear)

        setPresupuestos((presupuestosActuales) => [
            {
                id,
                ...presupuestoParaCrear,
            },
            ...presupuestosActuales,
        ])
        cancelarCrearPresupuesto()
    }

    const eliminarPresupuesto = async (presupuestoId) => {
        await eliminarDocumento("presupuestos", presupuestoId)
        setPresupuestos((presupuestosActuales) => presupuestosActuales.filter((presupuesto) => presupuesto.id !== presupuestoId))
        setPresupuestoActivo((presupuestoActual) => presupuestoActual?.id === presupuestoId ? null : presupuestoActual)
    }

    const descargarPresupuestoPDF = async (presupuesto) => {
        const { jsPDF } = await import("jspdf")
        const pdf = new jsPDF()
        const margen = 18
        const anchoPagina = pdf.internal.pageSize.getWidth()
        let y = 22

        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(20)
        pdf.setTextColor(127, 34, 254)
        pdf.text("Don Jose", anchoPagina / 2, y, { align: "center" })

        y += 8
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(10)
        pdf.setTextColor(54, 65, 99)
        pdf.text("Presupuesto de Venta", anchoPagina / 2, y, { align: "center" })

        y += 8
        pdf.text(formatearFecha(presupuesto.fecha), anchoPagina / 2, y, { align: "center" })

        y += 14
        pdf.setDrawColor(203, 213, 225)
        pdf.line(margen, y, anchoPagina - margen, y)

        y += 12
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(10)
        pdf.setTextColor(54, 65, 99)
        pdf.text("Cliente", margen, y)

        y += 8
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(12)
        pdf.setTextColor(15, 23, 42)
        pdf.text(presupuesto.cliente?.nombre || "Cliente sin nombre", margen, y)

        y += 14
        ;(presupuesto.items || []).forEach((item) => {
            if (y > 260) {
                pdf.addPage()
                y = 22
            }

            pdf.setFillColor(248, 250, 252)
            pdf.roundedRect(margen, y - 7, anchoPagina - margen * 2, 18, 2, 2, "F")
            pdf.setFont("helvetica", "bold")
            pdf.setFontSize(11)
            pdf.setTextColor(15, 23, 42)
            pdf.text(item.nombre || "Producto", margen + 4, y)
            pdf.text(formatearPrecio(item.subtotal), anchoPagina - margen - 4, y, { align: "right" })

            y += 7
            pdf.setFont("helvetica", "normal")
            pdf.setFontSize(9)
            pdf.setTextColor(54, 65, 99)
            pdf.text(`${item.cantidad_kg} ${formatearTipoStock(item.tipo_stock, item.cantidad_kg)} x ${formatearPrecio(item.precio_unitario)}/${formatearTipoStock(item.tipo_stock)}`, margen + 4, y)
            y += 16
        })

        pdf.setDrawColor(203, 213, 225)
        pdf.line(margen, y, anchoPagina - margen, y)

        y += 13
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(11)
        pdf.setTextColor(54, 65, 99)
        pdf.text("Total", margen, y)
        pdf.setFontSize(18)
        pdf.setTextColor(127, 34, 254)
        pdf.text(formatearPrecio(presupuesto.total), anchoPagina - margen, y, { align: "right" })

        y += 18
        pdf.setFont("helvetica", "italic")
        pdf.setFontSize(9)
        pdf.setTextColor(74, 85, 121)
        pdf.text("Presupuesto sujeto a disponibilidad de stock.", anchoPagina / 2, y, { align: "center" })

        pdf.save(`presupuesto-don-jose-${presupuesto.fecha || presupuesto.id}.pdf`)
    }

    const convertirPresupuesto = async (presupuesto) => {
        const fechaVenta = obtenerFechaActual()
        const fechaHoraVenta = formatearFechaHora(new Date())
        const totalVenta = Number(presupuesto.total || 0)
        const totalGanancia = (presupuesto.items || []).reduce((total, item) => total + Number(item.ganancia || 0), 0)
        const cliente = presupuesto.cliente || {}
        const comprobanteParaGuardar = {
            negocio: {
                nombre: "Don Jose",
                rubro: "Frutos Secos",
            },
            cliente,
            fecha: fechaVenta,
            fecha_hora: fechaHoraVenta,
            ganancia_total: totalGanancia,
            items: presupuesto.items || [],
            origen_presupuesto_id: presupuesto.id,
            tipo_documento: "remito",
            total: totalVenta,
        }

        const comprobanteId = await crearDocumento("comprobantes_venta", comprobanteParaGuardar)

        const ventasIds = await Promise.all((presupuesto.items || []).map((item) => crearDocumento("ventas", {
            cantidad_kg: item.cantidad_kg,
            cliente: {
                id: cliente.id || presupuesto.cliente_id || "",
                nombre: cliente.nombre || "",
            },
            cliente_id: cliente.id || presupuesto.cliente_id || "",
            comprobante_id: comprobanteId,
            costo_unitario: item.costo_unitario,
            fecha: fechaVenta,
            fecha_hora: fechaHoraVenta,
            ganancia: item.ganancia,
            origen_presupuesto_id: presupuesto.id,
            precio_unitario: item.precio_unitario,
            producto: {
                id: item.producto_id,
                nombre: item.nombre,
            },
            producto_id: item.producto_id,
            producto_nombre: item.nombre,
            subtotal: item.subtotal,
            tipo_documento: "remito",
            tipo_precio: item.tipo_precio || "minorista",
            tipo_stock: item.tipo_stock,
        })))

        await actualizarDocumento("comprobantes_venta", comprobanteId, {
            id: comprobanteId,
            venta_ids: ventasIds,
        })

        if (presupuesto.cliente_id) {
            const clienteActual = clientes.find((clienteItem) => clienteItem.id === presupuesto.cliente_id)
            const clienteActualizado = {
                facturacion: Number(clienteActual?.facturacion || 0) + totalVenta,
                ganancia: Number(clienteActual?.ganancia || 0) + totalGanancia,
                ventas: Number(clienteActual?.ventas || 0) + 1,
            }

            await actualizarDocumento("clientes", presupuesto.cliente_id, clienteActualizado)
            setClientes((clientesActuales) => clientesActuales.map((clienteItem) => {
                if (clienteItem.id !== presupuesto.cliente_id) return clienteItem

                return {
                    ...clienteItem,
                    ...clienteActualizado,
                }
            }))
        }

        const presupuestoActualizado = {
            comprobante_id: comprobanteId,
            estado: "convertido",
            fecha_conversion: fechaVenta,
            venta_ids: ventasIds,
        }

        await actualizarDocumento("presupuestos", presupuesto.id, presupuestoActualizado)
        setPresupuestos((presupuestosActuales) => presupuestosActuales.map((presupuestoItem) => {
            if (presupuestoItem.id !== presupuesto.id) return presupuestoItem

            return {
                ...presupuestoItem,
                ...presupuestoActualizado,
            }
        }))
        setPresupuestoActivo(null)
    }

    return <section>
        <NavComponent bgColor="#9810FA" >
            <Link href={'/'}>
                <FaArrowLeft />
            </Link>
            <h1>Presupuestos</h1>
            <AiOutlinePlus color="#9810FA" onClick={abrirCrearPresupuesto} />
        </NavComponent>

        <div id="presupuestosContainer">
            {
                creandoPresupuesto && (
                    <article className="presupuestoForm">
                        <div className="presupuestoFormHeader">
                            <h2>
                                <FiFileText />
                                Nuevo Presupuesto
                            </h2>
                            <button type="button" onClick={cancelarCrearPresupuesto} aria-label="Cerrar nuevo presupuesto">
                                <FaTimes />
                            </button>
                        </div>

                        <label>Cliente</label>
                        {
                            creandoCliente ? (
                                <div className="presupuestoNuevoCliente">
                                    <input
                                        type="text"
                                        value={nuevoCliente.nombre}
                                        onChange={(e) => setNuevoCliente((cliente) => ({ ...cliente, nombre: e.target.value }))}
                                        placeholder="Nombre del cliente"
                                    />
                                    <input
                                        type="text"
                                        value={nuevoCliente.contacto}
                                        onChange={(e) => setNuevoCliente((cliente) => ({ ...cliente, contacto: e.target.value }))}
                                        placeholder="Contacto"
                                    />
                                    <button type="button" onClick={guardarCliente}>
                                        <FaCheck />
                                        Guardar Cliente
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                                        {
                                            clientes.map((cliente) => (
                                                <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                                            ))
                                        }
                                    </select>
                                    <button type="button" className="presupuestoCrearClienteBtn" onClick={() => setCreandoCliente(true)}>
                                        <FaUserPlus />
                                        Crear Nuevo Cliente
                                    </button>
                                </>
                            )
                        }

                        <div className="presupuestoSeparador" />

                        <label>Agregar Producto</label>
                        <select value={productoId} onChange={(e) => {
                            setProductoId(e.target.value)
                            setCantidad("")
                            setTipoPrecio("minorista")
                        }}>
                            <option value="">Seleccionar...</option>
                            {
                                productos.map((producto) => (
                                    <option key={producto.id} value={producto.id}>
                                        {obtenerNombreProducto(producto)}
                                    </option>
                                ))
                            }
                        </select>

                        {
                            productoSeleccionado && (
                                <div className="presupuestoProductoConfig">
                                    <input
                                        type="number"
                                        min="0"
                                        max={stockDisponible}
                                        step={tipoStockProducto === "unidad" ? "1" : "0.01"}
                                        value={cantidad}
                                        onChange={(e) => cambiarCantidad(e.target.value)}
                                        placeholder={`Cantidad (${formatearTipoStock(tipoStockProducto)})`}
                                    />
                                    <div className="presupuestoPrecioGrid">
                                        <button
                                            type="button"
                                            className={tipoPrecio === "mayorista" ? "presupuestoPrecioActivo" : ""}
                                            onClick={() => setTipoPrecio("mayorista")}
                                        >
                                            Mayorista {formatearPrecio(precioMayorista)}
                                        </button>
                                        <button
                                            type="button"
                                            className={tipoPrecio === "minorista" ? "presupuestoPrecioActivo" : ""}
                                            onClick={() => setTipoPrecio("minorista")}
                                        >
                                            Minorista {formatearPrecio(precioMinorista)}
                                        </button>
                                    </div>
                                    <button type="button" onClick={agregarProducto} disabled={cantidadNumerica <= 0}>
                                        <AiOutlinePlus />
                                        Agregar
                                    </button>
                                </div>
                            )
                        }

                        {
                            items.length > 0 && (
                                <div className="presupuestoItemsForm">
                                    {
                                        items.map((item) => (
                                            <div key={item.id}>
                                                <span>{item.nombre} ({item.cantidad_kg} {formatearTipoStock(item.tipo_stock, item.cantidad_kg)})</span>
                                                <strong>{formatearPrecio(item.subtotal)}</strong>
                                                <button type="button" onClick={() => quitarProducto(item.id)} aria-label={`Quitar ${item.nombre}`}>
                                                    <FaTrashAlt />
                                                </button>
                                            </div>
                                        ))
                                    }
                                </div>
                            )
                        }

                        <div className="presupuestoFormFooter">
                            <span>Total</span>
                            <strong>{formatearPrecio(totalPresupuesto)}</strong>
                        </div>

                        <button type="button" className="presupuestoGuardarBtn" onClick={guardarPresupuesto} disabled={!clienteSeleccionado || items.length === 0}>
                            <FaCheck />
                            Guardar Presupuesto
                        </button>
                    </article>
                )
            }

            <h2 className="presupuestosTitulo">Pendientes</h2>

            <div className="presupuestosLista">
                {
                    presupuestosPendientes.length === 0 ? (
                        <p className="presupuestosVacio">No hay presupuestos pendientes</p>
                    ) : (
                        presupuestosPendientes.map((presupuesto) => (
                            <article key={presupuesto.id} className="presupuestoCard">
                                <div className="presupuestoCardHeader">
                                    <div>
                                        <h3>{presupuesto.cliente?.nombre || "Cliente sin nombre"}</h3>
                                        <span>{formatearFecha(presupuesto.fecha)}</span>
                                    </div>
                                    <strong>{formatearPrecio(presupuesto.total)}</strong>
                                </div>

                                <div className="presupuestoItems">
                                    {
                                        (presupuesto.items || []).map((item) => (
                                            <div key={item.id || item.producto_id}>
                                                <span>{item.nombre} ({item.cantidad_kg} {formatearTipoStock(item.tipo_stock, item.cantidad_kg)})</span>
                                                <strong>{formatearPrecio(item.subtotal)}</strong>
                                            </div>
                                        ))
                                    }
                                </div>

                                <div className="presupuestoAcciones">
                                    <button type="button" onClick={() => setPresupuestoActivo(presupuesto)}>
                                        <FaEye />
                                        Ver
                                    </button>
                                    <button type="button" onClick={() => descargarPresupuestoPDF(presupuesto)}>
                                        <FaDownload />
                                        PDF
                                    </button>
                                    <button type="button" onClick={() => convertirPresupuesto(presupuesto)}>
                                        <FaShoppingCart />
                                        Convertir
                                    </button>
                                    <button type="button" onClick={() => eliminarPresupuesto(presupuesto.id)}>
                                        <FaTrashAlt />
                                        Eliminar
                                    </button>
                                </div>
                            </article>
                        ))
                    )
                }
            </div>
        </div>

        {
            presupuestoActivo && (
                <div className="presupuestoModal">
                    <div className="presupuestoModalPanel">
                        <button type="button" className="presupuestoModalCerrar" onClick={() => setPresupuestoActivo(null)} aria-label="Cerrar presupuesto">
                            <FaTimes />
                        </button>
                        <h2>{presupuestoActivo.cliente?.nombre || "Cliente sin nombre"}</h2>
                        <span>{formatearFecha(presupuestoActivo.fecha)}</span>
                        <div className="presupuestoModalItems">
                            {
                                (presupuestoActivo.items || []).map((item) => (
                                    <div key={item.id || item.producto_id}>
                                        <p>{item.nombre}</p>
                                        <span>{item.cantidad_kg} {formatearTipoStock(item.tipo_stock, item.cantidad_kg)} x {formatearPrecio(item.precio_unitario)}</span>
                                        <strong>{formatearPrecio(item.subtotal)}</strong>
                                    </div>
                                ))
                            }
                        </div>
                        <div className="presupuestoModalTotal">
                            <span>Total</span>
                            <strong>{formatearPrecio(presupuestoActivo.total)}</strong>
                        </div>
                        <div className="presupuestoModalAcciones">
                            <button type="button" onClick={() => descargarPresupuestoPDF(presupuestoActivo)}>
                                <FaDownload />
                                Descargar PDF
                            </button>
                            <button type="button" onClick={() => convertirPresupuesto(presupuestoActivo)}>
                                <FaShoppingCart />
                                Convertir
                            </button>
                            <button type="button" onClick={() => eliminarPresupuesto(presupuestoActivo.id)}>
                                <FaTrashAlt />
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )
        }
    </section>
}
