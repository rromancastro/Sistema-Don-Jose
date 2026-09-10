import { formatearFecha } from "./fechas"
import { formatearDineroConDecimales as formatearPrecio, formatearDocumento, formatearTipoStock } from "./normalizadores"

const crearPDFBase = async () => {
    const { jsPDF } = await import("jspdf")
    const pdf = new jsPDF()
    const margen = 18
    const anchoPagina = pdf.internal.pageSize.getWidth()

    return {
        anchoPagina,
        margen,
        pdf,
    }
}

const escribirEncabezado = (pdf, anchoPagina, titulo, subtitulo, detalle) => {
    let y = 22

    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(20)
    pdf.setTextColor(127, 34, 254)
    pdf.text(titulo, anchoPagina / 2, y, { align: "center" })

    y += 8
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(10)
    pdf.setTextColor(54, 65, 99)
    pdf.text(subtitulo, anchoPagina / 2, y, { align: "center" })

    y += 8
    pdf.text(detalle, anchoPagina / 2, y, { align: "center" })

    return y
}

const escribirSeparador = (pdf, margen, anchoPagina, y) => {
    pdf.setDrawColor(203, 213, 225)
    pdf.line(margen, y, anchoPagina - margen, y)
}

const escribirCliente = (pdf, margen, cliente, y) => {
    y += 12
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(10)
    pdf.setTextColor(54, 65, 99)
    pdf.text("Cliente", margen, y)

    y += 8
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(12)
    pdf.setTextColor(15, 23, 42)
    pdf.text(cliente?.nombre || "Cliente sin nombre", margen, y)

    if (cliente?.dni_cuit) {
        y += 7
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(10)
        pdf.setTextColor(54, 65, 99)
        pdf.text(`DNI/CUIT: ${cliente.dni_cuit}`, margen, y)
    }

    if (cliente?.direccion) {
        y += 7
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(10)
        pdf.setTextColor(54, 65, 99)
        pdf.text(`Direccion: ${cliente.direccion}`, margen, y)
    }

    return y
}

const escribirItems = (pdf, margen, anchoPagina, items, y) => {
    y += 14
    ;(items || []).forEach((item) => {
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

    return y
}

const escribirTotal = (pdf, margen, anchoPagina, total, color, y) => {
    escribirSeparador(pdf, margen, anchoPagina, y)

    y += 13
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(11)
    pdf.setTextColor(54, 65, 99)
    pdf.text("Total", margen, y)
    pdf.setFontSize(18)
    pdf.setTextColor(...color)
    pdf.text(formatearPrecio(total), anchoPagina - margen, y, { align: "right" })

    return y
}

export const descargarComprobantePDF = async (documento) => {
    const { anchoPagina, margen, pdf } = await crearPDFBase()
    let y = escribirEncabezado(
        pdf,
        anchoPagina,
        documento.negocio?.nombre || "Don Jose",
        documento.negocio?.rubro || "Frutos Secos",
        `${formatearDocumento(documento.tipo_documento)} - ${documento.fecha_hora || formatearFecha(documento.fecha)}`,
    )

    if (documento.tipo_documento === "factura" && documento.factura_electronica) {
        y += 7
        const estadoFactura = documento.factura_electronica.cae
            ? `CAE: ${documento.factura_electronica.cae}`
            : `Factura electronica: ${documento.factura_electronica.mensaje || "pendiente"}`

        pdf.text(estadoFactura, anchoPagina / 2, y, { align: "center" })
    }

    y += 14
    escribirSeparador(pdf, margen, anchoPagina, y)
    y = escribirCliente(pdf, margen, documento.cliente, y)
    y = escribirItems(pdf, margen, anchoPagina, documento.items, y)
    y = escribirTotal(pdf, margen, anchoPagina, documento.total, [0, 166, 62], y)

    y += 10
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(10)
    pdf.setTextColor(54, 65, 99)
    pdf.text(`Pago: ${documento.pago?.metodo_label || documento.metodo_pago || "Efectivo"} - ${documento.pago?.estado_label || documento.estado_pago || "Completo"}`, margen, y)

    if (documento.estado_pago === "incompleto") {
        y += 6
        pdf.text(`Pagado: ${formatearPrecio(documento.monto_pagado)} - Debe: ${formatearPrecio(documento.monto_debe)}`, margen, y)
    }

    if (documento.observaciones) {
        y += 10
        pdf.text("Observaciones", margen, y)
        y += 6
        pdf.text(pdf.splitTextToSize(documento.observaciones, anchoPagina - margen * 2), margen, y)
    }

    y += 18
    pdf.setFont("helvetica", "italic")
    pdf.setFontSize(9)
    pdf.setTextColor(74, 85, 121)
    pdf.text("Gracias por su compra!", anchoPagina / 2, y, { align: "center" })

    pdf.save(`${documento.tipo_documento || "documento"}-don-jose-${documento.fecha || documento.id}.pdf`)
}

export const descargarCotizacionPDF = async (cotizacion) => {
    const { crearCotizacionPDF } = await import("./cotizacionPdf")
    const respuesta = await fetch("/logo-cotizacion.jpg")
    if (!respuesta.ok) throw new Error("No se pudo cargar el logo de la cotizacion.")
    const logo = new Uint8Array(await respuesta.arrayBuffer())
    const pdf = crearCotizacionPDF(cotizacion, logo)
    const numero = String(cotizacion.numero || cotizacion.id).replace(/[^a-zA-Z0-9_-]/g, "-")
    pdf.save(`cotizacion-don-jose-${numero}.pdf`)
}
