"use client"

import Link from "next/link"
import { SelectorProducto } from "./SelectorProducto"
import { useEffect, useMemo, useState } from "react"
import { FaArrowLeft, FaArrowRight, FaCheck } from "react-icons/fa"
import { obtenerFechaHoraActual } from "../lib/fechas"
import { actualizarDocumento, crearDocumento, obtenerDocumentos } from "../lib/firebase"
import { formatearNumero, formatearTipoStock, normalizarLista, normalizarProducto, obtenerNombreProducto, obtenerStockProducto, obtenerTipoStock } from "../lib/normalizadores"
import { NavComponent } from "./NavComponent"
import { ConversionEmpaque } from "./ConversionEmpaque"
import { CrearProductoTransformacion } from "./CrearProductoTransformacion"
import { obtenerTipoProducto } from "../lib/normalizadores"

const ESTADO_PENDIENTE = "pendiente"
const ESTADO_COMPLETADA = "completada"

const esPendiente = (estado) => estado === ESTADO_PENDIENTE || estado === "prendiente"

export const TransformacionesComponent = () => {
    const [productos, setProductos] = useState([])
    const [transformaciones, setTransformaciones] = useState([])
    const [materiaPrimaId, setMateriaPrimaId] = useState("")
    const [productoFinalId, setProductoFinalId] = useState("")
    const [cantidadUtilizada, setCantidadUtilizada] = useState("")
    const [cantidadObtenida, setCantidadObtenida] = useState("")
    const [pesosFinales, setPesosFinales] = useState({})

    useEffect(() => {
        const cargarDatos = async () => {
            const [productosData, transformacionesData] = await Promise.all([
                obtenerDocumentos("productos"),
                obtenerDocumentos("transformaciones"),
            ])

            const productosNormalizados = normalizarLista(productosData, normalizarProducto)
            const productosMateriaPrima = productosNormalizados.filter((producto) => obtenerTipoProducto(producto) === "fruta_fresca")
            const productosFinales = productosNormalizados.filter((producto) => obtenerTipoProducto(producto) === "deshidratado")

            setProductos(productosNormalizados)
            setTransformaciones(transformacionesData.sort((a, b) => String(b.fecha_hora || "").localeCompare(String(a.fecha_hora || ""))))
            setMateriaPrimaId(productosMateriaPrima[0]?.id || "")
            setProductoFinalId(productosFinales[0]?.id || "")
        }

        cargarDatos()
    }, [])

    const productosMateriaPrima = useMemo(() => {
        return productos.filter((producto) => obtenerTipoProducto(producto) === "fruta_fresca")
    }, [productos])

    const productosFinales = useMemo(() => {
        return productos.filter((producto) => producto.id !== materiaPrimaId && obtenerTipoProducto(producto) === "deshidratado")
    }, [productos, materiaPrimaId])

    const materiaPrimaSeleccionada = useMemo(() => {
        return productos.find((producto) => producto.id === materiaPrimaId)
    }, [productos, materiaPrimaId])

    const productoFinalSeleccionado = useMemo(() => {
        return productos.find((producto) => producto.id === productoFinalId)
    }, [productos, productoFinalId])

    const tipoStockMateriaPrima = materiaPrimaSeleccionada ? obtenerTipoStock(materiaPrimaSeleccionada) : "kg"
    const tipoStockProductoFinal = productoFinalSeleccionado ? obtenerTipoStock(productoFinalSeleccionado) : "kg"
    const stockMateriaPrima = materiaPrimaSeleccionada ? obtenerStockProducto(materiaPrimaSeleccionada) : 0
    const cantidadUtilizadaNumerica = Number(cantidadUtilizada || 0)
    const cantidadObtenidaNumerica = Number(cantidadObtenida || 0)
    const rendimiento = cantidadUtilizadaNumerica > 0 ? (cantidadObtenidaNumerica / cantidadUtilizadaNumerica) * 100 : 0
    const perdidaDescarte = Math.max(cantidadUtilizadaNumerica - cantidadObtenidaNumerica, 0)
    const puedeRegistrar = Boolean(
        materiaPrimaSeleccionada &&
        productoFinalSeleccionado &&
        cantidadUtilizadaNumerica > 0 &&
        cantidadObtenidaNumerica > 0 &&
        cantidadUtilizadaNumerica <= stockMateriaPrima
    )

    const cambiarNumero = (valor, setter, maximo = null) => {
        if (valor === "") {
            setter("")
            return
        }

        const valorNumerico = Number(valor)

        if (Number.isNaN(valorNumerico)) return

        const valorNormalizado = Math.max(valorNumerico, 0)
        setter(String(maximo === null ? valorNormalizado : Math.min(valorNormalizado, maximo)))
    }

    const registrarTransformacion = async () => {
        if (!puedeRegistrar) return

        const fechaHora = obtenerFechaHoraActual()
        const stockMateriaPrimaActualizado = stockMateriaPrima - cantidadUtilizadaNumerica
        const transformacionParaCrear = {
            cantidad_obtenida: cantidadObtenidaNumerica,
            cantidad_utilizada: cantidadUtilizadaNumerica,
            estado: ESTADO_PENDIENTE,
            fecha: fechaHora.fecha,
            fecha_hora: fechaHora.fecha_hora,
            hora: fechaHora.hora,
            materia_prima: {
                id: materiaPrimaSeleccionada.id,
                nombre: obtenerNombreProducto(materiaPrimaSeleccionada),
                stock_anterior: stockMateriaPrima,
                stock_actualizado: stockMateriaPrimaActualizado,
                tipo_stock: tipoStockMateriaPrima,
            },
            materia_prima_id: materiaPrimaSeleccionada.id,
            materia_prima_nombre: obtenerNombreProducto(materiaPrimaSeleccionada),
            perdida_descarte: perdidaDescarte,
            producto_final: {
                id: productoFinalSeleccionado.id,
                nombre: obtenerNombreProducto(productoFinalSeleccionado),
                tipo_stock: tipoStockProductoFinal,
            },
            producto_final_id: productoFinalSeleccionado.id,
            producto_final_nombre: obtenerNombreProducto(productoFinalSeleccionado),
            rendimiento_porcentaje: rendimiento,
            tipo_stock_final: tipoStockProductoFinal,
            tipo_stock_materia_prima: tipoStockMateriaPrima,
        }

        const id = await crearDocumento("transformaciones", transformacionParaCrear)

        await actualizarDocumento("productos", materiaPrimaSeleccionada.id, {
            stock: stockMateriaPrimaActualizado,
        })

        setProductos((productosActuales) => productosActuales.map((producto) => {
            if (producto.id !== materiaPrimaSeleccionada.id) return producto

            return normalizarProducto({
                ...producto,
                stock: stockMateriaPrimaActualizado,
            })
        }))
        setTransformaciones((transformacionesActuales) => [
            {
                id,
                ...transformacionParaCrear,
            },
            ...transformacionesActuales,
        ])
        setPesosFinales((pesosActuales) => ({
            ...pesosActuales,
            [id]: String(cantidadObtenidaNumerica),
        }))
        setCantidadUtilizada("")
        setCantidadObtenida("")
    }

    const cambiarPesoFinal = (transformacionId, valor) => {
        if (valor === "") {
            setPesosFinales((pesosActuales) => ({
                ...pesosActuales,
                [transformacionId]: "",
            }))
            return
        }

        const valorNumerico = Number(valor)

        if (Number.isNaN(valorNumerico)) return

        setPesosFinales((pesosActuales) => ({
            ...pesosActuales,
            [transformacionId]: String(Math.max(valorNumerico, 0)),
        }))
    }

    const pasarAStock = async (transformacion) => {
        const productoFinal = productos.find((producto) => producto.id === transformacion.producto_final_id)
        const pesoFinal = Number(pesosFinales[transformacion.id] ?? transformacion.cantidad_obtenida ?? 0)

        if (!productoFinal || pesoFinal <= 0) return

        const stockFinalActualizado = obtenerStockProducto(productoFinal) + pesoFinal
        const rendimientoFinal = transformacion.cantidad_utilizada > 0 ? (pesoFinal / transformacion.cantidad_utilizada) * 100 : 0
        const perdidaFinal = Math.max(Number(transformacion.cantidad_utilizada || 0) - pesoFinal, 0)
        const fechaHora = obtenerFechaHoraActual()
        const actualizacionTransformacion = {
            cantidad_final: pesoFinal,
            estado: ESTADO_COMPLETADA,
            fecha_stock: fechaHora.fecha,
            fecha_hora_stock: fechaHora.fecha_hora,
            hora_stock: fechaHora.hora,
            perdida_descarte_final: perdidaFinal,
            producto_final: {
                ...(transformacion.producto_final || {}),
                stock_actualizado: stockFinalActualizado,
            },
            rendimiento_final_porcentaje: rendimientoFinal,
        }

        await actualizarDocumento("productos", productoFinal.id, {
            stock: stockFinalActualizado,
        })
        await actualizarDocumento("transformaciones", transformacion.id, actualizacionTransformacion)

        setProductos((productosActuales) => productosActuales.map((producto) => {
            if (producto.id !== productoFinal.id) return producto

            return normalizarProducto({
                ...producto,
                stock: stockFinalActualizado,
            })
        }))
        setTransformaciones((transformacionesActuales) => transformacionesActuales.map((item) => {
            if (item.id !== transformacion.id) return item

            return {
                ...item,
                ...actualizacionTransformacion,
            }
        }))
    }

    return <section>
        <NavComponent bgColor="#7F22FE">
            <Link href={'/'}>
                <FaArrowLeft />
            </Link>
            <h1>Nueva Transformación</h1>
        </NavComponent>

        <div id="transformacionesContainer">
            <ConversionEmpaque productos={productos} onProductoCreado={producto => setProductos(actuales => [...actuales, producto])} onRegistrada={({ productos: actualizados, transformacion }) => {
                setProductos((actuales) => actuales.map((item) => actualizados.find((nuevo) => nuevo.id === item.id) || item))
                setTransformaciones((actuales) => [transformacion, ...actuales.filter((item) => item.id !== transformacion.id)])
            }} />
            <h2>Fruta fresca → Deshidratado</h2>
            <div className="transformacionCampo">
                <label>Fruta Fresca (Materia Prima)</label>
                <SelectorProducto productos={productosMateriaPrima} value={materiaPrimaId} entidad="Materia prima" onChange={id => { setMateriaPrimaId(id); setCantidadUtilizada("") }} />
            </div>

            <div className="transformacionCampo">
                <label>Cantidad Utilizada ({formatearTipoStock(tipoStockMateriaPrima)})</label>
                <input
                    type="number"
                    min="0"
                    max={stockMateriaPrima}
                    step={tipoStockMateriaPrima === "unidad" ? "1" : "0.01"}
                    value={cantidadUtilizada}
                    onChange={(e) => cambiarNumero(e.target.value, setCantidadUtilizada, stockMateriaPrima)}
                    placeholder="0"
                />
            </div>

            <div className="transformacionFlecha">
                <FaArrowRight />
            </div>

            <div className="transformacionCampo transformacionProductoFinal">
                <label>Producto Final</label>
                <SelectorProducto productos={productosFinales} value={productoFinalId} entidad="Producto final" onChange={id => { setProductoFinalId(id) }} />
                <CrearProductoTransformacion tipo="deshidratado" onCreado={producto => {
                    setProductos(actuales => [...actuales, producto])
                    setProductoFinalId(producto.id)
                }} />
            </div>

            <div className="transformacionCampo">
                <label>Cantidad Obtenida ({formatearTipoStock(tipoStockProductoFinal)})</label>
                <input
                    type="number"
                    min="0"
                    step={tipoStockProductoFinal === "unidad" ? "1" : "0.01"}
                    value={cantidadObtenida}
                    onChange={(e) => cambiarNumero(e.target.value, setCantidadObtenida)}
                    placeholder="0"
                />
            </div>

            <div className="transformacionMetricas">
                <article>
                    <p>Rendimiento</p>
                    <span>{formatearNumero(rendimiento)}%</span>
                </article>
                <article>
                    <p>Pérdida/descarte</p>
                    <span>{formatearNumero(perdidaDescarte)} {formatearTipoStock(tipoStockMateriaPrima, perdidaDescarte)}</span>
                </article>
            </div>

            <button type="button" className="transformacionRegistrarBtn" onClick={registrarTransformacion} disabled={!puedeRegistrar}>
                <FaCheck />
                Registrar Transformación
            </button>

            <div className="transformacionesHistorial">
                <h2>Transformaciones</h2>
                {
                    transformaciones.length === 0 ? (
                        <p className="transformacionesVacio">No hay transformaciones registradas</p>
                    ) : (
                        transformaciones.map((transformacion) => {
                            const pendiente = esPendiente(transformacion.estado)
                            const pesoFinal = pesosFinales[transformacion.id] ?? String(transformacion.cantidad_obtenida || "")

                            return <article key={transformacion.id} className="transformacionCard bdRadius">
                                <div className="transformacionCardHeader">
                                    <div>
                                        <p>{transformacion.materia_prima_nombre} → {transformacion.producto_final_nombre}</p>
                                        <span>{transformacion.fecha_hora || `${transformacion.fecha || ""} ${transformacion.hora || ""}`}</span>
                                    </div>
                                    <strong className={pendiente ? "estadoPendiente" : "estadoCompletada"}>
                                        {pendiente ? "Pendiente" : "Completada"}
                                    </strong>
                                </div>

                                <div className="transformacionCardDatos">
                                    {transformacion.peso_destino_kg > 0 && <span>Peso por unidad obtenida: {formatearNumero(transformacion.peso_destino_kg, { maximumFractionDigits: 6 })} kg</span>}
                                    <span>Usado: {formatearNumero(transformacion.cantidad_utilizada)} {formatearTipoStock(transformacion.tipo_stock_materia_prima, transformacion.cantidad_utilizada)}</span>
                                    <span>Obtenido: {formatearNumero(transformacion.cantidad_obtenida)} {formatearTipoStock(transformacion.tipo_stock_final, transformacion.cantidad_obtenida)}</span>
                                    <span>Rendimiento: {formatearNumero(transformacion.rendimiento_final_porcentaje ?? transformacion.rendimiento_porcentaje)}%</span>
                                    <span>Descarte: {formatearNumero(transformacion.perdida_descarte_final ?? transformacion.perdida_descarte)} {formatearTipoStock(transformacion.tipo_stock_materia_prima, transformacion.perdida_descarte)}</span>
                                </div>

                                {
                                    pendiente && (
                                        <div className="transformacionPasarStock">
                                            <label>Peso final para stock ({formatearTipoStock(transformacion.tipo_stock_final)})</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step={transformacion.tipo_stock_final === "unidad" ? "1" : "0.01"}
                                                value={pesoFinal}
                                                onChange={(e) => cambiarPesoFinal(transformacion.id, e.target.value)}
                                                placeholder="0"
                                            />
                                            <button type="button" onClick={() => pasarAStock(transformacion)} disabled={Number(pesoFinal || 0) <= 0}>
                                                <FaCheck />
                                                Pasar a Stock
                                            </button>
                                        </div>
                                    )
                                }
                            </article>
                        })
                    )
                }
            </div>
        </div>
    </section>
}
