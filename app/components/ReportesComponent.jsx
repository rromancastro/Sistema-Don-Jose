"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { FaArrowLeft, FaRegChartBar } from "react-icons/fa"
import { FiCalendar, FiChevronLeft, FiChevronRight, FiDollarSign, FiShoppingCart, FiTrendingUp, FiUsers } from "react-icons/fi"
import { GoGraph } from "react-icons/go"
import { IoRibbonOutline } from "react-icons/io5"
import { LuTarget } from "react-icons/lu"
import { obtenerDocumentos } from "../lib/firebase"
import { NavComponent } from "./NavComponent"

const PERIODOS = {
    SEMANA: "semana",
    MES: "mes",
    ANIO: "anio",
}
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
const DIAS_SEMANA = ["D", "L", "M", "M", "J", "V", "S"]
const MS_DIA = 24 * 60 * 60 * 1000

const formatearPrecio = (valor) => `$${Number(valor || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`
const formatearPrecioSimple = (valor) => `$${Number(valor || 0).toLocaleString("es-AR", {
    maximumFractionDigits: 0,
})}`
const formatearNumero = (valor) => Number(valor || 0).toLocaleString("es-AR", {
    maximumFractionDigits: 2,
})
const obtenerFechaISO = (fecha) => {
    const anio = fecha.getFullYear()
    const mes = String(fecha.getMonth() + 1).padStart(2, "0")
    const dia = String(fecha.getDate()).padStart(2, "0")

    return `${anio}-${mes}-${dia}`
}
const normalizarFecha = (valor) => {
    if (!valor) return ""

    const texto = String(valor)

    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10)

    const coincidencia = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (coincidencia) {
        const [, dia, mes, anio] = coincidencia

        return `${anio}-${mes}-${dia}`
    }

    return ""
}
const crearFechaLocal = (fechaISO) => {
    const [anio, mes, dia] = fechaISO.split("-").map(Number)

    return new Date(anio, mes - 1, dia)
}
const sumarDias = (fechaISO, dias) => {
    const fecha = crearFechaLocal(fechaISO)
    fecha.setDate(fecha.getDate() + dias)

    return obtenerFechaISO(fecha)
}
const obtenerRangoPeriodo = (periodo) => {
    const hoy = new Date()
    const fin = obtenerFechaISO(hoy)
    const inicio = new Date(hoy)

    if (periodo === PERIODOS.SEMANA) {
        inicio.setDate(hoy.getDate() - 6)
    } else if (periodo === PERIODOS.MES) {
        inicio.setDate(1)
    } else {
        inicio.setMonth(0, 1)
    }

    return {
        desde: obtenerFechaISO(inicio),
        hasta: fin,
    }
}
const obtenerDiasEntre = (desde, hasta) => {
    const inicio = crearFechaLocal(desde).getTime()
    const fin = crearFechaLocal(hasta).getTime()
    const cantidad = Math.max(Math.round((fin - inicio) / MS_DIA), 0) + 1

    return Array.from({ length: cantidad }, (_, index) => sumarDias(desde, index))
}
const formatearEtiquetaFecha = (fechaISO) => {
    const [, mes, dia] = fechaISO.split("-")

    return `${dia}/${mes}`
}
const formatearFechaResumen = (fechaISO) => {
    if (!fechaISO) return "-"

    const fecha = crearFechaLocal(fechaISO)

    return `${String(fecha.getDate()).padStart(2, "0")} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`
}
const estaEnRango = (fecha, desde, hasta) => {
    const fechaNormalizada = normalizarFecha(fecha)

    return fechaNormalizada && fechaNormalizada >= desde && fechaNormalizada <= hasta
}
const obtenerCantidadItem = (item) => Number(item.cantidad_kg ?? item.cantidad ?? 0)
const obtenerTop = (items, limite = 2) => [...items]
    .sort((a, b) => Number(b.monto || 0) - Number(a.monto || 0))
    .slice(0, limite)
