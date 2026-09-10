import { jsPDF } from "jspdf"

const dinero = (valor) => Number(valor || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fechaTexto = (fecha) => fecha ? fecha.split("-").reverse().join("/") : ""

export const crearCotizacionPDF = (cotizacion, logo) => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" })
    const x = 10, ancho = 190, limite = 280
    const columnas = [10, 34, 116, 139, 170, 200]
    const cliente = cotizacion.cliente || {}
    let y = 10
    const texto = (valor, tx, ty, size = 9, bold = false, opciones = {}) => {
        pdf.setFont("helvetica", bold ? "bold" : "normal")
        pdf.setFontSize(size)
        pdf.setTextColor(0)
        pdf.text(String(valor ?? ""), tx, ty, opciones)
    }
    const banda = (titulo) => {
        pdf.setFillColor(0)
        pdf.rect(x, y, ancho, 7, "F")
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(9)
        pdf.setTextColor(255)
        pdf.text(titulo, x + 2, y + 4.8)
        y += 7
    }
    const encabezado = () => {
        pdf.setDrawColor(0)
        pdf.setLineWidth(0.3)
        pdf.rect(x, 10, ancho, 39)
        pdf.line(168, 10, 168, 49)
        pdf.line(168, 23, 200, 23)
        if (logo) pdf.addImage(logo, "JPEG", 20, 12, 34, 30)
        texto("Tel.: 2625-402215 / WhatsApp: 2625 402215", 110, 17, 8, true, { align: "center" })
        texto("Av. Sarmiento S/N", 110, 26, 8, true, { align: "center" })
        texto("Bowen - Gral. Alvear, Mendoza", 110, 30, 8, true, { align: "center" })
        texto("Facebook: Frutas Don José", 110, 35, 8, false, { align: "center" })
        texto("Instagram: frutasdonjose.ok", 110, 39, 8, false, { align: "center" })
        texto("gfrutsrl@gmail.com / www.frutasdonjose.com", 110, 44, 7, false, { align: "center" })
        texto("Creado en", 184, 15, 8, false, { align: "center" })
        texto(fechaTexto(cotizacion.fecha), 184, 20, 9, true, { align: "center" })
        texto("Cotización n°", 184, 30, 9, true, { align: "center" })
        texto(cotizacion.numero, 184, 37, 10, true, { align: "center", maxWidth: 29 })
        y = 56
    }
    const nuevaPagina = () => {
        pdf.addPage()
        encabezado()
    }
    const filaDatos = (campos) => {
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(9)
        const celdas = campos.map(([etiqueta, valor, inicio, fin]) => ({ inicio, fin, lineas: pdf.splitTextToSize(`${etiqueta}: ${valor || ""}`, fin - inicio - 4) }))
        const altura = Math.max(10, ...celdas.map(c => c.lineas.length * 4 + 4))
        if (y + altura > limite) nuevaPagina()
        celdas.forEach(c => {
            pdf.rect(c.inicio, y, c.fin - c.inicio, altura)
            texto(c.lineas.join("\n"), c.inicio + 2, y + 5)
        })
        y += altura
    }
    const cabeceraTabla = () => {
        pdf.setFillColor(0)
        pdf.rect(x, y, ancho, 8, "F")
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(8)
        pdf.setTextColor(255)
        ;["CÓDIGO", "DESCRIPCIÓN", "CANT.", "PRECIO UNIT.", "TOTAL"].forEach((titulo, i) => pdf.text(titulo, columnas[i] + 2, y + 5))
        y += 8
    }
    encabezado()
    filaDatos([["Cliente", cliente.nombre, 10, 135], ["Vendedor", cotizacion.vendedor, 135, 200]])
    filaDatos([["Teléfono", cliente.telefono, 10, 68], ["Celular", cliente.celular, 68, 123], ["Email", cliente.email, 123, 200]])
    filaDatos([["Dirección", cliente.direccion, 10, 135], ["Barrio", cliente.barrio, 135, 200]])
    filaDatos([["Ciudad", cliente.ciudad, 10, 85], ["Provincia", cliente.provincia, 85, 155], ["Código postal", cliente.codigo_postal, 155, 200]])
    y += 5
    cabeceraTabla()
    for (const item of cotizacion.items || []) {
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(9)
        const lineas = pdf.splitTextToSize(item.nombre || "Producto", 78)
        let continuacion = false
        // Divide descripciones extensas sin perder texto ni superar la página.
        while (lineas.length) {
            if (y + 10 > 253) { nuevaPagina(); cabeceraTabla() }
            const capacidad = Math.max(1, Math.floor((253 - y - 4) / 4))
            const bloque = lineas.splice(0, capacidad)
            const altura = Math.max(10, bloque.length * 4 + 4)
            for (let i = 0; i < 5; i++) pdf.rect(columnas[i], y, columnas[i + 1] - columnas[i], altura)
            texto(bloque.join("\n"), 36, y + 5)
            if (!continuacion) {
                texto(item.id_producto || "", 12, y + 5, 8)
                texto(`${Number(item.cantidad_kg).toLocaleString("es-AR")} ${item.tipo_stock === "unidad" ? "un." : "kg"}`, 137, y + 5, 8, false, { align: "right" })
                texto(dinero(item.precio_unitario), 168, y + 5, 8, false, { align: "right" })
                texto(dinero(item.subtotal), 198, y + 5, 8, false, { align: "right" })
            }
            y += altura
            continuacion = true
            if (lineas.length) { nuevaPagina(); cabeceraTabla() }
        }
    }
    // Conserva el espacio de la planilla para cotizaciones cortas.
    while (y + 10 <= 253) {
        for (let i = 0; i < 5; i++) pdf.rect(columnas[i], y, columnas[i + 1] - columnas[i], 10)
        y += 10
    }
    pdf.rect(139, y, 61, 9)
    texto(`Total  $ ${dinero(cotizacion.total)}`, 198, y + 6, 11, true, { align: "right" })
    y += 11
    banda("Observaciones:")
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(9)
    const notas = pdf.splitTextToSize(cotizacion.observaciones || " ", ancho - 4)
    while (notas.length) {
        if (y + 8 > limite) { nuevaPagina(); banda("Observaciones (continuación):") }
        const capacidad = Math.max(1, Math.floor((limite - y - 4) / 4))
        const bloque = notas.splice(0, capacidad)
        const altura = Math.max(10, bloque.length * 4 + 4)
        pdf.rect(x, y, ancho, altura)
        texto(bloque.join("\n"), x + 2, y + 5)
        y += altura
    }
    const paginas = pdf.getNumberOfPages()
    for (let pagina = 1; pagina <= paginas; pagina++) {
        pdf.setPage(pagina)
        texto(`${pagina} / ${paginas}`, 200, 289, 8, false, { align: "right" })
    }
    return pdf
}
