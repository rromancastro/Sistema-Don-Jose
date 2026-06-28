"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { FaArrowLeft, FaArrowRight } from "react-icons/fa"
import { FiDollarSign, FiSearch } from "react-icons/fi"
import { IoCartOutline } from "react-icons/io5"
import { obtenerDocumentos } from "../lib/firebase"
import { NavComponent } from "./NavComponent"

const FILTROS = {
    TODOS: "todos",
    COMPRAS: "compras",
    TRANSFORMACIONES: "transformaciones",
    VENTAS: "ventas",
}

const formatearPrecio = (valor) => `$${Number(valor || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`
const formatearNumero = (valor) => Number(valor || 0).toLocaleString("es-AR", {
    maximumFractionDigits: 2,
})
const formatearTipoStock = (tipoStock, cantidad = 1) => {
    if (tipoStock === "unidad") return cantidad === 1 ? "unidad" : "unidades"

    return "kg"
}
const formatearFecha = (fecha) => {
    if (!fecha) return ""

    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const [anio, mes, dia] = fecha.split("-")

        return `${dia}/${mes}/${anio}`
    }

    return String(fecha).split(" ")[0]
}
const obtenerOrdenFecha = (item) => {
    const fecha = item.fecha || ""

    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return new Date(`${fecha}T00:00:00`).getTime()
    }

    const fechaTexto = String(item.fecha_hora || fecha)
    const coincidencia = fechaTexto.match(/^(\d{2})\/(\d{2})\/(\d{4})/)

    if (coincidencia) {
        const [, dia, mes, anio] = coincidencia

        return new Date(`${anio}-${mes}-${dia}T00:00:00`).getTime()
    }

    return 0
}

