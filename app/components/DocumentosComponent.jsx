"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { FaArrowLeft, FaChevronLeft, FaChevronRight, FaDownload, FaEye, FaTimes } from "react-icons/fa"
import { FiCalendar, FiFileText } from "react-icons/fi"
import { LuReceiptText } from "react-icons/lu"
import { descargarComprobantePDF } from "../lib/documentosPdf"
import { crearFechaDesdeInput, DIAS_SEMANA_DOS_LETRAS, formatearFecha, MESES_LARGOS, obtenerDiasCalendario, obtenerFechaActual } from "../lib/fechas"
import { obtenerDocumentos } from "../lib/firebase"
import { formatearDineroConDecimales as formatearPrecio, formatearDocumento, formatearTipoStock, normalizarComprobanteVenta, normalizarLista } from "../lib/normalizadores"
import { NavComponent } from "./NavComponent"

const FILTROS = {
    TODOS: "todos",
    REMITOS: "remito",
    FACTURAS: "factura",
}
const obtenerFechaOrden = (documento) => {
    if (documento.fecha) return documento.fecha

    return ""
}

export const DocumentosComponent = () => {
    const [documentos, setDocumentos] = useState([])
    const [filtro, setFiltro] = useState(FILTROS.TODOS)
    const [fecha, setFecha] = useState("")
    const [calendarioAbierto, setCalendarioAbierto] = useState(false)
    const [mesVisible, setMesVisible] = useState(() => {
        const hoy = new Date()

        return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    })
    const [documentoActivo, setDocumentoActivo] = useState(null)

    useEffect(() => {
        const cargarDocumentos = async () => {
            const data = await obtenerDocumentos("comprobantes_venta")

            setDocumentos(normalizarLista(data, normalizarComprobanteVenta))
        }

        cargarDocumentos()
    }, [])

    const documentosFiltrados = useMemo(() => {
        return documentos
            .filter((documento) => filtro === FILTROS.TODOS || documento.tipo_documento === filtro)
            .filter((documento) => !fecha || documento.fecha === fecha)
            .sort((a, b) => obtenerFechaOrden(b).localeCompare(obtenerFechaOrden(a)))
    }, [documentos, fecha, filtro])
    const diasCalendario = useMemo(() => obtenerDiasCalendario(mesVisible), [mesVisible])
    const fechaHoy = obtenerFechaActual()

    const abrirCalendario = () => {
        if (fecha) {
            const fechaSeleccionada = crearFechaDesdeInput(fecha)
            setMesVisible(new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), 1))
        }

        setCalendarioAbierto((abierto) => !abierto)
    }

    const cambiarMes = (cantidad) => {
        setMesVisible((mesActual) => new Date(mesActual.getFullYear(), mesActual.getMonth() + cantidad, 1))
    }

    const seleccionarFecha = (nuevaFecha) => {
        setFecha(nuevaFecha)
        setCalendarioAbierto(false)
    }

    return <section>
        <NavComponent bgColor="#1E2939" >
            <Link href={'/'}>
                <FaArrowLeft />
            </Link>
            <h1>Documentos</h1>
        </NavComponent>

        <div id="documentosContainer">
            <div className="documentosTabs">
                <button type="button" className={filtro === FILTROS.TODOS ? "documentosTabActivo" : ""} onClick={() => setFiltro(FILTROS.TODOS)}>
                    Todos
                </button>
                <button type="button" className={filtro === FILTROS.REMITOS ? "documentosTabActivo" : ""} onClick={() => setFiltro(FILTROS.REMITOS)}>
                    Remitos
                </button>
                <button type="button" className={filtro === FILTROS.FACTURAS ? "documentosTabActivo" : ""} onClick={() => setFiltro(FILTROS.FACTURAS)}>
                    Facturas
                </button>
            </div>

            <div className="documentosFecha">
                <button type="button" className="documentosFechaTrigger" onClick={abrirCalendario}>
                    <span className="documentosFechaIcono">
                        <FiCalendar />
                    </span>
                    <span className="documentosFechaTexto">
                        <small>Fecha</small>
                        <strong>{fecha ? formatearFecha(fecha) : "Todas las fechas"}</strong>
                    </span>
                </button>
                {
                    fecha && (
                        <button type="button" className="documentosFechaLimpiar" onClick={() => setFecha("")}>
                            <FaTimes />
                            Limpiar
                        </button>
                    )
                }
                {
                    calendarioAbierto && (
                        <div className="documentosCalendario">
                            <div className="documentosCalendarioHeader">
                                <button type="button" onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
                                    <FaChevronLeft />
                                </button>
                                <strong>{MESES_LARGOS[mesVisible.getMonth()]} {mesVisible.getFullYear()}</strong>
                                <button type="button" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
                                    <FaChevronRight />
                                </button>
                            </div>

                            <div className="documentosCalendarioSemana">
                                {DIAS_SEMANA_DOS_LETRAS.map((dia) => <span key={dia}>{dia}</span>)}
                            </div>

                            <div className="documentosCalendarioDias">
                                {
                                    diasCalendario.map((dia) => (
                                        <button
                                            key={dia.valor}
                                            type="button"
                                            className={[
                                                !dia.esMesActual ? "documentosCalendarioDiaFuera" : "",
                                                dia.valor === fecha ? "documentosCalendarioDiaActivo" : "",
                                                dia.valor === fechaHoy ? "documentosCalendarioDiaHoy" : "",
                                            ].filter(Boolean).join(" ")}
                                            onClick={() => seleccionarFecha(dia.valor)}
                                        >
                                            {dia.dia}
                                        </button>
                                    ))
                                }
                            </div>

                            <div className="documentosCalendarioFooter">
                                <button type="button" onClick={() => {
                                    setFecha("")
                                    setCalendarioAbierto(false)
                                }}>
                                    Todas
                                </button>
                                <button type="button" onClick={() => seleccionarFecha(fechaHoy)}>
                                    Hoy
                                </button>
                            </div>
                        </div>
                    )
                }
            </div>

            <div className="documentosLista">
                {
                    documentosFiltrados.length === 0 ? (
                        <p className="documentosVacio">No hay documentos para mostrar</p>
                    ) : (
                        documentosFiltrados.map((documento) => {
                            const esFactura = documento.tipo_documento === FILTROS.FACTURAS

                            return <article key={documento.id} className="documentoCard">
                                <div className={esFactura ? "documentoIcono documentoIconoFactura" : "documentoIcono documentoIconoRemito"}>
                                    {esFactura ? <FiFileText /> : <LuReceiptText />}
                                </div>

                                <div className="documentoInfo">
                                    <span>{formatearDocumento(documento.tipo_documento)}</span>
                                    <strong>{documento.cliente?.nombre || "Cliente sin nombre"}</strong>
                                </div>

                                <div className="documentoTotal">
                                    <span>{formatearFecha(documento.fecha)}</span>
                                    <strong>{formatearPrecio(documento.total)}</strong>
                                </div>

                                <div className="documentoAcciones">
                                    <button type="button" onClick={() => setDocumentoActivo(documento)}>
                                        <FaEye />
                                        Ver Documento
                                    </button>
                                    <button type="button" onClick={() => descargarComprobantePDF(documento)}>
                                        <FaDownload />
                                        Descargar PDF
                                    </button>
                                </div>
                            </article>
                        })
                    )
                }
            </div>
        </div>

        {
            documentoActivo && (
                <div className="documentoModal">
                    <div className="documentoModalPanel">
                        <button type="button" className="documentoModalCerrar" onClick={() => setDocumentoActivo(null)} aria-label="Cerrar documento">
                            <FaTimes />
                        </button>

                        <article className="documentoVista">
                            <div className="documentoVistaMarca">
                                <h2>{documentoActivo.negocio?.nombre || "Don José"}</h2>
                                <p>{documentoActivo.negocio?.rubro || "Frutos Secos"}</p>
                                <span>{documentoActivo.fecha_hora || formatearFecha(documentoActivo.fecha)}</span>
                            </div>

                            <div className="documentoVistaCliente">
                                <span>Cliente</span>
                                <strong>{documentoActivo.cliente?.nombre || "Cliente sin nombre"}</strong>
                                {
                                    documentoActivo.cliente?.dni_cuit && (
                                        <p>DNI/CUIT: {documentoActivo.cliente.dni_cuit}</p>
                                    )
                                }
                                {
                                    documentoActivo.cliente?.direccion && (
                                        <p>Direccion: {documentoActivo.cliente.direccion}</p>
                                    )
                                }
                            </div>

                            <div className="documentoVistaItems">
                                {
                                    (documentoActivo.items || []).map((item) => (
                                        <div key={item.id || item.producto_id} className="documentoVistaItem">
                                            <div>
                                                <p>{item.nombre || "Producto"}</p>
                                                <span>{item.cantidad_kg} {formatearTipoStock(item.tipo_stock, item.cantidad_kg)} x {formatearPrecio(item.precio_unitario)}/{formatearTipoStock(item.tipo_stock)}</span>
                                            </div>
                                            <strong>{formatearPrecio(item.subtotal)}</strong>
                                        </div>
                                    ))
                                }
                            </div>

                            <div className="documentoVistaTotal">
                                <span>Total</span>
                                <strong>{formatearPrecio(documentoActivo.total)}</strong>
                            </div>

                            {
                                documentoActivo.observaciones && (
                                    <div className="documentoVistaObservaciones">
                                        <span>Observaciones</span>
                                        <p>{documentoActivo.observaciones}</p>
                                    </div>
                                )
                            }
                        </article>

                        <button type="button" className="documentoModalDescargar" onClick={() => descargarComprobantePDF(documentoActivo)}>
                            <FaDownload />
                            Descargar PDF
                        </button>
                    </div>
                </div>
            )
        }
    </section>
}
