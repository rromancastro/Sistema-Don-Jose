import { jsPDF } from "jspdf"

const numero = valor => Number(valor || 0).toLocaleString("es-AR", { maximumFractionDigits: 3 })

export const crearValePDF = (compra) => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a5" })
    const texto = (valor, x, y, size = 9, bold = false, opciones = {}) => {
        pdf.setFont("helvetica", bold ? "bold" : "normal")
        pdf.setFontSize(size)
        pdf.text(String(valor ?? ""), x, y, opciones)
    }
    const linea = (x1, y1, x2, y2) => pdf.line(x1, y1, x2, y2)
    pdf.setDrawColor(0)
    pdf.setTextColor(0)
    pdf.setLineWidth(0.35)
    pdf.rect(6, 6, 198, 136)
    texto("G-FRUT S.R.L.", 9, 16, 20, true)
    texto("SARMIENTO S/N.     BOWEN (MZA.)", 201, 15, 10, true, { align: "right" })
    linea(6, 21, 204, 21)
    texto("VALE", 9, 30, 15, true)
    texto("a favor del Sr. ........................................................", 26, 30, 11)
    const fecha = (compra.fecha || "").split("-").reverse()
    fecha.forEach((parte, i) => {
        pdf.roundedRect(160 + i * 14, 23, 13, 10, 1, 1)
        texto(parte, 166.5 + i * 14, 29.5, 9, false, { align: "center" })
    })
    linea(6, 35, 204, 35)
    texto(`N°: ${compra.numero || ""}`, 9, 40, 9, true)
    texto(`Productor: ${compra.productor?.nombre || compra.productor_nombre || ""}`, 56, 40, 9, false, { maxWidth: 144 })
    linea(6, 47, 204, 47)
    const columnas = [6, 32, 104, 137, 169, 204]
    ;["CANTIDAD", "PRODUCTO", "Kg. BRUTO", "TARA", "Kg. NETO"].forEach((titulo, i) => {
        texto(titulo, (columnas[i] + columnas[i + 1]) / 2, 52, 9, true, { align: "center" })
    })
    linea(6, 55, 204, 55)
    columnas.slice(1, -1).forEach(x => linea(x, 47, x, 91))
    texto(numero(compra.cantidad), 19, 61, 10, false, { align: "center" })
    pdf.setFontSize(9)
    const descripcion = pdf.splitTextToSize(`${compra.producto || ""} / ${compra.variedad || ""}`, 68)
    texto(descripcion.slice(0, 4).join("\n"), 34, 61, 9)
    texto(numero(compra.bruto), 120.5, 61, 10, false, { align: "center" })
    texto(numero(compra.tara), 153, 61, 10, false, { align: "center" })
    texto(numero(compra.neto), 186.5, 61, 10, false, { align: "center" })
    pdf.setLineDashPattern([1, 1], 0)
    ;[74, 82].forEach(y => linea(6, y, 204, y))
    pdf.setLineDashPattern([], 0)
    linea(6, 91, 204, 91)
    texto(`Envase: ${compra.envase || ""}`, 9, 96, 9, false, { maxWidth: 110 })
    texto(`Pulpa neta: ${compra.pulpa_neta ?? ""}`, 124, 96, 9, false, { maxWidth: 77 })
    pdf.setFontSize(8)
    const detalle = pdf.splitTextToSize(`Detalle: ${compra.detalle || ""}`, 190)
    texto(detalle.slice(0, 2).join("\n"), 9, 102, 8)
    linea(6, 111, 204, 111)
    texto("MOVIMIENTO DE ENVASE", 60, 117, 11, true, { align: "center" })
    linea(6, 120, 114, 120)
    linea(6, 126, 114, 126)
    ;[42, 78, 114].forEach(x => linea(x, 120, x, 142))
    ;["ENTREGA", "LLEVA", "SALDO"].forEach((titulo, i) => texto(titulo, 24 + i * 36, 124.5, 9, false, { align: "center" }))
    pdf.setLineDashPattern([1, 1], 0)
    linea(6, 134, 114, 134)
    linea(126, 136, 198, 136)
    pdf.setLineDashPattern([], 0)
    texto("VALE", 123, 121, 17, true)
    texto(compra.numero_vale, 200, 125, 15, false, { align: "right" })
    texto("FIRMA", 162, 140, 7, false, { align: "center" })

    // Los textos extensos continúan en un anexo sin ocupar los espacios manuscritos.
    const pendientes = [
        ...(descripcion.length > 4 ? [`Producto / variedad: ${compra.producto} / ${compra.variedad}`] : []),
        ...(detalle.length > 2 ? [`Detalle: ${compra.detalle}`] : []),
    ]
    if (pendientes.length) {
        pdf.setFontSize(10)
        const lineas = pdf.splitTextToSize(pendientes.join("\n\n"), 188)
        while (lineas.length) {
            pdf.addPage()
            texto(`VALE ${compra.numero_vale} — Continuación`, 10, 14, 13, true)
            texto(lineas.splice(0, 24).join("\n"), 10, 24, 10)
        }
    }
    return pdf
}

export const descargarValePDF = (compra) => {
    const pdf = crearValePDF(compra)
    pdf.save(`vale-${String(compra.numero_vale).replace(/[^0-9]/g, "")}.pdf`)
}
