"use client"

import { useState } from "react"
import { obtenerFechaActual } from "../lib/fechas"
import { SelectorProducto } from "./SelectorProducto"
import { SelectorPorNombre } from "./SelectorPorNombre"

const formularioInicial = () => ({
    fecha: obtenerFechaActual(), numero: "", variedad: "", envase: "", cantidad: "",
    pulpa_neta: "", tara: "", bruto: "", detalle: "",
})

export const CompraFrutaFrescaForm = ({ productos, productores, onGuardar, onCrearProducto }) => {
    const [datos, setDatos] = useState(formularioInicial)
    const [productoId, setProductoId] = useState("")
    const [productorId, setProductorId] = useState("")
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState("")
    const [nombreProducto, setNombreProducto] = useState("")
    const [creandoProducto, setCreandoProducto] = useState(false)
    const neto = datos.bruto !== "" && datos.tara !== "" ? Math.round((Number(datos.bruto) - Number(datos.tara)) * 1000) / 1000 : ""
    const cambiar = (campo, valor) => setDatos(actual => ({ ...actual, [campo]: valor }))

    const crearProducto = async () => {
        if (!nombreProducto.trim() || guardando) return
        setGuardando(true)
        setError("")
        try {
            setProductoId(await onCrearProducto(nombreProducto))
            setCreandoProducto(false)
            setNombreProducto("")
        } catch (error) { setError(error.message || "No se pudo crear el producto.") }
        finally { setGuardando(false) }
    }

    const guardar = async (event) => {
        event.preventDefault()
        if (guardando) return
        if (!productoId || !productorId) {
            setError("Seleccioná un productor y un producto.")
            return
        }
        if (neto === "" || neto <= 0 || Number(datos.cantidad) <= 0) {
            setError("La cantidad debe ser mayor que cero y el peso bruto debe superar la tara.")
            return
        }
        setGuardando(true)
        setError("")
        try {
            await onGuardar({ ...datos, neto, cantidad_kg: neto, producto_id: productoId, productor_id: productorId })
            setDatos(formularioInicial())
        } catch (error) {
            setError(error.message || "No se pudo registrar la compra.")
        } finally {
            setGuardando(false)
        }
    }

    return <form className="compraFrescaForm" onSubmit={guardar}>
        <h2>Compra de Fruta Fresca</h2>
        <fieldset disabled={guardando} className="compraFrescaCampos">
            <div className="compraDatosGrid">
                <label className="compraCampo">Fecha
                    <input type="date" required value={datos.fecha} onChange={e => cambiar("fecha", e.target.value)} />
                </label>
                <label className="compraCampo">N°
                    <input required maxLength={20} value={datos.numero} onChange={e => cambiar("numero", e.target.value)} />
                </label>
                <label className="compraCampo">N° Vale
                    <input readOnly value="Automático al guardar" />
                </label>
            </div>
            <div className="compraCampo">
                <label>Productor</label>
                <SelectorPorNombre opciones={productores} value={productorId} onChange={setProductorId} entidad="Productor" />
            </div>
            <div className="compraCampo">
                <label>Producto</label>
                <SelectorProducto productos={productos} value={productoId} onChange={setProductoId} />
                {creandoProducto ? <div className="compraCrearProducto">
                    <input aria-label="Nombre del nuevo producto" placeholder="Nombre del nuevo producto" maxLength={100} value={nombreProducto} onChange={e => setNombreProducto(e.target.value)} />
                    <button type="button" onClick={crearProducto} disabled={!nombreProducto.trim()}>Crear producto</button>
                    <button type="button" onClick={() => setCreandoProducto(false)}>Cancelar</button>
                </div> : <button type="button" className="compraCrearProductoBtn" onClick={() => setCreandoProducto(true)}>Crear nuevo producto</button>}
            </div>
            <div className="compraDatosGrid">
                {[['variedad', 'Variedad'], ['envase', 'Envase']].map(([campo, etiqueta]) => <label className="compraCampo" key={campo}>{etiqueta}
                    <input required maxLength={60} value={datos[campo]} onChange={e => cambiar(campo, e.target.value)} />
                </label>)}
                {[['cantidad', 'Cantidad'], ['pulpa_neta', 'Pulpa neta'], ['tara', 'Tara (kg)'], ['bruto', 'Bruto (kg)']].map(([campo, etiqueta]) => <label className="compraCampo" key={campo}>{etiqueta}
                    <input type="number" required min="0" step="0.001" value={datos[campo]} onChange={e => cambiar(campo, e.target.value)} />
                </label>)}
                <label className="compraCampo">Neto (kg)
                    <input readOnly value={neto} />
                    <small>Bruto menos tara. Esta cantidad ingresa al stock.</small>
                </label>
            </div>
            <label className="compraCampo">Detalle
                <textarea rows={3} maxLength={3000} value={datos.detalle} onChange={e => cambiar("detalle", e.target.value)} />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="compraRegistrarBtn" type="submit">{guardando ? "Guardando…" : "Registrar compra y generar vale"}</button>
        </fieldset>
    </form>
}
