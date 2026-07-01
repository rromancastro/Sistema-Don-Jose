"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AiOutlinePlus } from "react-icons/ai"
import { FaArrowLeft, FaCheck, FaDownload, FaHome, FaRegFileAlt, FaTimes, FaTrashAlt, FaUserPlus } from "react-icons/fa"
import { FiShoppingCart } from "react-icons/fi"
import { actualizarDocumento, crearDocumento, obtenerDocumentos } from "../lib/firebase"
import { NavComponent } from "./NavComponent"

const obtenerNombreProducto = (producto) => producto.nombre || producto.producto || "Producto sin nombre"
const obtenerStockProducto = (producto) => Number(producto.stock_kg ?? producto.stock ?? producto.cantidad_kg ?? 0)
const obtenerTipoStock = (producto) => producto.tipo_stock || "kg"
const obtenerPrecioMayorista = (producto) => Number(producto.precio_mayorista ?? producto.mayorista ?? producto.precioMayorista ?? producto.precio_kg ?? producto.precio ?? 0)
const obtenerPrecioMinorista = (producto) => Number(producto.precio_minorista ?? producto.minorista ?? producto.precioMinorista ?? producto.precio_venta ?? producto.precio ?? 0)
const obtenerCostoProducto = (producto) => Number(producto.costo ?? producto.costo_kg ?? producto.precio_costo ?? 0)
const formatearPrecio = (valor) => `$${Number(valor || 0).toFixed(2)}`
const formatearDocumento = (documento) => documento === "factura" ? "Factura" : "Remito"
const formatearMetodoPago = (metodo) => metodo === "transferencia" ? "Transferencia" : "Efectivo"
const formatearEstadoPago = (estado) => estado === "incompleto" ? "Incompleto" : "Completo"
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

