import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const TIPOS_COMPROBANTE = {
    A: 1,
    B: 6,
    C: 11,
}
const TIPOS_DOCUMENTO = {
    CUIT: 80,
    DNI: 96,
    CONSUMIDOR_FINAL: 99,
}
const IVA_IDS = {
    0: 3,
    10.5: 4,
    21: 5,
    27: 6,
}
const WSAA = {
    homologacion: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
    produccion: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
}
const WSFE = {
    homologacion: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
    produccion: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
}

const redondearImporte = (valor) => Number(Number(valor || 0).toFixed(2))
const soloNumeros = (valor) => String(valor || "").replace(/\D/g, "")
const obtenerFechaComprobante = (fecha) => Number(String(fecha || "").replace(/\D/g, ""))
const escaparXml = (valor) => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
const desescaparXml = (valor) => String(valor || "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")

const obtenerConfig = () => {
    const tipoComprobanteEnv = String(process.env.ARCA_TIPO_COMPROBANTE || "C").toUpperCase()
    const tipoComprobante = TIPOS_COMPROBANTE[tipoComprobanteEnv] || Number(tipoComprobanteEnv)
    const puntoVenta = Number(process.env.ARCA_PUNTO_VENTA || 0)
    const cuit = soloNumeros(process.env.ARCA_CUIT_EMISOR)
    const cert = String(process.env.ARCA_CERT || "").replaceAll("\\n", "\n")
    const key = String(process.env.ARCA_KEY || "").replaceAll("\\n", "\n")
    const ambiente = process.env.ARCA_AMBIENTE === "produccion" ? "produccion" : "homologacion"
    const errores = []

    if (!cuit) errores.push("Falta ARCA_CUIT_EMISOR.")
    if (!puntoVenta) errores.push("Falta ARCA_PUNTO_VENTA.")
    if (!tipoComprobante) errores.push("ARCA_TIPO_COMPROBANTE debe ser A, B, C o un codigo numerico valido.")
    if (!cert) errores.push("Falta ARCA_CERT.")
    if (!key) errores.push("Falta ARCA_KEY.")

    return {
        alicuotaIva: Number(process.env.ARCA_IVA_ALICUOTA || (tipoComprobante === TIPOS_COMPROBANTE.C ? 0 : 21)),
        ambiente,
        cert,
        cuit,
        errores,
        key,
        concepto: Number(process.env.ARCA_CONCEPTO || 1),
        opensslPath: process.env.ARCA_OPENSSL_PATH || "openssl",
        puntoVenta,
        tipoComprobante,
    }
}

const extraerTag = (xml, tag) => {
    const coincidencia = String(xml || "").match(new RegExp(`<[^:>]*:?${tag}[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${tag}>`))

    return coincidencia ? desescaparXml(coincidencia[1].trim()) : ""
}

const extraerErrorSoap = (xml) => {
    const fault = extraerTag(xml, "faultstring")
    const errMsg = extraerTag(xml, "Msg")
    const errCode = extraerTag(xml, "Code")

    if (fault) return fault
    if (errMsg) return errCode ? `(${errCode}) ${errMsg}` : errMsg

    return ""
}

const postSoap = async ({ action, body, url }) => {
    const respuesta = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "text/xml; charset=utf-8",
            SOAPAction: action,
        },
        body,
    })
    const texto = await respuesta.text()

    if (!respuesta.ok) {
        throw new Error(extraerErrorSoap(texto) || `ARCA respondio HTTP ${respuesta.status}.`)
    }

    const errorSoap = extraerErrorSoap(texto)

    if (errorSoap) {
        throw new Error(errorSoap)
    }

    return texto
}

const crearArchivoTemporal = (nombre, contenido) => {
    const ruta = path.join(os.tmpdir(), `arca-${process.pid}-${Date.now()}-${nombre}`)

    fs.writeFileSync(ruta, contenido)

    return ruta
}