export const HistorialComponent = () => {
    const [ventas, setVentas] = useState([])
    const [compras, setCompras] = useState([])
    const [transformaciones, setTransformaciones] = useState([])
    const [proveedores, setProveedores] = useState([])
    const [busqueda, setBusqueda] = useState("")
    const [filtroActivo, setFiltroActivo] = useState(FILTROS.TODOS)

    useEffect(() => {
        const cargarHistorial = async () => {
            const [ventasData, comprasData, transformacionesData, proveedoresData] = await Promise.all([
                obtenerDocumentos("comprobantes_venta"),
                obtenerDocumentos("compras"),
                obtenerDocumentos("transformaciones"),
                obtenerDocumentos("proveedores"),
            ])

            setVentas(ventasData)
            setCompras(comprasData)
            setTransformaciones(transformacionesData)
            setProveedores(proveedoresData)
        }

        cargarHistorial()
    }, [])

    const proveedoresPorId = useMemo(() => {
        return proveedores.reduce((proveedoresMap, proveedor) => {
            proveedoresMap[proveedor.id] = proveedor

            return proveedoresMap
        }, {})
    }, [proveedores])

    const itemsHistorial = useMemo(() => {
        const ventasItems = ventas.map((venta) => ({
            id: `venta-${venta.id}`,
            tipo: FILTROS.VENTAS,
            fecha: venta.fecha,
            fecha_hora: venta.fecha_hora,
            titulo: "Venta",
            subtitulo: venta.cliente?.nombre || "Cliente sin nombre",
            monto: Number(venta.total || 0),
            items: venta.items || [],
            textoBusqueda: [
                "venta",
                venta.cliente?.nombre,
                venta.total,
                ...(venta.items || []).map((item) => item.nombre),
            ].join(" "),
        }))
        const comprasItems = compras.map((compra) => {
            const proveedor = proveedoresPorId[compra.proveedor_id]

            return {
                id: `compra-${compra.id}`,
                tipo: FILTROS.COMPRAS,
                fecha: compra.fecha,
                fecha_hora: compra.fecha_hora,
                titulo: "Compra",
                subtitulo: compra.producto || "Producto sin nombre",
                cantidad: Number(compra.cantidad_kg || 0),
                monto: Number(compra.total_compra || 0),
                proveedor: proveedor?.nombre || compra.proveedor || "",
                tipo_stock: compra.tipo_stock || "kg",
                textoBusqueda: [
                    "compra",
                    compra.producto,
                    proveedor?.nombre,
                    compra.total_compra,
                ].join(" "),
            }
        })
        const transformacionesItems = transformaciones.map((transformacion) => ({
            id: `transformacion-${transformacion.id}`,
            tipo: FILTROS.TRANSFORMACIONES,
            fecha: transformacion.fecha,
            fecha_hora: transformacion.fecha_hora,
            titulo: "Transformación",
            subtitulo: `${transformacion.materia_prima_nombre || transformacion.materia_prima?.nombre || "Materia prima"} → ${transformacion.producto_final_nombre || transformacion.producto_final?.nombre || "Producto final"}`,
            cantidad_utilizada: Number(transformacion.cantidad_utilizada || 0),
            cantidad_obtenida: Number(transformacion.cantidad_final ?? transformacion.cantidad_obtenida ?? 0),
            rendimiento: Number(transformacion.rendimiento_final_porcentaje ?? transformacion.rendimiento_porcentaje ?? 0),
            tipo_stock_materia_prima: transformacion.tipo_stock_materia_prima || transformacion.materia_prima?.tipo_stock || "kg",
            tipo_stock_final: transformacion.tipo_stock_final || transformacion.producto_final?.tipo_stock || "kg",
            textoBusqueda: [
                "transformacion",
                transformacion.materia_prima_nombre,
                transformacion.producto_final_nombre,
                transformacion.materia_prima?.nombre,
                transformacion.producto_final?.nombre,
            ].join(" "),
        }))
        const textoBusqueda = busqueda.trim().toLowerCase()

        return [...ventasItems, ...comprasItems, ...transformacionesItems]
            .filter((item) => filtroActivo === FILTROS.TODOS || item.tipo === filtroActivo)
            .filter((item) => !textoBusqueda || item.textoBusqueda.toLowerCase().includes(textoBusqueda))
            .sort((a, b) => obtenerOrdenFecha(b) - obtenerOrdenFecha(a))
    }, [ventas, compras, transformaciones, proveedoresPorId, busqueda, filtroActivo])

    const renderItem = (item) => {
        if (item.tipo === FILTROS.VENTAS) {
            return <article key={item.id} className="historialCard historialVenta">
                <div className="historialIcono">
                    <FiDollarSign />
                </div>
                <div className="historialContenido">
                    <span>Venta</span>
                    <h2>{item.subtitulo}</h2>
                    <ul>
                        {
                            item.items.map((producto) => (
                                <li key={producto.id || producto.producto_id || producto.nombre}>
                                    {producto.nombre} ({formatearNumero(producto.cantidad_kg)} {formatearTipoStock(producto.tipo_stock, producto.cantidad_kg)})
                                </li>
                            ))
                        }
                    </ul>
                </div>
                <div className="historialMeta">
                    <p>{formatearFecha(item.fecha_hora || item.fecha)}</p>
                    <strong>{formatearPrecio(item.monto)}</strong>
                </div>
            </article>
        }

        if (item.tipo === FILTROS.TRANSFORMACIONES) {
            return <article key={item.id} className="historialCard historialTransformacion">
                <div className="historialIcono">
                    <FaArrowRight />
                </div>
                <div className="historialContenido">
                    <span>Transformación</span>
                    <h2>{item.subtitulo}</h2>
                    <p>
                        {formatearNumero(item.cantidad_utilizada)} {formatearTipoStock(item.tipo_stock_materia_prima, item.cantidad_utilizada)}
                        {" → "}
                        {formatearNumero(item.cantidad_obtenida)} {formatearTipoStock(item.tipo_stock_final, item.cantidad_obtenida)}
                    </p>
                </div>
                <div className="historialMeta">
                    <p>{formatearFecha(item.fecha_hora || item.fecha)}</p>
                    <strong>{formatearNumero(item.rendimiento)}%</strong>
                </div>
            </article>
        }

        return <article key={item.id} className="historialCard historialCompra">
            <div className="historialIcono">
                <IoCartOutline />
            </div>
            <div className="historialContenido">
                <span>Compra</span>
                <h2>{item.subtitulo}</h2>
                <div className="historialCompraDatos">
                    <p>Proveedor: {item.proveedor || "-"}</p>
                    <p>Cantidad: {formatearNumero(item.cantidad)} {formatearTipoStock(item.tipo_stock, item.cantidad)}</p>
                </div>
            </div>
            <div className="historialMeta">
                <p>{formatearFecha(item.fecha_hora || item.fecha)}</p>
                <strong>{formatearPrecio(item.monto)}</strong>
            </div>
        </article>
    }

    return <section>
        <NavComponent bgColor="#1E2939" >
            <Link href={'/'}>
                <FaArrowLeft />
            </Link>
            <h1>Historial</h1>
        </NavComponent>

        <div id="historialContainer">
            <div className="historialBuscador">
                <FiSearch />
                <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar en historial..."
                    aria-label="Buscar en historial"
                />
            </div>

            <div className="historialTabs">
                <button type="button" className={filtroActivo === FILTROS.TODOS ? "historialTabActiva" : ""} onClick={() => setFiltroActivo(FILTROS.TODOS)}>Todos</button>
                <button type="button" className={filtroActivo === FILTROS.COMPRAS ? "historialTabActiva" : ""} onClick={() => setFiltroActivo(FILTROS.COMPRAS)}>Compras</button>
                <button type="button" className={filtroActivo === FILTROS.TRANSFORMACIONES ? "historialTabActiva" : ""} onClick={() => setFiltroActivo(FILTROS.TRANSFORMACIONES)}>Transformaciones</button>
                <button type="button" className={filtroActivo === FILTROS.VENTAS ? "historialTabActiva" : ""} onClick={() => setFiltroActivo(FILTROS.VENTAS)}>Ventas</button>
            </div>

            <div className="historialLista">
                {
                    itemsHistorial.length === 0 ? (
                        <p className="historialVacio">No hay movimientos para mostrar</p>
                    ) : (
                        itemsHistorial.map((item) => renderItem(item))
                    )
                }
            </div>
        </div>
    </section>
}
