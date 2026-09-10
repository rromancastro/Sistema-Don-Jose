"use client"

import Link from "next/link"
import { SelectorProducto } from "./SelectorProducto"
import { SelectorPorNombre } from "./SelectorPorNombre"
import { useEffect, useMemo, useState } from "react"
import { AiOutlinePlus } from "react-icons/ai"
import { FaArrowLeft, FaCheck, FaRegFileAlt, FaTimes, FaTrashAlt, FaUserPlus } from "react-icons/fa"
import { FiShoppingCart } from "react-icons/fi"
import { formatearFechaHora, obtenerFechaActual } from "../lib/fechas"
import { actualizarDocumento, crearDocumento, obtenerDocumentos } from "../lib/firebase"
import {
    formatearDineroConDecimales as formatearPrecio,
    formatearTipoStock,
    normalizarCliente,
    normalizarLista,
    normalizarProducto,
    obtenerCostoProducto,
    obtenerNombreProducto,
    obtenerPrecioMayorista,
    obtenerPrecioMinorista,
    obtenerStockProducto,
    obtenerTipoStock,
} from "../lib/normalizadores"
import { registrarVenta } from "../lib/ventas"
import { NavComponent } from "./NavComponent"
import { VentaComprobante } from "./venta/VentaComprobante"

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
    const [datosClientePendientes, setDatosClientePendientes] = useState({
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

            const clientesNormalizados = normalizarLista(clientesData, normalizarCliente)

            setClientes(clientesNormalizados)
            setProductos(normalizarLista(productosData, normalizarProducto))
            setClienteId(clientesNormalizados[0]?.id || "")
        }

        cargarDatos()
    }, [])

    const productoSeleccionado = useMemo(() => {
        return productos.find((producto) => producto.id === productoId)
    }, [productos, productoId])

    const clienteSeleccionado = useMemo(() => {
        return clientes.find((cliente) => cliente.id === clienteId)
    }, [clientes, clienteId])

    useEffect(() => {
        setDatosClientePendientes({
            dni_cuit: clienteSeleccionado?.dni_cuit || "",
            direccion: clienteSeleccionado?.direccion || "",
        })
    }, [clienteSeleccionado])

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
    const dniCuitClienteValido = Boolean((clienteSeleccionado?.dni_cuit || "").trim())
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
            normalizarCliente({
                id,
                ...clienteParaCrear,
            }),
            ...clientesActuales,
        ])
        setClienteId(id)
        cancelarCrearCliente()
    }

    const guardarDatosClientePendientes = async () => {
        if (!clienteSeleccionado) return

        const dniCuit = datosClientePendientes.dni_cuit.trim()
        const direccion = datosClientePendientes.direccion.trim()

        if (!dniCuit || !direccion) return

        const clienteActualizado = {
            dni_cuit: dniCuit,
            direccion,
        }

        await actualizarDocumento("clientes", clienteSeleccionado.id, clienteActualizado)

        setClientes((clientesActuales) => clientesActuales.map((cliente) => {
            if (cliente.id !== clienteSeleccionado.id) return cliente

            return normalizarCliente({
                ...cliente,
                ...clienteActualizado,
            })
        }))
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

    const generarVenta = async () => {
        if (!clienteSeleccionado || carrito.length === 0 || !ventaValida || generandoVenta) return

        setGenerandoVenta(true)

        try {
            const { clienteActualizado, comprobante } = await registrarVenta({
                cliente: clienteSeleccionado,
                documento,
                estadoPago,
                fechaHoraVenta: formatearFechaHora(new Date()),
                fechaVenta: obtenerFechaActual(),
                gananciaTotal: totalGanancia,
                items: carrito,
                metodoPago,
                montoDebe,
                montoPagado: montoPagadoNumerico,
                observaciones,
                total: totalVenta,
                emitirFacturaElectronica,
            })

            setClientes((clientesActuales) => clientesActuales.map((cliente) => {
                if (cliente.id !== clienteSeleccionado.id) return cliente

                return normalizarCliente({
                    ...cliente,
                    ...clienteActualizado,
                })
            }))

            setComprobanteVenta(comprobante)
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

    if (comprobanteVenta) return <VentaComprobante comprobanteVenta={comprobanteVenta} />

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
                            <SelectorPorNombre opciones={clientes} value={clienteId} entidad="Cliente" onChange={id => { setClienteId(id); setCreandoCliente(false) }} />
                            <button type="button" className="ventaCrearClienteBtn" onClick={abrirCrearCliente}>
                                <FaUserPlus />
                                Crear Nuevo Cliente
                            </button>
                            {
                                clienteSeleccionado && (!dniCuitClienteValido || !direccionClienteValida) && (
                                    <article className="ventaCompletarCliente">
                                        <div>
                                            <p>Completar datos del cliente</p>
                                            <span>Estos datos son necesarios para generar la venta.</span>
                                        </div>
                                        <form onSubmit={(e) => {
                                            e.preventDefault()
                                            guardarDatosClientePendientes()
                                        }}>
                                            {
                                                !dniCuitClienteValido && (
                                                    <input
                                                        type="text"
                                                        value={datosClientePendientes.dni_cuit}
                                                        onChange={(e) => setDatosClientePendientes((datosActuales) => ({
                                                            ...datosActuales,
                                                            dni_cuit: e.target.value,
                                                        }))}
                                                        placeholder="DNI/CUIT"
                                                        aria-label="DNI o CUIT del cliente"
                                                        required
                                                    />
                                                )
                                            }
                                            {
                                                !direccionClienteValida && (
                                                    <input
                                                        type="text"
                                                        value={datosClientePendientes.direccion}
                                                        onChange={(e) => setDatosClientePendientes((datosActuales) => ({
                                                            ...datosActuales,
                                                            direccion: e.target.value,
                                                        }))}
                                                        placeholder="Direccion"
                                                        aria-label="Direccion del cliente"
                                                        required
                                                    />
                                                )
                                            }
                                            <button type="submit" disabled={!datosClientePendientes.dni_cuit.trim() || !datosClientePendientes.direccion.trim()}>
                                                <FaCheck />
                                                Guardar datos
                                            </button>
                                        </form>
                                    </article>
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
                <SelectorProducto productos={productos} value={productoId} entidad="Producto" onChange={id => { setProductoId(id); setCantidadKg("") }} />

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
