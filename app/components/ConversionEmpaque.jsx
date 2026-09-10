"use client"

import { useRef, useState } from "react"
import { SelectorProducto } from "./SelectorProducto"
import { calcularConversion } from "../lib/productosStock"
import { registrarConversion } from "../lib/conversiones"
import { formatearNumero, obtenerTipoProducto } from "../lib/normalizadores"

export const ConversionEmpaque = ({ productos, onRegistrada }) => {
    const [tipo, setTipo] = useState("deshidratado")
    const [origenId, setOrigenId] = useState("")
    const [destinoId, setDestinoId] = useState("")
    const [cantidad, setCantidad] = useState("")
    const [guardando, setGuardando] = useState(false)
    const [mensaje, setMensaje] = useState("")
    const operacion = useRef(null)
    const bloqueo = useRef(false)
    const origen = productos.find((item) => item.id === origenId)
    const destinos = productos.filter((item) => obtenerTipoProducto(item) === (tipo === "deshidratado" ? "caja" : "envasado") && item.producto_contenido_id === origenId)
    const destino = destinos.find((item) => item.id === destinoId)
    let calculo, error
    try { calculo = calcularConversion(origen, destino, cantidad) } catch (e) { error = e.message }
    const reiniciar = () => { operacion.current = null; setMensaje("") }
    const guardar = async () => {
        if (!calculo || bloqueo.current) return
        bloqueo.current = true
        setGuardando(true)
        setMensaje("")
        operacion.current ||= crypto.randomUUID()
        try {
            const resultado = await registrarConversion({ origenId, destinoId, cantidad, operacionId: operacion.current })
            onRegistrada(resultado)
            setCantidad("")
            operacion.current = null
            setMensaje("Conversión completada. Stock actualizado.")
        } catch (e) { setMensaje(e.message || "No se pudo guardar la conversión. Intentá nuevamente.") }
        finally { bloqueo.current = false; setGuardando(false) }
    }
    return <section className="transformacionCard bdRadius">
        <h2>Convertir a caja o envasado</h2>
        <fieldset disabled={guardando} style={{ border: 0, padding: 0, display: "grid", gap: 16, minWidth: 0 }}>
            <div className="transformacionCampo">
                <label htmlFor="conversion-tipo">Conversión</label>
                <select id="conversion-tipo" value={tipo} onChange={(e) => { setTipo(e.target.value); setOrigenId(""); setDestinoId(""); setCantidad(""); reiniciar() }}>
                    <option value="deshidratado">Deshidratado → Caja</option>
                    <option value="caja">Caja → Envasado</option>
                </select>
            </div>
            <div className="transformacionCampo">
                <label>Producto de origen</label>
                <SelectorProducto productos={productos.filter((item) => obtenerTipoProducto(item) === tipo)} value={origenId}
                    onChange={(id) => { setOrigenId(id); setDestinoId(""); setCantidad(""); reiniciar() }} />
            </div>
            <div className="transformacionCampo">
                <label>Producto de destino</label>
                <SelectorProducto productos={destinos} value={destinoId} onChange={(id) => { setDestinoId(id); reiniciar() }} />
                {origenId && destinos.length === 0 && <p>Creá o editá el destino en Stock y seleccioná este producto como origen.</p>}
            </div>
            <div className="transformacionCampo">
                <label htmlFor="conversion-cantidad">Cantidad a utilizar ({tipo === "caja" ? "cajas completas" : "kg"})</label>
                <input id="conversion-cantidad" type="number" min="0" step={tipo === "caja" ? "1" : "any"} value={cantidad}
                    onChange={(e) => { setCantidad(e.target.value); reiniciar() }} />
            </div>
            {calculo && <p>Se descontarán {formatearNumero(calculo.cantidad_utilizada)} {tipo === "caja" ? "cajas" : "kg"} y se sumarán {calculo.cantidad_obtenida} {tipo === "caja" ? "envases" : "cajas"} ({formatearNumero(calculo.peso_total_kg)} kg netos).</p>}
            {error && origenId && destinoId && cantidad && <p role="status">{error}</p>}
            <button type="button" className="transformacionRegistrarBtn" disabled={!calculo || guardando} onClick={guardar}>
                {guardando ? "Guardando…" : "Convertir y actualizar stock"}
            </button>
        </fieldset>
        {mensaje && <p role="status">{mensaje}</p>}
    </section>
}
