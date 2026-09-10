"use client"

import Link from "next/link"
import { SelectorProducto } from "./SelectorProducto"
import { SelectorPorNombre } from "./SelectorPorNombre"
import { useEffect, useMemo, useState } from "react"
import { AiOutlinePlus } from "react-icons/ai"
import { FaArrowLeft, FaCheck, FaDownload, FaEye, FaShoppingCart, FaTimes, FaTrashAlt, FaUserPlus } from "react-icons/fa"
import { FiFileText } from "react-icons/fi"
import { descargarCotizacionPDF } from "../lib/documentosPdf"
import { formatearFecha, formatearFechaHora, obtenerFechaActual } from "../lib/fechas"
import { actualizarDocumento, crearDocumento, eliminarDocumento, obtenerDocumentos } from "../lib/firebase"
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

const clienteVacio = {
    nombre: "",
    contacto: "",
}

const camposContacto = [
    ["telefono", "Teléfono"], ["celular", "Celular"], ["email", "Email"],
    ["direccion", "Dirección"], ["barrio", "Barrio"], ["ciudad", "Ciudad"],
    ["provincia", "Provincia / Estado"], ["codigo_postal", "Código postal"],
]

export const CotizacionesComponent = () => {
    const [clientes, setClientes] = useState([])
    const [productos, setProductos] = useState([])
    const [cotizaciones, setCotizaciones] = useState([])
    const [creandoCotizacion, setCreandoCotizacion] = useState(false)
    const [creandoCliente, setCreandoCliente] = useState(false)
    const [clienteId, setClienteId] = useState("")
    const [nuevoCliente, setNuevoCliente] = useState(clienteVacio)
    const [productoId, setProductoId] = useState("")
    const [cantidad, setCantidad] = useState("")
    const [tipoPrecio, setTipoPrecio] = useState("minorista")
    const [items, setItems] = useState([])
    const [cotizacionActivo, setCotizacionActivo] = useState(null)
    const [datosCotizacion, setDatosCotizacion] = useState({ fecha: "", vendedor: "", observaciones: "" })
    const [contactoCotizacion, setContactoCotizacion] = useState({})
    const [guardando, setGuardando] = useState(false)
    const [errorCotizacion, setErrorCotizacion] = useState("")

    const cambiarDatoCotizacion = (campo, valor) => setDatosCotizacion(actual => ({ ...actual, [campo]: valor }))

    useEffect(() => {
        const cargarDatos = async () => {
            const [clientesData, productosData, cotizacionesData] = await Promise.all([
                obtenerDocumentos("clientes"),
                obtenerDocumentos("productos"),
                obtenerDocumentos("cotizaciones"),
            ])

            const clientesNormalizados = normalizarLista(clientesData, normalizarCliente)

            setClientes(clientesNormalizados)
            setProductos(normalizarLista(productosData, normalizarProducto))
            setCotizaciones(cotizacionesData)
            setClienteId(clientesNormalizados[0]?.id || "")
        }

        cargarDatos()
    }, [])

    const clienteSeleccionado = useMemo(() => {
        return clientes.find((cliente) => cliente.id === clienteId)
    }, [clientes, clienteId])

    const productoSeleccionado = useMemo(() => {
        return productos.find((producto) => producto.id === productoId)
    }, [productos, productoId])

    const cotizacionesPendientes = useMemo(() => {
        return cotizaciones
            .filter((cotizacion) => (cotizacion.estado || "pendiente") === "pendiente")
            .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")))
    }, [cotizaciones])

    const tipoStockProducto = productoSeleccionado ? obtenerTipoStock(productoSeleccionado) : "kg"
    const cantidadNumerica = Number(cantidad || 0)
    const stockDisponible = productoSeleccionado ? obtenerStockProducto(productoSeleccionado) : 0
    const precioMayorista = productoSeleccionado ? obtenerPrecioMayorista(productoSeleccionado) : 0
    const precioMinorista = productoSeleccionado ? obtenerPrecioMinorista(productoSeleccionado) : 0
    const precioProducto = tipoPrecio === "mayorista" ? precioMayorista : precioMinorista
    const costoProducto = productoSeleccionado ? obtenerCostoProducto(productoSeleccionado) : 0
    const totalCotizacion = items.reduce((total, item) => total + Number(item.subtotal || 0), 0)

    const abrirCrearCotizacion = () => {
        setDatosCotizacion({ fecha: obtenerFechaActual(), vendedor: "", observaciones: "" })
        setContactoCotizacion({})
        setErrorCotizacion("")
        setCreandoCotizacion(true)
        setCotizacionActivo(null)
    }

    const cancelarCrearCotizacion = () => {
        setCreandoCotizacion(false)
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
            normalizarCliente({
                id,
                ...clienteParaCrear,
            }),
            ...clientesActuales,
        ])
        setClienteId(id)
        setContactoCotizacion({})
        setCreandoCliente(false)
        setNuevoCliente(clienteVacio)
    }

    const agregarProducto = () => {
        if (!productoSeleccionado || cantidadNumerica <= 0) return

        const item = {
            id: crypto.randomUUID(),
            id_producto: productoSeleccionado.id_producto || "",
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

    const guardarCotizacion = async () => {
        if (guardando) return
        if (!clienteSeleccionado || items.length === 0 || !datosCotizacion.fecha || !datosCotizacion.vendedor.trim()) {
            setErrorCotizacion("Completá fecha y vendedor, seleccioná un cliente y agregá al menos un producto.")
            return
        }

        const cotizacionParaCrear = {
            cliente: {
                id: clienteSeleccionado.id,
                nombre: clienteSeleccionado.nombre || "",
                telefono: clienteSeleccionado.telefono || "",
                email: clienteSeleccionado.email || "",
                ...Object.fromEntries(camposContacto.map(([campo]) => [campo, String(contactoCotizacion[campo] ?? clienteSeleccionado[campo] ?? "").trim()])),
            },
            cliente_id: clienteSeleccionado.id,
            estado: "pendiente",
            ...Object.fromEntries(Object.entries(datosCotizacion).map(([campo, valor]) => [campo, valor.trim()])),
            items,
            total: totalCotizacion,
        }

        setGuardando(true)
        setErrorCotizacion("")
        try {
            const id = await crearDocumento("cotizaciones", cotizacionParaCrear)

            setCotizaciones((cotizacionesActuales) => [
                {
                    id,
                    ...cotizacionParaCrear,
                    numero: id,
                },
                ...cotizacionesActuales,
            ])
            cancelarCrearCotizacion()
        } catch {
            setErrorCotizacion("No se pudo guardar la cotización. Intentá nuevamente.")
        } finally {
            setGuardando(false)
        }
    }

    const eliminarCotizacion = async (cotizacionId) => {
        await eliminarDocumento("cotizaciones", cotizacionId)
        setCotizaciones((cotizacionesActuales) => cotizacionesActuales.filter((cotizacion) => cotizacion.id !== cotizacionId))
        setCotizacionActivo((cotizacionActual) => cotizacionActual?.id === cotizacionId ? null : cotizacionActual)
    }

    const convertirCotizacion = async (cotizacion) => {
        const fechaVenta = obtenerFechaActual()
        const fechaHoraVenta = formatearFechaHora(new Date())
        const totalVenta = Number(cotizacion.total || 0)
        const totalGanancia = (cotizacion.items || []).reduce((total, item) => total + Number(item.ganancia || 0), 0)
        const cliente = {
            ...(clientes.find((clienteItem) => clienteItem.id === cotizacion.cliente_id) || {}),
            ...(cotizacion.cliente || {}),
            id: cotizacion.cliente_id || cotizacion.cliente?.id || "",
        }
        const { clienteActualizado, comprobante } = await registrarVenta({
            cliente,
            documento: "remito",
            estadoPago: "completo",
            fechaHoraVenta,
            fechaVenta,
            gananciaTotal: totalGanancia,
            items: cotizacion.items || [],
            metodoPago: "efectivo",
            montoDebe: 0,
            montoPagado: totalVenta,
            observaciones: cotizacion.observaciones || "",
            total: totalVenta,
            extraComprobante: {
                origen_cotizacion_id: cotizacion.id,
            },
            extraVenta: {
                origen_cotizacion_id: cotizacion.id,
            },
        })

        if (cotizacion.cliente_id) {
            setClientes((clientesActuales) => clientesActuales.map((clienteItem) => {
                if (clienteItem.id !== cotizacion.cliente_id) return clienteItem

                return normalizarCliente({
                    ...clienteItem,
                    ...clienteActualizado,
                })
            }))
        }

        const cotizacionActualizado = {
            comprobante_id: comprobante.id,
            estado: "convertido",
            fecha_conversion: fechaVenta,
            venta_ids: comprobante.venta_ids,
        }

        await actualizarDocumento("cotizaciones", cotizacion.id, cotizacionActualizado)
        setCotizaciones((cotizacionesActuales) => cotizacionesActuales.map((cotizacionItem) => {
            if (cotizacionItem.id !== cotizacion.id) return cotizacionItem

            return {
                ...cotizacionItem,
                ...cotizacionActualizado,
            }
        }))
        setCotizacionActivo(null)
    }

    const descargarCotizacion = async (cotizacion) => {
        try {
            await descargarCotizacionPDF(cotizacion)
        } catch {
            alert("No se pudo generar el PDF. Intentá nuevamente.")
        }
    }

    return <section>
        <NavComponent bgColor="#9810FA" >
            <Link href={'/'}>
                <FaArrowLeft />
            </Link>
            <h1>Cotizaciones</h1>
            <AiOutlinePlus color="#9810FA" onClick={abrirCrearCotizacion} />
        </NavComponent>

        <div id="cotizacionesContainer">
            {
                creandoCotizacion && (
                    <article className="cotizacionForm">
                        <div className="cotizacionFormHeader">
                            <h2>
                                <FiFileText />
                                Nueva Cotización
                            </h2>
                            <button type="button" onClick={cancelarCrearCotizacion} aria-label="Cerrar nueva cotización">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="cotizacionDatosGrid">
                            <label>Número de cotización
                                <input value="Se asigna automáticamente al guardar" readOnly />
                            </label>
                            <label>Fecha *
                                <input type="date" value={datosCotizacion.fecha} onChange={e => cambiarDatoCotizacion("fecha", e.target.value)} />
                            </label>
                            <label>Vendedor *
                                <input value={datosCotizacion.vendedor} maxLength={100} onChange={e => cambiarDatoCotizacion("vendedor", e.target.value)} />
                            </label>
                        </div>
                        <label>Cliente</label>
                        {
                            creandoCliente ? (
                                <div className="cotizacionNuevoCliente">
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
                                    <SelectorPorNombre opciones={clientes} value={clienteId} entidad="Cliente" onChange={id => { setClienteId(id); setContactoCotizacion({}) }} />
                                    <button type="button" className="cotizacionCrearClienteBtn" onClick={() => setCreandoCliente(true)}>
                                        <FaUserPlus />
                                        Crear Nuevo Cliente
                                    </button>
                                </>
                            )
                        }

                        {clienteSeleccionado && <div className="cotizacionDatosGrid">
                            {camposContacto.map(([campo, etiqueta]) => <label key={campo}>{etiqueta}
                                <input value={contactoCotizacion[campo] ?? clienteSeleccionado[campo] ?? ""}
                                    maxLength={campo === "direccion" ? 200 : 100}
                                    onChange={e => setContactoCotizacion(actual => ({ ...actual, [campo]: e.target.value }))} />
                            </label>)}
                        </div>}
                        <div className="cotizacionSeparador" />

                        <label>Agregar Producto</label>
                        <SelectorProducto productos={productos} value={productoId} entidad="Producto" onChange={id => { setProductoId(id); setCantidad(""); setTipoPrecio("minorista") }} />

                        {
                            productoSeleccionado && (
                                <div className="cotizacionProductoConfig">
                                    <input
                                        type="number"
                                        min="0"
                                        max={stockDisponible}
                                        step={tipoStockProducto === "unidad" ? "1" : "0.01"}
                                        value={cantidad}
                                        onChange={(e) => cambiarCantidad(e.target.value)}
                                        placeholder={`Cantidad (${formatearTipoStock(tipoStockProducto)})`}
                                    />
                                    <div className="cotizacionPrecioGrid">
                                        <button
                                            type="button"
                                            className={tipoPrecio === "mayorista" ? "cotizacionPrecioActivo" : ""}
                                            onClick={() => setTipoPrecio("mayorista")}
                                        >
                                            Mayorista {formatearPrecio(precioMayorista)}
                                        </button>
                                        <button
                                            type="button"
                                            className={tipoPrecio === "minorista" ? "cotizacionPrecioActivo" : ""}
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
                                <div className="cotizacionItemsForm">
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

                        <label>Observaciones
                            <textarea rows={3} maxLength={5000} value={datosCotizacion.observaciones} onChange={e => cambiarDatoCotizacion("observaciones", e.target.value)} />
                        </label>
                        {errorCotizacion && <p role="alert">{errorCotizacion}</p>}
                        <div className="cotizacionFormFooter">
                            <span>Total</span>
                            <strong>{formatearPrecio(totalCotizacion)}</strong>
                        </div>

                        <button type="button" className="cotizacionGuardarBtn" onClick={guardarCotizacion} disabled={guardando || !clienteSeleccionado || items.length === 0}>
                            <FaCheck />
                            Guardar Cotización
                        </button>
                    </article>
                )
            }

            <h2 className="cotizacionesTitulo">Pendientes</h2>

            <div className="cotizacionesLista">
                {
                    cotizacionesPendientes.length === 0 ? (
                        <p className="cotizacionesVacio">No hay cotizaciones pendientes</p>
                    ) : (
                        cotizacionesPendientes.map((cotizacion) => (
                            <article key={cotizacion.id} className="cotizacionCard">
                                <div className="cotizacionCardHeader">
                                    <div>
                                        <h3>{cotizacion.cliente?.nombre || "Cliente sin nombre"}</h3>
                                        <span>N° {cotizacion.numero} · {formatearFecha(cotizacion.fecha)}</span>
                                    </div>
                                    <strong>{formatearPrecio(cotizacion.total)}</strong>
                                </div>

                                <div className="cotizacionItems">
                                    {
                                        (cotizacion.items || []).map((item) => (
                                            <div key={item.id || item.producto_id}>
                                                <span>{item.nombre} ({item.cantidad_kg} {formatearTipoStock(item.tipo_stock, item.cantidad_kg)})</span>
                                                <strong>{formatearPrecio(item.subtotal)}</strong>
                                            </div>
                                        ))
                                    }
                                </div>

                                <div className="cotizacionAcciones">
                                    <button type="button" onClick={() => setCotizacionActivo(cotizacion)}>
                                        <FaEye />
                                        Ver
                                    </button>
                                    <button type="button" onClick={() => descargarCotizacion(cotizacion)}>
                                        <FaDownload />
                                        PDF
                                    </button>
                                    <button type="button" onClick={() => convertirCotizacion(cotizacion)}>
                                        <FaShoppingCart />
                                        Convertir
                                    </button>
                                    <button type="button" onClick={() => eliminarCotizacion(cotizacion.id)}>
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
            cotizacionActivo && (
                <div className="cotizacionModal">
                    <div className="cotizacionModalPanel">
                        <button type="button" className="cotizacionModalCerrar" onClick={() => setCotizacionActivo(null)} aria-label="Cerrar cotización">
                            <FaTimes />
                        </button>
                        <h2>{cotizacionActivo.cliente?.nombre || "Cliente sin nombre"}</h2>
                        <p>Cotización N° {cotizacionActivo.numero} · Vendedor: {cotizacionActivo.vendedor}</p>
                        {camposContacto.map(([campo, etiqueta]) => cotizacionActivo.cliente?.[campo] && <p key={campo}>{etiqueta}: {cotizacionActivo.cliente[campo]}</p>)}
                        {cotizacionActivo.observaciones && <p className="cotizacionObservaciones">Observaciones: {cotizacionActivo.observaciones}</p>}
                        <span>{formatearFecha(cotizacionActivo.fecha)}</span>
                        <div className="cotizacionModalItems">
                            {
                                (cotizacionActivo.items || []).map((item) => (
                                    <div key={item.id || item.producto_id}>
                                        <p>{item.nombre}</p>
                                        <span>{item.cantidad_kg} {formatearTipoStock(item.tipo_stock, item.cantidad_kg)} x {formatearPrecio(item.precio_unitario)}</span>
                                        <strong>{formatearPrecio(item.subtotal)}</strong>
                                    </div>
                                ))
                            }
                        </div>
                        <div className="cotizacionModalTotal">
                            <span>Total</span>
                            <strong>{formatearPrecio(cotizacionActivo.total)}</strong>
                        </div>
                        <div className="cotizacionModalAcciones">
                            <button type="button" onClick={() => descargarCotizacion(cotizacionActivo)}>
                                <FaDownload />
                                Descargar PDF
                            </button>
                            <button type="button" onClick={() => convertirCotizacion(cotizacionActivo)}>
                                <FaShoppingCart />
                                Convertir
                            </button>
                            <button type="button" onClick={() => eliminarCotizacion(cotizacionActivo.id)}>
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