const firmarTra = ({ cert, key, opensslPath, service }) => {
    const ahora = new Date()
    const generacion = new Date(ahora.getTime() - 10 * 60 * 1000).toISOString()
    const expiracion = new Date(ahora.getTime() + 10 * 60 * 1000).toISOString()
    const traXml = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${Math.floor(Date.now() / 1000)}</uniqueId>
    <generationTime>${generacion}</generationTime>
    <expirationTime>${expiracion}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`
    const traPath = crearArchivoTemporal("tra.xml", traXml)
    const certPath = crearArchivoTemporal("cert.pem", cert)
    const keyPath = crearArchivoTemporal("key.pem", key)
    const cmsPath = path.join(os.tmpdir(), `arca-${process.pid}-${Date.now()}-tra.cms`)

    try {
        const resultado = spawnSync(opensslPath, [
            "cms",
            "-sign",
            "-in", traPath,
            "-signer", certPath,
            "-inkey", keyPath,
            "-nodetach",
            "-outform", "DER",
            "-out", cmsPath,
        ], { encoding: "utf8" })

        if (resultado.status !== 0) {
            throw new Error(resultado.stderr || "No se pudo firmar el TRA con OpenSSL.")
        }

        return fs.readFileSync(cmsPath).toString("base64")
    } finally {
        ;[traPath, certPath, keyPath, cmsPath].forEach((archivo) => {
            if (fs.existsSync(archivo)) fs.unlinkSync(archivo)
        })
    }
}

const obtenerTokenSign = async (config) => {
    const cms = firmarTra({
        cert: config.cert,
        key: config.key,
        opensslPath: config.opensslPath,
        service: "wsfe",
    })
    const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cms}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`
    const respuesta = await postSoap({
        action: "",
        body: envelope,
        url: WSAA[config.ambiente],
    })
    const loginTicketResponse = extraerTag(respuesta, "loginCmsReturn")

    if (!loginTicketResponse) {
        throw new Error("WSAA no devolvio loginCmsReturn.")
    }

    return {
        sign: extraerTag(loginTicketResponse, "sign"),
        token: extraerTag(loginTicketResponse, "token"),
    }
}

const crearAuthXml = ({ cuit, sign, token }) => `<Auth>
  <Token>${escaparXml(token)}</Token>
  <Sign>${escaparXml(sign)}</Sign>
  <Cuit>${cuit}</Cuit>
</Auth>`

const obtenerDocumentoComprador = (cliente = {}) => {
    const documento = soloNumeros(cliente.dni_cuit || cliente.dniCuit)

    if (documento.length === 11) return { tipo: TIPOS_DOCUMENTO.CUIT, numero: Number(documento) }
    if (documento.length >= 7 && documento.length <= 8) return { tipo: TIPOS_DOCUMENTO.DNI, numero: Number(documento) }

    return { tipo: TIPOS_DOCUMENTO.CONSUMIDOR_FINAL, numero: 0 }
}

const obtenerDatosIva = (total, alicuotaIva) => {
    if (!alicuotaIva) return { impIva: 0, impNeto: total, ivaXml: "" }

    const impNeto = redondearImporte(total / (1 + (alicuotaIva / 100)))
    const impIva = redondearImporte(total - impNeto)
    const ivaId = IVA_IDS[alicuotaIva]

    return {
        impIva,
        impNeto,
        ivaXml: ivaId ? `<Iva><AlicIva><Id>${ivaId}</Id><BaseImp>${impNeto}</BaseImp><Importe>${impIva}</Importe></AlicIva></Iva>` : "",
    }
}

