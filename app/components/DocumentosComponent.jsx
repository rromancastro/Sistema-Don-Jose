"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { FaArrowLeft, FaChevronLeft, FaChevronRight, FaDownload, FaEye, FaTimes } from "react-icons/fa"
import { FiCalendar, FiFileText } from "react-icons/fi"
import { LuReceiptText } from "react-icons/lu"
import { obtenerDocumentos } from "../lib/firebase"
import { NavComponent } from "./NavComponent"

const FILTROS = {
    TODOS: "todos",
    REMITOS: "remito",
    FACTURAS: "factura",
}
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const DIAS_SEMANA = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"]

const formatearPrecio = (valor) => `$${Number(valor || 0).toFixed(2)}`
const formatearDocumento = (documento) => documento === "factura" ? "Factura" : "Remito"
const formatearTipoStock = (tipoStock, cantidad = 1) => {
    if (tipoStock === "unidad") return cantidad === 1 ? "unidad" : "unidades"

    return "kg"
}
const formatearFecha = (fecha) => {
    if (!fecha) return ""

    const [anio, mes, dia] = fecha.split("-")

    if (!anio || !mes || !dia) return fecha

    return `${dia}/${mes}/${anio}`
}
const obtenerFechaInput = (fecha) => {
    const anio = fecha.getFullYear()
    const mes = String(fecha.getMonth() + 1).padStart(2, "0")
    const dia = String(fecha.getDate()).padStart(2, "0")

    return `${anio}-${mes}-${dia}`
}
const crearFechaDesdeInput = (fecha) => {
    if (!fecha) return new Date()

    const [anio, mes, dia] = fecha.split("-").map(Number)

    return new Date(anio, mes - 1, dia)
}
const obtenerDiasCalendario = (mesVisible) => {
    const primerDiaMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1)
    const inicioCalendario = new Date(primerDiaMes)
    inicioCalendario.setDate(primerDiaMes.getDate() - primerDiaMes.getDay())

    return Array.from({ length: 42 }, (_, index) => {
        const fechaDia = new Date(inicioCalendario)
        fechaDia.setDate(inicioCalendario.getDate() + index)

        return {
            dia: fechaDia.getDate(),
            esMesActual: fechaDia.getMonth() === mesVisible.getMonth(),
            valor: obtenerFechaInput(fechaDia),
        }
    })
}

const obtenerFechaOrden = (documento) => {
    if (documento.fecha) return documento.fecha

    return ""
}

const descargarPDF = async (documento) => {
    const { jsPDF } = await import("jspdf")
    const pdf = new jsPDF()
    const margen = 18
    const anchoPagina = pdf.internal.pageSize.getWidth()
    let y = 22

    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(20)
    pdf.setTextColor(127, 34, 254)
    pdf.text(documento.negocio?.nombre || "Don Jose", anchoPagina / 2, y, { align: "center" })

    y += 8
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(10)
    pdf.setTextColor(54, 65, 99)
    pdf.text(documento.negocio?.rubro || "Frutos Secos", anchoPagina / 2, y, { align: "center" })

    y += 8
    pdf.text(`${formatearDocumento(documento.tipo_documento)} - ${documento.fecha_hora || formatearFecha(documento.fecha)}`, anchoPagina / 2, y, { align: "center" })

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
    pdf.text(documento.cliente?.nombre || "Cliente sin nombre", margen, y)

    y += 14
    ;(documento.items || []).forEach((item) => {
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
    pdf.setTextColor(0, 166, 62)
    pdf.text(formatearPrecio(documento.total), anchoPagina - margen, y, { align: "right" })

    y += 18
    pdf.setFont("helvetica", "italic")
    pdf.setFontSize(9)
    pdf.setTextColor(74, 85, 121)
    pdf.text("Gracias por su compra!", anchoPagina / 2, y, { align: "center" })

    pdf.save(`${documento.tipo_documento || "documento"}-don-jose-${documento.fecha || documento.id}.pdf`)
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

            setDocumentos(data)
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
    const fechaHoy = obtenerFechaInput(new Date())

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
                                <strong>{MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}</strong>
                                <button type="button" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
                                    <FaChevronRight />
                                </button>
                            </div>

                            <div className="documentosCalendarioSemana">
                                {DIAS_SEMANA.map((dia) => <span key={dia}>{dia}</span>)}
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
                                    <button type="button" onClick={() => descargarPDF(documento)}>
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
                        </article>

                        <button type="button" className="documentoModalDescargar" onClick={() => descargarPDF(documentoActivo)}>
                            <FaDownload />
                            Descargar PDF
                        </button>
                    </div>
                </div>
            )
        }
    </section>
}
