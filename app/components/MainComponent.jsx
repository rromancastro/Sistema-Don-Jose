"use client"

import { IoCartOutline } from "react-icons/io5"
import { NavComponent } from "./NavComponent"
import { FiBell, FiBox, FiChevronLeft, FiChevronRight, FiClipboard, FiDollarSign, FiEdit3, FiSearch, FiUsers } from "react-icons/fi"
import { FaArrowRight, FaRegChartBar, FaUserCheck } from "react-icons/fa"
import { GoHistory, GoPlus, GoTrash } from "react-icons/go"
import { LuFileSpreadsheet } from "react-icons/lu"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { actualizarDocumento, crearDocumento, eliminarDocumento, obtenerDocumentos } from "../lib/firebase"

const CATEGORIAS_FRUTA_FRESCA = ["Fruta Fresca", "Fruta Fresta"]
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
const DIAS_SEMANA = ["D", "L", "M", "M", "J", "V", "S"]
const notaVacia = {
    titulo: "",
    descripcion: "",
}

const obtenerStockProducto = (producto) => Number(producto.stock ?? producto.stock_kg ?? producto.cantidad_kg ?? 0)
const formatearPrecio = (valor) => `$${Number(valor || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`
const formatearCantidad = (valor) => `${Number(valor || 0).toLocaleString("es-AR", {
    maximumFractionDigits: 2,
})} kg`
const obtenerFechaActual = () => {
    const ahora = new Date()
    return formatearFechaISO(ahora)
}
const formatearFechaISO = (fecha) => {
    const anio = fecha.getFullYear()
    const mes = String(fecha.getMonth() + 1).padStart(2, "0")
    const dia = String(fecha.getDate()).padStart(2, "0")

    return `${anio}-${mes}-${dia}`
}
const formatearFechaCalendario = (fechaISO) => {
    const [anio, mes, dia] = fechaISO.split("-")
    return `${dia}/${mes}/${anio}`
}