const obtenerDiasMes = (mesVisible) => {
    const anio = mesVisible.getFullYear()
    const mes = mesVisible.getMonth()
    const primerDiaSemana = new Date(anio, mes, 1).getDay()
    const diasDelMes = new Date(anio, mes + 1, 0).getDate()
    const espaciosPrevios = Array.from({ length: primerDiaSemana }, (_, index) => ({
        id: `vacio-${index}`,
        vacio: true,
    }))
    const dias = Array.from({ length: diasDelMes }, (_, index) => {
        const fecha = new Date(anio, mes, index + 1)
        const fechaISO = obtenerFechaISO(fecha)

        return {
            dia: index + 1,
            fecha: fechaISO,
        }
    })

    return [...espaciosPrevios, ...dias]
}

const ReporteCalendario = ({ titulo, fechaSeleccionada, mesVisible, onCambiarMes, onSeleccionarFecha, rango }) => {
    const dias = obtenerDiasMes(mesVisible)

    return <article className="reporteCalendario">
        <div className="reporteCalendarioHeader">
            <button type="button" onClick={() => onCambiarMes(-1)} aria-label={`Mes anterior ${titulo}`}>
                <FiChevronLeft />
            </button>
            <div>
                <span>{titulo}</span>
                <p>{MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}</p>
            </div>
            <button type="button" onClick={() => onCambiarMes(1)} aria-label={`Mes siguiente ${titulo}`}>
                <FiChevronRight />
            </button>
        </div>

        <div className="reporteCalendarioGrid">
            {
                DIAS_SEMANA.map((dia, index) => (
                    <span key={`${dia}-${index}`} className="reporteCalendarioDiaSemana">{dia}</span>
                ))
            }
            {
                dias.map((dia) => (
                    dia.vacio ? (
                        <span key={dia.id} className="reporteCalendarioVacio" />
                    ) : (
                        <button
                            key={dia.fecha}
                            type="button"
                            className={`${dia.fecha === fechaSeleccionada ? "reporteCalendarioActivo" : ""} ${dia.fecha > rango.desde && dia.fecha < rango.hasta ? "reporteCalendarioEnRango" : ""}`}
                            onClick={() => onSeleccionarFecha(dia.fecha)}
                        >
                            {dia.dia}
                        </button>
                    )
                ))
            }
        </div>
    </article>
}

const ReporteGrafico = ({ datos, tipo = "doble" }) => {
    const ancho = 1000
    const alto = 170
    const margen = {
        arriba: 16,
        derecha: 20,
        abajo: 30,
        izquierda: 50,
    }
    const anchoGrafico = ancho - margen.izquierda - margen.derecha
    const altoGrafico = alto - margen.arriba - margen.abajo
    const maximo = Math.max(4, ...datos.flatMap((item) => [item.ventas || 0, item.compras || 0, item.ganancia || 0]))
    const ticks = [0, 1, 2, 3, 4].map((item) => Math.round((maximo / 4) * item))
    const pasoX = datos.length > 1 ? anchoGrafico / (datos.length - 1) : 0
    const crearPuntos = (clave) => datos.map((item, index) => {
        const x = margen.izquierda + (index * pasoX)
        const y = margen.arriba + altoGrafico - ((Number(item[clave] || 0) / maximo) * altoGrafico)

        return `${x},${y}`
    }).join(" ")
    const etiquetas = datos.filter((_, index) => {
        if (datos.length <= 7) return true

        const cada = Math.ceil(datos.length / 6)
        return index % cada === 0 || index === datos.length - 1
    })

    return <svg className="reporteGraficoSvg" viewBox={`0 0 ${ancho} ${alto}`} role="img">
        {
            ticks.map((tick, index) => {
                const y = margen.arriba + altoGrafico - ((tick / maximo) * altoGrafico)

                return <g key={tick}>
                    <line x1={margen.izquierda} x2={ancho - margen.derecha} y1={y} y2={y} />
                    <text x={margen.izquierda - 12} y={y + 4}>{tick}</text>
                </g>
            })
        }
        {
            etiquetas.map((item) => {
                const index = datos.indexOf(item)
                const x = margen.izquierda + (index * pasoX)

                return <g key={item.fecha}>
                    <line className="reporteGraficoGuia" x1={x} x2={x} y1={margen.arriba} y2={margen.arriba + altoGrafico} />
                    <text className="reporteGraficoFecha" x={x} y={alto - 8}>{formatearEtiquetaFecha(item.fecha)}</text>
                </g>
            })
        }
        <line className="reporteGraficoEje" x1={margen.izquierda} x2={margen.izquierda} y1={margen.arriba} y2={margen.arriba + altoGrafico} />
        <line className="reporteGraficoEje" x1={margen.izquierda} x2={ancho - margen.derecha} y1={margen.arriba + altoGrafico} y2={margen.arriba + altoGrafico} />
        {
            tipo === "doble" && (
                <>
                    <polyline className="reporteGraficoLinea reporteGraficoLineaVentas" points={crearPuntos("ventas")} />
                    <polyline className="reporteGraficoLinea reporteGraficoLineaCompras" points={crearPuntos("compras")} />
                </>
            )
        }
        {
            tipo === "ganancia" && (
                <>
                    <polyline className="reporteGraficoLinea reporteGraficoLineaGanancia" points={crearPuntos("ganancia")} />
                    {
                        datos.map((item, index) => {
                            const x = margen.izquierda + (index * pasoX)
                            const y = margen.arriba + altoGrafico - ((Number(item.ganancia || 0) / maximo) * altoGrafico)

                            return <circle key={item.fecha} className="reporteGraficoPunto" cx={x} cy={y} r="4" />
                        })
                    }
                </>
            )
        }
    </svg>
}

