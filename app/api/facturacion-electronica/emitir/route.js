import { emitirFacturaElectronicaArca, validarComprobanteFactura } from "../../../lib/arcaFacturacion"

export const runtime = "nodejs"

export async function POST(request) {
    const comprobante = await request.json()
    const errores = validarComprobanteFactura(comprobante)

    if (errores.length > 0) {
        return Response.json({
            estado: "rechazada",
            mensaje: errores.join(" "),
        }, { status: 400 })
    }

    try {
        const resultado = await emitirFacturaElectronicaArca(comprobante)
        const status = resultado.estado === "emitida" ? 200 : 503

        return Response.json(resultado, { status })
    } catch (error) {
        return Response.json({
            estado: "error",
            mensaje: error.message || "No se pudo emitir la factura electronica.",
        }, { status: 502 })
    }
}
