"use client"

import { useId, useRef, useState } from "react"
import { crearDocumento } from "../lib/firebase"
import { normalizarProducto, obtenerNombreProducto, TIPOS_PRODUCTO } from "../lib/normalizadores"
import { ATRIBUTOS_PRODUCTO, esEmpaque, normalizarAtributos } from "../lib/productosStock"
import { PesoUnidad } from "./PesoUnidad"

export const CrearProductoTransformacion = ({ tipo, origen, onCreado }) => {
    const [abierto, setAbierto] = useState(false)
    const [nombre, setNombre] = useState("")
    const [atributos, setAtributos] = useState({})
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState("")
    const bloqueo = useRef(false)
    const id = useId()
    const empaque = esEmpaque(tipo)

    const guardar = async (event) => {
        event.preventDefault()
        if (bloqueo.current || !nombre.trim() || (empaque && !origen)) return
        const normalizados = normalizarAtributos(tipo, atributos)
        for (const { campo, numero, requerido, max } of ATRIBUTOS_PRODUCTO[tipo]) {
            const valor = normalizados[campo]
            if (numero && ((requerido && !(valor > 0)) || (valor !== "" && (!Number.isFinite(valor) || valor < 0 || (max != null && valor > max))))) {
                setError("Revisá los pesos y porcentajes del producto.")
                return
            }
        }
        bloqueo.current = true
        setGuardando(true)
        setError("")
        try {
            const producto = {
                nombre: nombre.trim(), tipo_producto: tipo,
                categoria: tipo === "deshidratado" ? "Frutas Secas" : TIPOS_PRODUCTO[tipo],
                tipo_stock: empaque ? "unidad" : "kg", stock: 0,
                producto_contenido_id: empaque ? origen.id : "", atributos: normalizados,
                costo: 0, precio_mayorista: 0, precio_minorista: 0, alerta_stock: 0, disponible: true,
            }
            const productoId = await crearDocumento("productos", producto)
            onCreado(normalizarProducto({ ...producto, id: productoId, id_producto: Number(productoId) }))
            setAbierto(false)
            setNombre("")
            setAtributos({})
        } catch (e) {
            setError(e.message || "No se pudo crear el producto. Intentá nuevamente.")
        } finally {
            bloqueo.current = false
            setGuardando(false)
        }
    }

    return <div className="crearProductoTransformacion">
        <button type="button" disabled={empaque && !origen} aria-expanded={abierto} aria-controls={id}
            onClick={() => { setAbierto(!abierto); setError("") }}>+ Crear producto</button>
        {empaque && !origen && <p>Seleccioná el producto de origen para crear su destino.</p>}
        {abierto && <form id={id} onSubmit={guardar}>
            <fieldset disabled={guardando}>
                <strong>Crear producto: {TIPOS_PRODUCTO[tipo]}</strong>
                {empaque && <p>Origen: {obtenerNombreProducto(origen)}</p>}
                <label htmlFor={`${id}-nombre`}>Nombre del producto</label>
                <input id={`${id}-nombre`} required value={nombre} onChange={e => setNombre(e.target.value)} />
                {empaque && <PesoUnidad value={atributos.peso_neto_kg ?? ""} onChange={valor => setAtributos({ ...atributos, peso_neto_kg: valor })} />}
                {ATRIBUTOS_PRODUCTO[tipo].filter(({ campo }) => campo !== "peso_neto_kg").map(({ campo, etiqueta, numero, max, requerido }) => <div key={campo}>
                    <label htmlFor={`${id}-${campo}`}>{etiqueta}</label>
                    <input id={`${id}-${campo}`} type={numero ? "number" : "text"} required={requerido}
                        min={numero ? (requerido ? "0.000001" : "0") : undefined} max={max} step={numero ? "any" : undefined}
                        value={atributos[campo] ?? ""} onChange={e => setAtributos({ ...atributos, [campo]: e.target.value })} />
                </div>)}
                <p>Se creará con stock en cero. Podés completar precios y categoría en Stock.</p>
                <div className="crearProductoAcciones">
                    <button type="submit" disabled={!nombre.trim()}>{guardando ? "Guardando…" : "Crear y seleccionar"}</button>
                    <button type="button" onClick={() => { setAbierto(false); setError("") }}>Cancelar</button>
                </div>
            </fieldset>
            {error && <p role="alert">{error}</p>}
        </form>}
    </div>
}