export const ReportesComponent = () => {
    const [periodo, setPeriodo] = useState(PERIODOS.MES)
    const [rango, setRango] = useState(() => obtenerRangoPeriodo(PERIODOS.MES))
    const [mesDesde, setMesDesde] = useState(() => crearFechaLocal(obtenerRangoPeriodo(PERIODOS.MES).desde))
    const [mesHasta, setMesHasta] = useState(() => crearFechaLocal(obtenerRangoPeriodo(PERIODOS.MES).hasta))
    const [ventas, setVentas] = useState([])
    const [compras, setCompras] = useState([])
    const [transformaciones, setTransformaciones] = useState([])
    const [clientes, setClientes] = useState([])
    const [proveedores, setProveedores] = useState([])
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        const cargarDatos = async () => {
            const [ventasData, comprasData, transformacionesData, clientesData, proveedoresData] = await Promise.all([
                obtenerDocumentos("comprobantes_venta"),
                obtenerDocumentos("compras"),
                obtenerDocumentos("transformaciones"),
                obtenerDocumentos("clientes"),
                obtenerDocumentos("proveedores"),
            ])

            setVentas(ventasData)
            setCompras(comprasData)
            setTransformaciones(transformacionesData)
            setClientes(clientesData)
            setProveedores(proveedoresData)
            setCargando(false)
        }

        cargarDatos()
    }, [])

    const seleccionarPeriodo = (nuevoPeriodo) => {
        const nuevoRango = obtenerRangoPeriodo(nuevoPeriodo)

        setPeriodo(nuevoPeriodo)
        setRango(nuevoRango)
        setMesDesde(crearFechaLocal(nuevoRango.desde))
        setMesHasta(crearFechaLocal(nuevoRango.hasta))
    }

    const cambiarMesDesde = (direccion) => {
        setMesDesde((mesActual) => new Date(mesActual.getFullYear(), mesActual.getMonth() + direccion, 1))
    }

    const cambiarMesHasta = (direccion) => {
        setMesHasta((mesActual) => new Date(mesActual.getFullYear(), mesActual.getMonth() + direccion, 1))
    }

    const seleccionarDesde = (fecha) => {
        setRango((rangoActual) => ({
            desde: fecha,
            hasta: fecha > rangoActual.hasta ? fecha : rangoActual.hasta,
        }))
    }

    const seleccionarHasta = (fecha) => {
        setRango((rangoActual) => ({
            desde: fecha < rangoActual.desde ? fecha : rangoActual.desde,
            hasta: fecha,
        }))
    }

    const datosReporte = useMemo(() => {
        const ventasFiltradas = ventas.filter((venta) => estaEnRango(venta.fecha_hora || venta.fecha, rango.desde, rango.hasta))
        const comprasFiltradas = compras.filter((compra) => estaEnRango(compra.fecha_hora || compra.fecha, rango.desde, rango.hasta))
        const transformacionesFiltradas = transformaciones.filter((transformacion) => estaEnRango(transformacion.fecha_hora || transformacion.fecha, rango.desde, rango.hasta))
        const dias = obtenerDiasEntre(rango.desde, rango.hasta)
        const grafico = dias.map((fecha) => ({
            fecha,
            compras: comprasFiltradas
                .filter((compra) => normalizarFecha(compra.fecha_hora || compra.fecha) === fecha)
                .reduce((total, compra) => total + Number(compra.total_compra || 0), 0),
            ganancia: ventasFiltradas
                .filter((venta) => normalizarFecha(venta.fecha_hora || venta.fecha) === fecha)
                .reduce((total, venta) => total + Number(venta.ganancia_total || 0), 0),
            ventas: ventasFiltradas
                .filter((venta) => normalizarFecha(venta.fecha_hora || venta.fecha) === fecha)
                .reduce((total, venta) => total + Number(venta.total || 0), 0),
        }))
        const facturacion = ventasFiltradas.reduce((total, venta) => total + Number(venta.total || 0), 0)
        const totalCompras = comprasFiltradas.reduce((total, compra) => total + Number(compra.total_compra || 0), 0)
        const ganancia = ventasFiltradas.reduce((total, venta) => total + Number(venta.ganancia_total || 0), 0)
        const ventasCantidad = ventasFiltradas.length
        const kgVendidos = ventasFiltradas.reduce((total, venta) => {
            return total + (venta.items || []).reduce((subtotal, item) => subtotal + obtenerCantidadItem(item), 0)
        }, 0)
        const rendimientoPromedio = transformacionesFiltradas.length > 0
            ? transformacionesFiltradas.reduce((total, transformacion) => {
                return total + Number(transformacion.rendimiento_final_porcentaje ?? transformacion.rendimiento_porcentaje ?? 0)
            }, 0) / transformacionesFiltradas.length
            : 0
        const productosMap = ventasFiltradas.reduce((mapa, venta) => {
            ;(venta.items || []).forEach((item) => {
                const nombre = item.nombre || "Producto sin nombre"
                const actual = mapa[nombre] || {
                    nombre,
                    cantidad: 0,
                    monto: 0,
                    ventas: 0,
                }

                actual.cantidad += obtenerCantidadItem(item)
                actual.monto += Number(item.subtotal || 0)
                actual.ventas += 1
                mapa[nombre] = actual
            })

            return mapa
        }, {})
        const clientesMap = clientes.reduce((mapa, cliente) => {
            mapa[cliente.id] = {
                nombre: cliente.nombre || "Cliente sin nombre",
                monto: 0,
                ventas: 0,
            }

            return mapa
        }, {})

        ventasFiltradas.forEach((venta) => {
            const clienteId = venta.cliente?.id || venta.cliente_id || venta.clienteId
            const clave = clienteId || venta.cliente?.nombre || "sin-cliente"

            if (!clientesMap[clave]) {
                clientesMap[clave] = {
                    nombre: venta.cliente?.nombre || "Cliente sin nombre",
                    monto: 0,
                    ventas: 0,
                }
            }

            clientesMap[clave].monto += Number(venta.total || 0)
            clientesMap[clave].ventas += 1
        })

        const proveedoresMap = proveedores.reduce((mapa, proveedor) => {
            mapa[proveedor.id] = {
                nombre: proveedor.nombre || "Proveedor sin nombre",
                cantidad: 0,
                compras: 0,
                monto: 0,
            }

            return mapa
        }, {})

        comprasFiltradas.forEach((compra) => {
            const proveedorId = compra.proveedor_id || compra.proveedor?.id || compra.proveedorId
            const clave = proveedorId || compra.proveedor || "sin-proveedor"

            if (!proveedoresMap[clave]) {
                proveedoresMap[clave] = {
                    nombre: compra.proveedor || compra.proveedor?.nombre || "Proveedor sin nombre",
                    cantidad: 0,
                    compras: 0,
                    monto: 0,
                }
            }

            proveedoresMap[clave].cantidad += Number(compra.cantidad_kg || 0)
            proveedoresMap[clave].compras += 1
            proveedoresMap[clave].monto += Number(compra.total_compra || 0)
        })

        return {
            facturacion,
            ganancia,
            grafico,
            kgVendidos,
            rendimientoPromedio,
            totalCompras,
            totalTransformaciones: transformacionesFiltradas.length,
            ventasCantidad,
            mejoresClientes: obtenerTop(Object.values(clientesMap)),
            principalesProveedores: obtenerTop(Object.values(proveedoresMap)),
            productosMasVendidos: obtenerTop(Object.values(productosMap), 1),
        }
    }, [ventas, compras, transformaciones, clientes, proveedores, rango])

    const cantidadDiasRango = obtenerDiasEntre(rango.desde, rango.hasta).length

    return <section>
        <NavComponent bgColor="#7F22FE" >
            <Link href={'/'}>
                <FaArrowLeft />
            </Link>
            <h1>Reportes</h1>
        </NavComponent>

        <div id="reportesContainer">
            <div className="reportesTabs">
                <button type="button" className={periodo === PERIODOS.SEMANA ? "reportesTabActiva" : ""} onClick={() => seleccionarPeriodo(PERIODOS.SEMANA)}>Semana</button>
                <button type="button" className={periodo === PERIODOS.MES ? "reportesTabActiva" : ""} onClick={() => seleccionarPeriodo(PERIODOS.MES)}>Mes</button>
                <button type="button" className={periodo === PERIODOS.ANIO ? "reportesTabActiva" : ""} onClick={() => seleccionarPeriodo(PERIODOS.ANIO)}>Año</button>
            </div>

            <div className="reportesRango">
                <div className="reportesRangoHeader">
                    <div className="reportesRangoIcono">
                        <FiCalendar />
                    </div>
                    <div>
                        <span>Seleccionar rango de fechas</span>
                        <p>{cantidadDiasRango} {cantidadDiasRango === 1 ? "dia" : "dias"} incluidos</p>
                    </div>
                </div>

                <div className="reportesRangoResumen">
                    <button type="button" onClick={() => setMesDesde(crearFechaLocal(rango.desde))}>
                        <span>Desde</span>
                        <strong>{formatearFechaResumen(rango.desde)}</strong>
                    </button>
                    <button type="button" onClick={() => setMesHasta(crearFechaLocal(rango.hasta))}>
                        <span>Hasta</span>
                        <strong>{formatearFechaResumen(rango.hasta)}</strong>
                    </button>
                </div>

                <div className="reportesCalendarios">
                    <ReporteCalendario
                        titulo="Desde"
                        fechaSeleccionada={rango.desde}
                        mesVisible={mesDesde}
                        onCambiarMes={cambiarMesDesde}
                        onSeleccionarFecha={seleccionarDesde}
                        rango={rango}
                    />
                    <ReporteCalendario
                        titulo="Hasta"
                        fechaSeleccionada={rango.hasta}
                        mesVisible={mesHasta}
                        onCambiarMes={cambiarMesHasta}
                        onSeleccionarFecha={seleccionarHasta}
                        rango={rango}
                    />
                </div>
            </div>

            <div className="reportesResumenGrid">
                <article className="reporteMetricCard">
                    <div className="bgColorVerde">
                        <FiDollarSign />
                    </div>
                    <p>Facturacion</p>
                    <strong>{formatearPrecio(datosReporte.facturacion)}</strong>
                </article>
                <article className="reporteMetricCard">
                    <div className="bgColorNaranja">
                        <FiShoppingCart />
                    </div>
                    <p>Compras</p>
                    <strong>{formatearPrecio(datosReporte.totalCompras)}</strong>
                </article>
                <article className="reporteMetricCard reporteMetricCardFull">
                    <div className="bgColorVioleta">
                        <FiTrendingUp />
                    </div>
                    <p>Ganancia</p>
                    <strong>{formatearPrecio(datosReporte.ganancia)}</strong>
                </article>
            </div>

            <article className="reportePanel">
                <h2>Ventas vs Compras</h2>
                <ReporteGrafico datos={datosReporte.grafico} />
            </article>

            <article className="reportePanel">
                <h2>Tendencia de Ganancia</h2>
                <ReporteGrafico datos={datosReporte.grafico} tipo="ganancia" />
            </article>

            <div className="reportesResumenGrid">
                <article className="reporteMetricCard">
                    <div className="bgColorAzul">
                        <LuTarget />
                    </div>
                    <p>Ventas</p>
                    <strong>{datosReporte.ventasCantidad}</strong>
                </article>
                <article className="reporteMetricCard">
                    <div className="bgColorVioleta">
                        <LuTarget />
                    </div>
                    <p>Kg Vendidos</p>
                    <strong>{formatearNumero(datosReporte.kgVendidos)}</strong>
                </article>
            </div>

            <article className="reporteRendimiento">
                <h2>
                    <GoGraph />
                    Rendimiento Promedio
                </h2>
                <strong>{formatearNumero(datosReporte.rendimientoPromedio)}%</strong>
                <p>Basado en {datosReporte.totalTransformaciones} {datosReporte.totalTransformaciones === 1 ? "transformacion" : "transformaciones"}</p>
            </article>

            <div className="reporteRanking">
                <h2>
                    <IoRibbonOutline />
                    Productos Mas Vendidos
                </h2>
                {
                    datosReporte.productosMasVendidos.length === 0 ? (
                        <p className="reporteRankingVacio">Sin ventas en el periodo</p>
                    ) : datosReporte.productosMasVendidos.map((producto) => (
                        <article key={producto.nombre} className="reporteRankingItem reporteRankingProducto">
                            <div>
                                <p>{producto.nombre}</p>
                                <span>{formatearNumero(producto.cantidad)} unidades vendidas</span>
                            </div>
                            <div>
                                <strong>{formatearPrecioSimple(producto.monto)}</strong>
                                <span>{producto.ventas} {producto.ventas === 1 ? "venta" : "ventas"}</span>
                            </div>
                        </article>
                    ))
                }
            </div>

            <div className="reporteRanking">
                <h2>
                    <FiUsers />
                    Mejores Clientes
                </h2>
                {
                    datosReporte.mejoresClientes.map((cliente) => (
                        <article key={cliente.nombre} className="reporteRankingItem reporteRankingCliente">
                            <div>
                                <p>{cliente.nombre}</p>
                                <span>{cliente.ventas} {cliente.ventas === 1 ? "venta realizada" : "ventas realizadas"}</span>
                            </div>
                            <strong>{formatearPrecioSimple(cliente.monto)}</strong>
                        </article>
                    ))
                }
            </div>

            <div className="reporteRanking">
                <h2>
                    <FaRegChartBar />
                    Principales Proveedores
                </h2>
                {
                    datosReporte.principalesProveedores.map((proveedor) => (
                        <article key={proveedor.nombre} className="reporteRankingItem reporteRankingProveedor">
                            <div>
                                <p>{proveedor.nombre}</p>
                                <span>{proveedor.compras} {proveedor.compras === 1 ? "compra" : "compras"}</span>
                            </div>
                            <div>
                                <strong>{formatearPrecioSimple(proveedor.monto)}</strong>
                                <span>{formatearNumero(proveedor.cantidad)} kg</span>
                            </div>
                        </article>
                    ))
                }
            </div>

            {
                cargando && <p className="reportesCargando">Cargando reportes...</p>
            }
        </div>
    </section>
}