export const MainComponent = () => {
    const [comprobantesVenta, setComprobantesVenta] = useState([])
    const [compras, setCompras] = useState([])
    const [productos, setProductos] = useState([])
    const [recordatorios, setRecordatorios] = useState([])
    const [notas, setNotas] = useState([])
    const [fechaSeleccionada, setFechaSeleccionada] = useState(obtenerFechaActual())
    const [mesVisible, setMesVisible] = useState(() => {
        const hoy = new Date()

        return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    })
    const [creandoRecordatorio, setCreandoRecordatorio] = useState(false)
    const [nuevoRecordatorio, setNuevoRecordatorio] = useState("")
    const [busquedaNotas, setBusquedaNotas] = useState("")
    const [creandoNota, setCreandoNota] = useState(false)
    const [notaEditandoId, setNotaEditandoId] = useState(null)
    const [nuevaNota, setNuevaNota] = useState(notaVacia)
    const [notaEditada, setNotaEditada] = useState(notaVacia)

    useEffect(() => {
        const cargarDatos = async () => {
            const [comprobantesData, comprasData, productosData, recordatoriosData, notasData] = await Promise.all([
                obtenerDocumentos("comprobantes_venta"),
                obtenerDocumentos("compras"),
                obtenerDocumentos("productos"),
                obtenerDocumentos("recordatorios"),
                obtenerDocumentos("notas"),
            ])

            setComprobantesVenta(comprobantesData)
            setCompras(comprasData)
            setProductos(productosData)
            setRecordatorios(recordatoriosData)
            setNotas(notasData)
        }

        cargarDatos()
    }, [])

    const resumen = useMemo(() => {
        const fechaActual = obtenerFechaActual()
        const ventasHoy = comprobantesVenta
            .filter((venta) => venta.fecha === fechaActual)
            .reduce((total, venta) => total + Number(venta.total || 0), 0)
        const comprasHoy = compras
            .filter((compra) => compra.fecha === fechaActual)
            .reduce((total, compra) => total + Number(compra.total_compra || 0), 0)
        const stockFresco = productos
            .filter((producto) => CATEGORIAS_FRUTA_FRESCA.includes(producto.categoria))
            .reduce((total, producto) => total + obtenerStockProducto(producto), 0)
        const stockDeshidratado = productos
            .filter((producto) => !CATEGORIAS_FRUTA_FRESCA.includes(producto.categoria))
            .reduce((total, producto) => total + obtenerStockProducto(producto), 0)

        return {
            comprasHoy,
            stockDeshidratado,
            stockFresco,
            ventasHoy,
        }
    }, [comprobantesVenta, compras, productos])

    const diasCalendario = useMemo(() => {
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
            const fechaISO = formatearFechaISO(fecha)

            return {
                dia: index + 1,
                fecha: fechaISO,
                tieneRecordatorios: recordatorios.some((recordatorio) => recordatorio.fecha === fechaISO),
            }
        })

        return [...espaciosPrevios, ...dias]
    }, [mesVisible, recordatorios])

    const recordatoriosDelDia = useMemo(() => {
        return recordatorios.filter((recordatorio) => recordatorio.fecha === fechaSeleccionada)
    }, [recordatorios, fechaSeleccionada])

    const notasFiltradas = useMemo(() => {
        const textoBusqueda = busquedaNotas.trim().toLowerCase()
        const notasOrdenadas = [...notas].sort((a, b) => String(b.creado_en || "").localeCompare(String(a.creado_en || "")))

        if (!textoBusqueda) return notasOrdenadas

        return notasOrdenadas.filter((nota) => String(nota.titulo || "").toLowerCase().includes(textoBusqueda))
    }, [notas, busquedaNotas])

    const cambiarMes = (direccion) => {
        setMesVisible((mesActual) => new Date(mesActual.getFullYear(), mesActual.getMonth() + direccion, 1))
    }

    const seleccionarFecha = (fecha) => {
        setFechaSeleccionada(fecha)
        setCreandoRecordatorio(false)
        setNuevoRecordatorio("")
    }

    const guardarRecordatorio = async () => {
        const texto = nuevoRecordatorio.trim()

        if (!texto) return

        const recordatorioParaCrear = {
            fecha: fechaSeleccionada,
            texto,
            creado_en: new Date().toISOString(),
        }
        const id = await crearDocumento("recordatorios", recordatorioParaCrear)

        setRecordatorios((recordatoriosActuales) => [
            {
                id,
                ...recordatorioParaCrear,
            },
            ...recordatoriosActuales,
        ])
        setNuevoRecordatorio("")
        setCreandoRecordatorio(false)
    }

    const borrarRecordatorio = async (recordatorioId) => {
        await eliminarDocumento("recordatorios", recordatorioId)
        setRecordatorios((recordatoriosActuales) => recordatoriosActuales.filter((recordatorio) => recordatorio.id !== recordatorioId))
    }

    const guardarNota = async () => {
        const titulo = nuevaNota.titulo.trim()
        const descripcion = nuevaNota.descripcion.trim()

        if (!titulo || !descripcion) return

        const notaParaCrear = {
            titulo,
            descripcion,
            creado_en: new Date().toISOString(),
        }
        const id = await crearDocumento("notas", notaParaCrear)

        setNotas((notasActuales) => [
            {
                id,
                ...notaParaCrear,
            },
            ...notasActuales,
        ])
        setNuevaNota(notaVacia)
        setCreandoNota(false)
    }

    const editarNota = (nota) => {
        setCreandoNota(false)
        setNotaEditandoId(nota.id)
        setNotaEditada({
            titulo: nota.titulo || "",
            descripcion: nota.descripcion || "",
        })
    }

    const cancelarNota = () => {
        setNotaEditandoId(null)
        setNotaEditada(notaVacia)
    }

    const guardarNotaEditada = async (notaId) => {
        const titulo = notaEditada.titulo.trim()
        const descripcion = notaEditada.descripcion.trim()

        if (!titulo || !descripcion) return

        const notaActualizada = {
            titulo,
            descripcion,
            actualizado_en: new Date().toISOString(),
        }

        await actualizarDocumento("notas", notaId, notaActualizada)

        setNotas((notasActuales) => notasActuales.map((nota) => {
            if (nota.id !== notaId) return nota

            return {
                ...nota,
                ...notaActualizada,
            }
        }))
        cancelarNota()
    }

    const borrarNota = async (notaId) => {
        await eliminarDocumento("notas", notaId)
        setNotas((notasActuales) => notasActuales.filter((nota) => nota.id !== notaId))

        if (notaEditandoId === notaId) {
            cancelarNota()
        }
    }

    return <section>
        <NavComponent bgColor="#7F22FE" main={true}>
            <img src={'/logo-blanco.png'} alt="logo" />
            <h1>Control de Negocio - Don José</h1>
        </NavComponent >
        <div id="mainInfoCardsContainer" className="mainHoyContainer">
            <h2>Hoy</h2>
            <div className="mainHoyGrid">
                <div className="mainHoyStats">
                    <article className="mainInfoCard boxShadow">
                        <div className="bgColorVerde">
                            <FiDollarSign />
                        </div>
                        <p>Ventas</p>
                        <p>{formatearPrecio(resumen.ventasHoy)}</p>
                    </article>
                    <article className="mainInfoCard boxShadow">
                        <div className="bgColorNaranja">
                            <IoCartOutline />
                        </div>
                        <p>Compras</p>
                        <p>{formatearPrecio(resumen.comprasHoy)}</p>
                    </article>
                </div>

                <article className="mainCalendario boxShadow">
                    <div className="mainCalendarioHeader">
                        <button type="button" onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
                            <FiChevronLeft />
                        </button>
                        <p>{MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}</p>
                        <button type="button" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
                            <FiChevronRight />
                        </button>
                    </div>

                    <div className="mainCalendarioGrid">
                        {
                            DIAS_SEMANA.map((dia, index) => (
                                <span key={`${dia}-${index}`} className="mainCalendarioDiaSemana">{dia}</span>
                            ))
                        }
                        {
                            diasCalendario.map((dia) => (
                                dia.vacio ? (
                                    <span key={dia.id} className="mainCalendarioVacio" />
                                ) : (
                                    <button
                                        key={dia.fecha}
                                        type="button"
                                        className={`${dia.fecha === fechaSeleccionada ? "mainCalendarioActivo" : ""} ${dia.fecha === obtenerFechaActual() ? "mainCalendarioHoy" : ""}`}
                                        onClick={() => seleccionarFecha(dia.fecha)}
                                    >
                                        {dia.dia}
                                        {dia.tieneRecordatorios && <span />}
                                    </button>
                                )
                            ))
                        }
                    </div>

                    <div className="mainRecordatorios">
                        <div>
                            <span>
                                <FiBell />
                                {formatearFechaCalendario(fechaSeleccionada)}
                            </span>
                            <button type="button" onClick={() => setCreandoRecordatorio((valorActual) => !valorActual)} aria-label="Agregar recordatorio">
                                <GoPlus />
                            </button>
                        </div>

                        {
                            creandoRecordatorio && (
                                <form onSubmit={(e) => {
                                    e.preventDefault()
                                    guardarRecordatorio()
                                }}>
                                    <input
                                        type="text"
                                        value={nuevoRecordatorio}
                                        onChange={(e) => setNuevoRecordatorio(e.target.value)}
                                        placeholder="Nuevo recordatorio"
                                    />
                                    <button type="submit">Guardar</button>
                                </form>
                            )
                        }

                        {
                            recordatoriosDelDia.length === 0 ? (
                                <p>Sin recordatorios</p>
                            ) : (
                                <ul>
                                    {
                                        recordatoriosDelDia.map((recordatorio) => (
                                            <li key={recordatorio.id}>
                                                <span>{recordatorio.texto}</span>
                                                <button type="button" onClick={() => borrarRecordatorio(recordatorio.id)} aria-label="Eliminar recordatorio">
                                                    <GoTrash />
                                                </button>
                                            </li>
                                        ))
                                    }
                                </ul>
                            )
                        }
                    </div>
                </article>

                <article className="mainNotas boxShadow">
                    <div className="mainNotasHeader">
                        <div>
                            <h3>Notas</h3>
                            <span>{notas.length} {notas.length === 1 ? "nota" : "notas"}</span>
                        </div>
                        <button type="button" onClick={() => {
                            setCreandoNota((valorActual) => !valorActual)
                            setNotaEditandoId(null)
                        }} aria-label="Agregar nota">
                            <GoPlus />
                        </button>
                    </div>

                    <div className="mainNotasSearch">
                        <FiSearch />
                        <input
                            type="search"
                            value={busquedaNotas}
                            onChange={(e) => setBusquedaNotas(e.target.value)}
                            placeholder="Buscar por título"
                        />
                    </div>

                    {
                        creandoNota && (
                            <form className="mainNotaForm" onSubmit={(e) => {
                                e.preventDefault()
                                guardarNota()
                            }}>
                                <input
                                    type="text"
                                    value={nuevaNota.titulo}
                                    onChange={(e) => setNuevaNota((notaActual) => ({
                                        ...notaActual,
                                        titulo: e.target.value,
                                    }))}
                                    placeholder="Título"
                                />
                                <textarea
                                    value={nuevaNota.descripcion}
                                    onChange={(e) => setNuevaNota((notaActual) => ({
                                        ...notaActual,
                                        descripcion: e.target.value,
                                    }))}
                                    placeholder="Descripción"
                                />
                                <div>
                                    <button type="submit">Guardar</button>
                                    <button type="button" onClick={() => {
                                        setCreandoNota(false)
                                        setNuevaNota(notaVacia)
                                    }}>Cancelar</button>
                                </div>
                            </form>
                        )
                    }

                    <div className="mainNotasLista">
                        {
                            notasFiltradas.length === 0 ? (
                                <p>Sin notas</p>
                            ) : (
                                notasFiltradas.map((nota) => (
                                    <article key={nota.id} className="mainNotaItem">
                                        {
                                            notaEditandoId === nota.id ? (
                                                <form className="mainNotaForm" onSubmit={(e) => {
                                                    e.preventDefault()
                                                    guardarNotaEditada(nota.id)
                                                }}>
                                                    <input
                                                        type="text"
                                                        value={notaEditada.titulo}
                                                        onChange={(e) => setNotaEditada((notaActual) => ({
                                                            ...notaActual,
                                                            titulo: e.target.value,
                                                        }))}
                                                        placeholder="Título"
                                                    />
                                                    <textarea
                                                        value={notaEditada.descripcion}
                                                        onChange={(e) => setNotaEditada((notaActual) => ({
                                                            ...notaActual,
                                                            descripcion: e.target.value,
                                                        }))}
                                                        placeholder="Descripción"
                                                    />
                                                    <div>
                                                        <button type="submit">Guardar</button>
                                                        <button type="button" onClick={cancelarNota}>Cancelar</button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <>
                                                    <div>
                                                        <h4>{nota.titulo}</h4>
                                                        <p>{nota.descripcion}</p>
                                                    </div>
                                                    <div className="mainNotaActions">
                                                        <button type="button" onClick={() => editarNota(nota)} aria-label={`Editar ${nota.titulo}`}>
                                                            <FiEdit3 />
                                                        </button>
                                                        <button type="button" onClick={() => borrarNota(nota.id)} aria-label={`Eliminar ${nota.titulo}`}>
                                                            <GoTrash />
                                                        </button>
                                                    </div>
                                                </>
                                            )
                                        }
                                    </article>
                                ))
                            )
                        }
                    </div>
                </article>
            </div>
        </div>

        <div id="mainInfoCardsContainer">
            <h2>Stock Actual</h2>
            <div>
                <Link href={'/stock'} className="mainInfoCard boxShadow animClick">
                    <div className="bgColorVioleta">
                        <FiBox />
                    </div>
                    <p>Deshidratado</p>
                    <p>{formatearCantidad(resumen.stockDeshidratado)}</p>
                </Link>
                <Link href={'/stock'} className="mainInfoCard boxShadow animClick">
                    <div className="bgColorAzul">
                        <FiBox />
                    </div>
                    <p>Fruta Fresca</p>
                    <p>{formatearCantidad(resumen.stockFresco)}</p>
                </Link>
            </div>
        </div>

        <div id="mainAccionesContainer">
            <h2>Acciones Rapidas</h2>
            <div>
                <Link href={'/nueva-venta'} className="accionesCard boxShadow animClick bgColorVerde bdRadius">
                    <FiDollarSign />
                    <p>Nueva Venta</p>
                    <GoPlus />
                </Link>
                <Link href={'/nueva-compra'} className="accionesCard boxShadow animClick bgColorNaranja bdRadius">
                    <IoCartOutline />
                    <p>Nueva Compra</p>
                    <GoPlus />
                </Link>
                <Link href={'/nuena-transformacion'} className="accionesCard boxShadow animClick bgColorVioleta bdRadius">
                    <FaArrowRight />
                    <p>Nueva Transformación</p>
                    <GoPlus />
                </Link>
            </div>
        </div>

        <div className="gestionContainer">
            <h2>Gestión</h2>
            <div>
                <Link href={'/proveedores'} className="gestionCard bdRadius animClick boxShadow">
                    <FiUsers />
                    <p>Proveedores</p>
                </Link>
                <Link href={'/clientes'} className="gestionCard bdRadius animClick boxShadow">
                    <FaUserCheck />
                    <p>Clientes</p>
                </Link>
                <Link href={'/presupuestos'} className="gestionCard bdRadius animClick boxShadow">
                    <FiClipboard />
                    <p>Presupuestos</p>
                </Link>
                <Link href={'/documentos'} className="gestionCard bdRadius animClick boxShadow">
                    <LuFileSpreadsheet />
                    <p>Documentos</p>
                </Link>
            </div>
        </div>

        <div className="gestionContainer">
            <h2>Consultas</h2>
            <div>
                <Link href={'/historial'} className="gestionCard bdRadius animClick boxShadow">
                    <GoHistory />
                    <p>Historial</p>
                </Link>
                <article className="gestionCard bdRadius animClick boxShadow">
                    <FaRegChartBar />
                    <p>Reportes</p>
                </article>
            </div>
        </div>
    </section>
}