export const VentaComponent = () => {
    const [clientes, setClientes] = useState([])
    const [productos, setProductos] = useState([])
    const [clienteId, setClienteId] = useState("")
    const [creandoCliente, setCreandoCliente] = useState(false)
    const [nuevoCliente, setNuevoCliente] = useState({
        nombre: "",
        contacto: "",
        dni_cuit: "",
        direccion: "",
    })
    const [productoId, setProductoId] = useState("")
    const [cantidadKg, setCantidadKg] = useState("")
    const [tipoPrecio, setTipoPrecio] = useState("minorista")
    const [carrito, setCarrito] = useState([])
    const [documento, setDocumento] = useState("remito")
    const [metodoPago, setMetodoPago] = useState("efectivo")
    const [estadoPago, setEstadoPago] = useState("completo")
    const [montoPagado, setMontoPagado] = useState("")
    const [observaciones, setObservaciones] = useState("")
    const [comprobanteVenta, setComprobanteVenta] = useState(null)
    const [generandoVenta, setGenerandoVenta] = useState(false)

    useEffect(() => {
        const cargarDatos = async () => {
            const [clientesData, productosData] = await Promise.all([
                obtenerDocumentos("clientes"),
                obtenerDocumentos("productos"),
            ])

            setClientes(clientesData)
            setProductos(productosData)
            setClienteId(clientesData[0]?.id || "")
        }

        cargarDatos()
    }, [])

    const productoSeleccionado = useMemo(() => {
        return productos.find((producto) => producto.id === productoId)
    }, [productos, productoId])

    const clienteSeleccionado = useMemo(() => {
        return clientes.find((cliente) => cliente.id === clienteId)
    }, [clientes, clienteId])

    const precioMayorista = productoSeleccionado ? obtenerPrecioMayorista(productoSeleccionado) : 0
    const precioMinorista = productoSeleccionado ? obtenerPrecioMinorista(productoSeleccionado) : 0
    const costoProducto = productoSeleccionado ? obtenerCostoProducto(productoSeleccionado) : 0
    const tipoStockProducto = productoSeleccionado ? obtenerTipoStock(productoSeleccionado) : "kg"
    const unidadStockProducto = formatearTipoStock(tipoStockProducto)
    const precioUnitario = tipoPrecio === "mayorista" ? precioMayorista : precioMinorista
    const cantidadNumerica = Number(cantidadKg || 0)
    const stockProductoSeleccionado = productoSeleccionado ? obtenerStockProducto(productoSeleccionado) : 0
    const cantidadProductoEnCarrito = productoSeleccionado
        ? carrito
            .filter((item) => item.producto_id === productoSeleccionado.id)
            .reduce((total, item) => total + item.cantidad_kg, 0)
        : 0
    const stockDisponible = Math.max(stockProductoSeleccionado - cantidadProductoEnCarrito, 0)
    const cantidadSuperaStock = productoSeleccionado && cantidadNumerica > stockDisponible
    const subtotal = cantidadNumerica * precioUnitario
    const ganancia = subtotal - (costoProducto * cantidadNumerica)
    const totalVenta = carrito.reduce((total, item) => total + item.subtotal, 0)
    const totalGanancia = carrito.reduce((total, item) => total + item.ganancia, 0)
    const montoPagadoNumerico = estadoPago === "completo" ? totalVenta : Number(montoPagado || 0)
    const montoDebe = estadoPago === "completo" ? 0 : Math.max(totalVenta - montoPagadoNumerico, 0)
    const pagoValido = estadoPago === "completo" || (montoPagadoNumerico >= 0 && montoPagadoNumerico <= totalVenta)
    const dniCuitClienteValido = Boolean((clienteSeleccionado?.dni_cuit || clienteSeleccionado?.dniCuit || "").trim())
    const direccionClienteValida = Boolean((clienteSeleccionado?.direccion || "").trim())
    const ventaValida = pagoValido && dniCuitClienteValido && direccionClienteValida

    const abrirCrearCliente = () => {
        setCreandoCliente(true)
    }

    const cancelarCrearCliente = () => {
        setCreandoCliente(false)
        setNuevoCliente({
            nombre: "",
            contacto: "",
            dni_cuit: "",
            direccion: "",
        })
    }

    const guardarCliente = async () => {
        if (!nuevoCliente.nombre.trim() || !nuevoCliente.dni_cuit.trim() || !nuevoCliente.direccion.trim()) return

        const clienteParaCrear = {
            nombre: nuevoCliente.nombre.trim(),
            telefono: nuevoCliente.contacto.trim(),
            email: "",
            dni_cuit: nuevoCliente.dni_cuit.trim(),
            direccion: nuevoCliente.direccion.trim(),
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
        setClienteId(id)
        cancelarCrearCliente()
    }

    const cambiarCantidadKg = (valor) => {
        if (valor === "") {
            setCantidadKg("")
            return
        }

        const nuevaCantidad = Number(valor)

        if (Number.isNaN(nuevaCantidad)) return

        const cantidadNormalizada = tipoStockProducto === "unidad" ? Math.floor(nuevaCantidad) : nuevaCantidad

        setCantidadKg(String(Math.max(Math.min(cantidadNormalizada, stockDisponible), 0)))
    }

    const cambiarMontoPagado = (valor) => {
        if (valor === "") {
            setMontoPagado("")
            return
        }

        const nuevoMonto = Number(valor)

        if (Number.isNaN(nuevoMonto)) return

        setMontoPagado(String(Math.max(Math.min(nuevoMonto, totalVenta), 0)))
    }

    const agregarAlCarrito = () => {
        if (!productoSeleccionado || cantidadNumerica <= 0 || cantidadSuperaStock) return

        setCarrito((itemsActuales) => [
            ...itemsActuales,
            {
                id: `${productoSeleccionado.id}-${Date.now()}`,
                producto_id: productoSeleccionado.id,
                nombre: obtenerNombreProducto(productoSeleccionado),
                cantidad_kg: cantidadNumerica,
                tipo_precio: tipoPrecio,
                tipo_stock: tipoStockProducto,
                precio_unitario: precioUnitario,
                costo_unitario: costoProducto,
                subtotal,
                ganancia,
            },
        ])
        setProductoId("")
        setCantidadKg("")
        setTipoPrecio("minorista")
    }

    const quitarDelCarrito = (itemId) => {
        setCarrito((itemsActuales) => itemsActuales.filter((item) => item.id !== itemId))
    }

    const emitirFacturaElectronica = async (comprobante) => {
        try {
            const respuesta = await fetch("/api/facturacion-electronica/emitir", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(comprobante),
            })
            const resultado = await respuesta.json()

            return {
                estado: resultado.estado || (respuesta.ok ? "emitida" : "error"),
                mensaje: resultado.mensaje || "",
                cae: resultado.cae || "",
                numero_comprobante: resultado.numero_comprobante || "",
                vencimiento_cae: resultado.vencimiento_cae || "",
                emitida_en: respuesta.ok && resultado.cae ? new Date().toISOString() : "",
                actualizado_en: new Date().toISOString(),
            }
        } catch (error) {
            return {
                estado: "error",
                mensaje: "No se pudo conectar con el servicio de facturacion electronica.",
                actualizado_en: new Date().toISOString(),
            }
        }
    }

    const descargarPDF = async () => {
        if (!comprobanteVenta) return

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
        pdf.text("Frutos Secos", anchoPagina / 2, y, { align: "center" })

        y += 8
        pdf.text(`${formatearDocumento(comprobanteVenta.tipo_documento)} - ${comprobanteVenta.fecha_hora}`, anchoPagina / 2, y, { align: "center" })

        if (comprobanteVenta.tipo_documento === "factura" && comprobanteVenta.factura_electronica) {
            y += 7
            const estadoFactura = comprobanteVenta.factura_electronica.cae
                ? `CAE: ${comprobanteVenta.factura_electronica.cae}`
                : `Factura electronica: ${comprobanteVenta.factura_electronica.mensaje || "pendiente"}`

            pdf.text(estadoFactura, anchoPagina / 2, y, { align: "center" })
        }

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
        pdf.text(comprobanteVenta.cliente.nombre, margen, y)

        if (comprobanteVenta.cliente.dni_cuit) {
            y += 7
            pdf.setFont("helvetica", "normal")
            pdf.setFontSize(10)
            pdf.setTextColor(54, 65, 99)
            pdf.text(`DNI/CUIT: ${comprobanteVenta.cliente.dni_cuit}`, margen, y)
        }

        if (comprobanteVenta.cliente.direccion) {
            y += 7
            pdf.setFont("helvetica", "normal")
            pdf.setFontSize(10)
            pdf.setTextColor(54, 65, 99)
            pdf.text(`Direccion: ${comprobanteVenta.cliente.direccion}`, margen, y)
        }

        y += 14
        comprobanteVenta.items.forEach((item) => {
            if (y > 260) {
                pdf.addPage()
                y = 22
            }

            pdf.setFillColor(248, 250, 252)
            pdf.roundedRect(margen, y - 7, anchoPagina - margen * 2, 18, 2, 2, "F")
            pdf.setFont("helvetica", "bold")
            pdf.setFontSize(11)
            pdf.setTextColor(15, 23, 42)
            pdf.text(item.nombre, margen + 4, y)
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
        pdf.setTextColor(0, 166, 62)
        pdf.text(formatearPrecio(comprobanteVenta.total), anchoPagina - margen, y, { align: "right" })

        y += 10
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(10)
        pdf.setTextColor(54, 65, 99)
        pdf.text(`Pago: ${formatearMetodoPago(comprobanteVenta.metodo_pago)} - ${formatearEstadoPago(comprobanteVenta.estado_pago)}`, margen, y)

        if (comprobanteVenta.estado_pago === "incompleto") {
            y += 6
            pdf.text(`Pagado: ${formatearPrecio(comprobanteVenta.monto_pagado)} - Debe: ${formatearPrecio(comprobanteVenta.monto_debe)}`, margen, y)
        }

        if (comprobanteVenta.observaciones) {
            y += 10
            pdf.setFont("helvetica", "normal")
            pdf.setFontSize(10)
            pdf.setTextColor(54, 65, 99)
            pdf.text("Observaciones", margen, y)
            y += 6
            pdf.text(pdf.splitTextToSize(comprobanteVenta.observaciones, anchoPagina - margen * 2), margen, y)
        }

        y += 18
        pdf.setFont("helvetica", "italic")
        pdf.setFontSize(9)
        pdf.setTextColor(74, 85, 121)
        pdf.text("Gracias por su compra!", anchoPagina / 2, y, { align: "center" })

        pdf.save(`${comprobanteVenta.tipo_documento}-don-jose-${comprobanteVenta.fecha}.pdf`)
    }

    const generarVenta = async () => {
        if (!clienteSeleccionado || carrito.length === 0 || !ventaValida || generandoVenta) return

        setGenerandoVenta(true)

        try {
            const fechaVenta = obtenerFechaActual()
            const fechaHoraVenta = formatearFechaHora(new Date())
            const itemsVenta = carrito.map((item) => ({ ...item }))
            const pagoVenta = {
                estado: estadoPago,
                estado_label: formatearEstadoPago(estadoPago),
                metodo: metodoPago,
                metodo_label: formatearMetodoPago(metodoPago),
                monto_debe: montoDebe,
                monto_pagado: montoPagadoNumerico,
                total: totalVenta,
            }
            const comprobanteParaGuardar = {
                negocio: {
                    nombre: "Don Jose",
                    rubro: "Frutos Secos",
                },
                cliente: {
                    id: clienteSeleccionado.id,
                    nombre: clienteSeleccionado.nombre || "",
                    telefono: clienteSeleccionado.telefono || "",
                    email: clienteSeleccionado.email || "",
                    dni_cuit: clienteSeleccionado.dni_cuit || clienteSeleccionado.dniCuit || "",
                    direccion: clienteSeleccionado.direccion || "",
                },
                fecha: fechaVenta,
                fecha_hora: fechaHoraVenta,
                ganancia_total: totalGanancia,
                items: itemsVenta.map((item) => ({
                    cantidad_kg: item.cantidad_kg,
                    costo_unitario: item.costo_unitario,
                    ganancia: item.ganancia,
                    id: item.id,
                    nombre: item.nombre,
                    precio_unitario: item.precio_unitario,
                    producto_id: item.producto_id,
                    subtotal: item.subtotal,
                    tipo_precio: item.tipo_precio,
                    tipo_stock: item.tipo_stock,
                })),
                pago: pagoVenta,
                estado_pago: estadoPago,
                metodo_pago: metodoPago,
                monto_debe: montoDebe,
                monto_pagado: montoPagadoNumerico,
                observaciones: observaciones.trim(),
                tipo_documento: documento,
                total: totalVenta,
            }

            const comprobanteId = await crearDocumento("comprobantes_venta", comprobanteParaGuardar)

            const ventasIds = await Promise.all(itemsVenta.map((item) => crearDocumento("ventas", {
                cantidad_kg: item.cantidad_kg,
                cliente: {
                    id: clienteSeleccionado.id,
                    nombre: clienteSeleccionado.nombre || "",
                    dni_cuit: clienteSeleccionado.dni_cuit || clienteSeleccionado.dniCuit || "",
                    direccion: clienteSeleccionado.direccion || "",
                },
                cliente_id: clienteSeleccionado.id,
                comprobante_id: comprobanteId,
                costo_unitario: item.costo_unitario,
                fecha: fechaVenta,
                fecha_hora: fechaHoraVenta,
                ganancia: item.ganancia,
                pago: pagoVenta,
                estado_pago: estadoPago,
                metodo_pago: metodoPago,
                monto_debe: montoDebe,
                monto_pagado: montoPagadoNumerico,
                observaciones: observaciones.trim(),
                precio_unitario: item.precio_unitario,
                producto: {
                    id: item.producto_id,
                    nombre: item.nombre,
                },
                producto_id: item.producto_id,
                producto_nombre: item.nombre,
                subtotal: item.subtotal,
                tipo_documento: documento,
                tipo_precio: item.tipo_precio,
                tipo_stock: item.tipo_stock,
            })))

            const comprobanteConIds = {
                id: comprobanteId,
                venta_ids: ventasIds,
                ...comprobanteParaGuardar,
            }
            const facturaElectronica = documento === "factura"
                ? await emitirFacturaElectronica(comprobanteConIds)
                : null
            const datosComprobanteActualizado = {
                id: comprobanteId,
                venta_ids: ventasIds,
                ...(facturaElectronica ? { factura_electronica: facturaElectronica } : {}),
            }

            await actualizarDocumento("comprobantes_venta", comprobanteId, datosComprobanteActualizado)

            const clienteActualizado = {
                facturacion: Number(clienteSeleccionado.facturacion || 0) + totalVenta,
                ganancia: Number(clienteSeleccionado.ganancia || 0) + totalGanancia,
                deuda: Number(clienteSeleccionado.deuda || 0) + montoDebe,
                ventas: Number(clienteSeleccionado.ventas || 0) + 1,
            }

            await actualizarDocumento("clientes", clienteSeleccionado.id, clienteActualizado)

            setClientes((clientesActuales) => clientesActuales.map((cliente) => {
                if (cliente.id !== clienteSeleccionado.id) return cliente

                return {
                    ...cliente,
                    ...clienteActualizado,
                }
            }))

            setComprobanteVenta({
                ...comprobanteConIds,
                ...(facturaElectronica ? { factura_electronica: facturaElectronica } : {}),
            })
            setCarrito([])
            setProductoId("")
            setCantidadKg("")
            setTipoPrecio("minorista")
            setDocumento("remito")
            setMetodoPago("efectivo")
            setEstadoPago("completo")
            setMontoPagado("")
            setObservaciones("")
        } finally {
            setGenerandoVenta(false)
        }
    }

    if (comprobanteVenta) {
        return <section className="ventaComprobantePage">
            <div className="ventaComprobanteIcono">
                <FaCheck />
            </div>
            <h1>Venta Registrada</h1>
            <p>{formatearDocumento(comprobanteVenta.tipo_documento)} de Venta</p>

            <article className="ventaComprobanteCard" id="ventaComprobante">
                <div className="ventaComprobanteMarca">
                    <h2>Don José</h2>
                    <p>Frutos Secos</p>
                    <span>{comprobanteVenta.fecha_hora}</span>
                </div>

                {
                    comprobanteVenta.tipo_documento === "factura" && (
                        <div className={`ventaFacturaElectronica ${comprobanteVenta.factura_electronica?.cae ? "ventaFacturaElectronicaEmitida" : "ventaFacturaElectronicaPendiente"}`}>
                            <span>Factura electronica</span>
                            <strong>{comprobanteVenta.factura_electronica?.cae ? "CAE emitido" : "Pendiente"}</strong>
                            {
                                comprobanteVenta.factura_electronica?.cae ? (
                                    <p>CAE: {comprobanteVenta.factura_electronica.cae}</p>
                                ) : (
                                    <p>{comprobanteVenta.factura_electronica?.mensaje || "No se recibio CAE."}</p>
                                )
                            }
                        </div>
                    )
                }

                <div className="ventaComprobanteCliente">
                    <span>Cliente</span>
                    <strong>{comprobanteVenta.cliente.nombre}</strong>
                    {
                        comprobanteVenta.cliente.dni_cuit && (
                            <p>DNI/CUIT: {comprobanteVenta.cliente.dni_cuit}</p>
                        )
                    }
                    {
                        comprobanteVenta.cliente.direccion && (
                            <p>Direccion: {comprobanteVenta.cliente.direccion}</p>
                        )
                    }
                </div>

                <div className="ventaComprobanteItems">
                    {
                        comprobanteVenta.items.map((item) => (
                            <div key={item.id} className="ventaComprobanteItem">
                                <div>
                                    <p>{item.nombre}</p>
                                    <span>{item.cantidad_kg} {formatearTipoStock(item.tipo_stock, item.cantidad_kg)} x {formatearPrecio(item.precio_unitario)}/{formatearTipoStock(item.tipo_stock)}</span>
                                </div>
                                <strong>{formatearPrecio(item.subtotal)}</strong>
                            </div>
                        ))
                    }
                </div>

                <div className="ventaComprobanteTotal">
                    <span>Total</span>
                    <strong>{formatearPrecio(comprobanteVenta.total)}</strong>
                </div>

                <div className="ventaComprobantePago">
                    <span>Pago</span>
                    <strong>{formatearMetodoPago(comprobanteVenta.metodo_pago)} - {formatearEstadoPago(comprobanteVenta.estado_pago)}</strong>
                    {
                        comprobanteVenta.estado_pago === "incompleto" && (
                            <p>Pagó {formatearPrecio(comprobanteVenta.monto_pagado)} - Debe {formatearPrecio(comprobanteVenta.monto_debe)}</p>
                        )
                    }
                </div>

                {
                    comprobanteVenta.observaciones && (
                        <div className="ventaComprobanteObservaciones">
                            <span>Observaciones</span>
                            <p>{comprobanteVenta.observaciones}</p>
                        </div>
                    )
                }

                <p className="ventaComprobanteGracias">¡Gracias por su compra!</p>
            </article>

            <div className="ventaComprobanteAcciones">
                <button type="button" onClick={descargarPDF}>
                    <FaDownload />
                    Descargar PDF
                </button>
                <Link href="/">
                    <FaHome />
                    Volver al Inicio
                </Link>
            </div>
        </section>
    }

    return <section>
        <NavComponent bgColor="#00A63E" >
            <Link href={'/'}>
                <FaArrowLeft />
            </Link>
            <h1>Nueva Venta</h1>
        </NavComponent>

        <div id="ventaContainer">
            <div className="ventaCampo">
                <label>Cliente</label>
                {
                    creandoCliente ? (
                        <article className="ventaCrearCliente">
                            <div>
                                <p>Nuevo Cliente</p>
                                <button type="button" onClick={cancelarCrearCliente} aria-label="Cancelar cliente">
                                    <FaTimes />
                                </button>
                            </div>
                            <form onSubmit={(e) => {
                                e.preventDefault()
                                guardarCliente()
                            }}>
                                <input
                                    type="text"
                                    value={nuevoCliente.nombre}
                                    onChange={(e) => setNuevoCliente((clienteActual) => ({
                                        ...clienteActual,
                                        nombre: e.target.value,
                                    }))}
                                    placeholder="Nombre del cliente"
                                    required
                                />
                                <input
                                    type="text"
                                    value={nuevoCliente.contacto}
                                    onChange={(e) => setNuevoCliente((clienteActual) => ({
                                        ...clienteActual,
                                        contacto: e.target.value,
                                    }))}
                                    placeholder="Contacto (opcional)"
                                />
                                <input
                                    type="text"
                                    value={nuevoCliente.dni_cuit}
                                    onChange={(e) => setNuevoCliente((clienteActual) => ({
                                        ...clienteActual,
                                        dni_cuit: e.target.value,
                                    }))}
                                    placeholder="DNI/CUIT"
                                    required
                                />
                                <input
                                    type="text"
                                    value={nuevoCliente.direccion}
                                    onChange={(e) => setNuevoCliente((clienteActual) => ({
                                        ...clienteActual,
                                        direccion: e.target.value,
                                    }))}
                                    placeholder="Direccion"
                                    required
                                />
                                <button type="submit" disabled={!nuevoCliente.nombre.trim() || !nuevoCliente.dni_cuit.trim() || !nuevoCliente.direccion.trim()}>
                                    <FaCheck />
                                    Guardar Cliente
                                </button>
                            </form>
                        </article>
                    ) : (
                        <>
                            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                                {
                                    clientes.map((cliente) => (
                                        <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                                    ))
                                }
                            </select>
                            <button type="button" className="ventaCrearClienteBtn" onClick={abrirCrearCliente}>
                                <FaUserPlus />
                                Crear Nuevo Cliente
                            </button>
                            {
                                clienteSeleccionado && !dniCuitClienteValido && (
                                    <p className="ventaClienteRequerido">El cliente necesita DNI/CUIT para generar la venta.</p>
                                )
                            }
                            {
                                clienteSeleccionado && !direccionClienteValida && (
                                    <p className="ventaClienteRequerido">El cliente necesita direccion para generar la venta.</p>
                                )
                            }
                        </>
                    )
                }
            </div>

            <article className="ventaAgregarProducto">
                <h2>
                    <AiOutlinePlus />
                    Agregar Producto
                </h2>
                <label>Producto</label>
                <select value={productoId} onChange={(e) => {
                    setProductoId(e.target.value)
                    setCantidadKg("")
                }}>
                    <option value="">Seleccionar...</option>
                    {
                        productos.map((producto) => (
                            <option key={producto.id} value={producto.id}>
                                {obtenerNombreProducto(producto)} (Stock: {obtenerStockProducto(producto)} {formatearTipoStock(obtenerTipoStock(producto), obtenerStockProducto(producto))})
                            </option>
                        ))
                    }
                </select>

                {
                    productoSeleccionado && (
                        <>
                            <label>Cantidad ({unidadStockProducto})</label>
                            <input
                                type="number"
                                min="0"
                                max={stockDisponible}
                                step={tipoStockProducto === "unidad" ? "1" : "0.01"}
                                value={cantidadKg}
                                onChange={(e) => cambiarCantidadKg(e.target.value)}
                                placeholder="0"
                            />
                            <p className="ventaStockDisponible">Stock disponible: {stockDisponible} {formatearTipoStock(tipoStockProducto, stockDisponible)}</p>

                            <label>Tipo de Precio</label>
                            <div className="ventaPrecioGrid">
                                <button
                                    type="button"
                                    className={tipoPrecio === "mayorista" ? "ventaPrecioActivo" : ""}
                                    onClick={() => setTipoPrecio("mayorista")}
                                >
                                    <span>Mayorista</span>
                                    {formatearPrecio(precioMayorista)}
                                </button>
                                <button
                                    type="button"
                                    className={tipoPrecio === "minorista" ? "ventaPrecioActivo" : ""}
                                    onClick={() => setTipoPrecio("minorista")}
                                >
                                    <span>Minorista</span>
                                    {formatearPrecio(precioMinorista)}
                                </button>
                            </div>

                            {
                                cantidadNumerica > 0 && (
                                    <div className="ventaSubtotal">
                                        <p>Subtotal</p>
                                        <span>{formatearPrecio(subtotal)}</span>
                                    </div>
                                )
                            }

                            <button
                                type="button"
                                className="ventaAgregarCarritoBtn"
                                onClick={agregarAlCarrito}
                                disabled={!productoSeleccionado || cantidadNumerica <= 0 || cantidadSuperaStock || stockDisponible <= 0}
                            >
                                <AiOutlinePlus />
                                Agregar al Carrito
                            </button>
                        </>
                    )
                }
            </article>

            {
                carrito.length === 0 ? (
                    <p className="ventaCarritoVacio">Agregue productos al carrito para continuar</p>
                ) : (
                    <>
                        <div className="ventaCarritoTitulo">
                            <FiShoppingCart />
                            <h2>Carrito ({carrito.length} {carrito.length === 1 ? "producto" : "productos"})</h2>
                        </div>
                        <div className="ventaCarritoLista">
                            {
                                carrito.map((item) => (
                                    <article key={item.id} className="ventaCarritoItem">
                                        <div>
                                            <p>{item.nombre}</p>
                                            <span>{item.cantidad_kg} {formatearTipoStock(item.tipo_stock, item.cantidad_kg)} * {formatearPrecio(item.precio_unitario)}</span>
                                        </div>
                                        <button type="button" onClick={() => quitarDelCarrito(item.id)} aria-label={`Quitar ${item.nombre}`}>
                                            <FaTrashAlt />
                                        </button>
                                        <strong>{formatearPrecio(item.subtotal)}</strong>
                                    </article>
                                ))
                            }
                        </div>
                        <div className="ventaTotal">
                            <p>Total de la Venta</p>
                            <span>{formatearPrecio(totalVenta)}</span>
                        </div>
                        <div className="ventaDocumento">
                            <label>
                                <FaRegFileAlt />
                                Generar Documento
                            </label>
                            <select value={documento} onChange={(e) => setDocumento(e.target.value)}>
                                <option value="remito">Remito</option>
                                <option value="factura">Factura</option>
                            </select>
                        </div>
                        <div className="ventaObservaciones">
                            <label>Observaciones</label>
                            <textarea
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                placeholder="Agregar observaciones para el remito..."
                                rows={4}
                            />
                        </div>
                        <div className="ventaPago">
                            <label>Método de pago</label>
                            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                            </select>

                            <label>Estado del pago</label>
                            <div className="ventaPagoEstado">
                                <button
                                    type="button"
                                    className={estadoPago === "completo" ? "ventaPagoActivo" : ""}
                                    onClick={() => {
                                        setEstadoPago("completo")
                                        setMontoPagado("")
                                    }}
                                >
                                    Completo
                                </button>
                                <button
                                    type="button"
                                    className={estadoPago === "incompleto" ? "ventaPagoActivo" : ""}
                                    onClick={() => setEstadoPago("incompleto")}
                                >
                                    Incompleto
                                </button>
                            </div>

                            {
                                estadoPago === "incompleto" && (
                                    <>
                                        <label>Monto que pagó</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={totalVenta}
                                            step="0.01"
                                            value={montoPagado}
                                            onChange={(e) => cambiarMontoPagado(e.target.value)}
                                            placeholder="0.00"
                                        />
                                        <div className="ventaDeuda">
                                            <p>Monto que debe</p>
                                            <span>{formatearPrecio(montoDebe)}</span>
                                        </div>
                                    </>
                                )
                            }
                        </div>
                        <button type="button" className="ventaGenerarBtn" onClick={generarVenta} disabled={!ventaValida || generandoVenta}>
                            <FaCheck />
                            {generandoVenta ? "Generando..." : "Generar Venta"}
                        </button>
                    </>
                )
            }
        </div>
    </section>
}