const consultarUltimoComprobante = async ({ auth, config }) => {
    const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECompUltimoAutorizado>
      ${crearAuthXml({ cuit: config.cuit, ...auth })}
      <PtoVta>${config.puntoVenta}</PtoVta>
      <CbteTipo>${config.tipoComprobante}</CbteTipo>
    </ar:FECompUltimoAutorizado>
  </soapenv:Body>
</soapenv:Envelope>`
    const respuesta = await postSoap({
        action: "http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado",
        body: envelope,
        url: WSFE[config.ambiente],
    })

    return Number(extraerTag(respuesta, "CbteNro") || 0)
}

const solicitarCae = async ({ auth, comprobante, config, numeroComprobante }) => {
    const total = redondearImporte(comprobante.total)
    const documentoComprador = obtenerDocumentoComprador(comprobante.cliente)
    const iva = obtenerDatosIva(total, config.alicuotaIva)
    const fechaComprobante = obtenerFechaComprobante(comprobante.fecha)
    const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECAESolicitar>
      ${crearAuthXml({ cuit: config.cuit, ...auth })}
      <FeCAEReq>
        <FeCabReq>
          <CantReg>1</CantReg>
          <PtoVta>${config.puntoVenta}</PtoVta>
          <CbteTipo>${config.tipoComprobante}</CbteTipo>
        </FeCabReq>
        <FeDetReq>
          <FECAEDetRequest>
            <Concepto>${config.concepto}</Concepto>
            <DocTipo>${documentoComprador.tipo}</DocTipo>
            <DocNro>${documentoComprador.numero}</DocNro>
            <CbteDesde>${numeroComprobante}</CbteDesde>
            <CbteHasta>${numeroComprobante}</CbteHasta>
            <CbteFch>${fechaComprobante}</CbteFch>
            <ImpTotal>${total}</ImpTotal>
            <ImpTotConc>0</ImpTotConc>
            <ImpNeto>${iva.impNeto}</ImpNeto>
            <ImpOpEx>0</ImpOpEx>
            <ImpTrib>0</ImpTrib>
            <ImpIVA>${iva.impIva}</ImpIVA>
            <MonId>PES</MonId>
            <MonCotiz>1</MonCotiz>
            ${iva.ivaXml}
          </FECAEDetRequest>
        </FeDetReq>
      </FeCAEReq>
    </ar:FECAESolicitar>
  </soapenv:Body>
</soapenv:Envelope>`
    const respuesta = await postSoap({
        action: "http://ar.gov.afip.dif.FEV1/FECAESolicitar",
        body: envelope,
        url: WSFE[config.ambiente],
    })
    const resultado = extraerTag(respuesta, "Resultado")
    const cae = extraerTag(respuesta, "CAE")
    const vencimientoCae = extraerTag(respuesta, "CAEFchVto")
    const observacion = extraerTag(respuesta, "Msg")

    if (resultado !== "A" || !cae) {
        throw new Error(observacion || "ARCA no autorizo el comprobante.")
    }

    return {
        cae,
        vencimientoCae,
    }
}

export const validarComprobanteFactura = (comprobante) => {
    const errores = []

    if (!comprobante?.id) errores.push("Falta el ID del comprobante.")
    if (comprobante?.tipo_documento !== "factura") errores.push("El comprobante no fue generado como factura.")
    if (!comprobante?.cliente?.nombre) errores.push("Falta el nombre del cliente.")
    if (!comprobante?.cliente?.dni_cuit && !comprobante?.cliente?.dniCuit) errores.push("Falta DNI/CUIT del cliente.")
    if (!comprobante?.cliente?.direccion) errores.push("Falta la direccion del cliente.")
    if (!Array.isArray(comprobante?.items) || comprobante.items.length === 0) errores.push("La factura no tiene productos.")
    if (redondearImporte(comprobante?.total) <= 0) errores.push("El total debe ser mayor a cero.")

    return errores
}

export const emitirFacturaElectronicaArca = async (comprobante) => {
    const erroresComprobante = validarComprobanteFactura(comprobante)

    if (erroresComprobante.length > 0) {
        return {
            estado: "rechazada",
            mensaje: erroresComprobante.join(" "),
        }
    }

    if (process.env.ARCA_FACTURACION_HABILITADA !== "true") {
        return {
            estado: "pendiente_configuracion",
            mensaje: "Factura registrada en la app. Falta activar ARCA_FACTURACION_HABILITADA=true y cargar credenciales.",
        }
    }

    const config = obtenerConfig()

    if (config.errores.length > 0) {
        return {
            estado: "pendiente_configuracion",
            mensaje: config.errores.join(" "),
        }
    }

    const auth = await obtenerTokenSign(config)
    const ultimoComprobante = await consultarUltimoComprobante({ auth, config })
    const numeroComprobante = ultimoComprobante + 1
    const cae = await solicitarCae({ auth, comprobante, config, numeroComprobante })

    return {
        estado: "emitida",
        mensaje: "Factura electronica emitida correctamente.",
        cae: cae.cae,
        numero_comprobante: numeroComprobante,
        vencimiento_cae: cae.vencimientoCae,
        punto_venta: config.puntoVenta,
        tipo_comprobante: config.tipoComprobante,
        ambiente: config.ambiente,
    }
}
