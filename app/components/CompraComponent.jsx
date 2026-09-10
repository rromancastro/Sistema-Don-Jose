"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { FaArrowLeft } from "react-icons/fa"
import { NavComponent } from "./NavComponent"
import { CompraFrutaFrescaForm } from "./CompraFrutaFrescaForm"
import { crearDocumento, obtenerDocumentos } from "../lib/firebase"
import { registrarCompraFrutaFresca } from "../lib/compras"
import { normalizarLista, normalizarProducto, normalizarProveedor } from "../lib/normalizadores"

export const CompraComponent = () => {
    const [seccion, setSeccion] = useState("fresca")
    const [productos, setProductos] = useState([])
    const [productores, setProductores] = useState([])
    const [vales, setVales] = useState([])
    const [error, setError] = useState("")
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        const cargar = async () => {
            try {
                const [productosData, productoresData, comprasData] = await Promise.all([
                    obtenerDocumentos("productos"), obtenerDocumentos("proveedores"), obtenerDocumentos("compras"),
                ])
                setProductos(normalizarLista(productosData, normalizarProducto).filter(p => ["Fruta Fresca", "Fruta Fresta"].includes(p.categoria) && p.tipo_stock === "kg"))
                setProductores(normalizarLista(productoresData, normalizarProveedor))
                setVales(comprasData.filter(c => c.numero_vale).sort((a, b) => b.numero_vale.localeCompare(a.numero_vale)))
            } catch {
                setError("No se pudieron cargar los datos de compras. Recargá la página para reintentar.")
            } finally { setCargando(false) }
        }
        cargar()
    }, [])

    const descargarVale = async compra => {
        try {
            const { descargarValePDF } = await import("../lib/valePdf")
            descargarValePDF(compra)
        } catch {
            setError("La compra está guardada, pero no se pudo descargar el PDF. Usá el botón Descargar vale para reintentar.")
        }
    }

    const guardarFresca = async datos => {
        const compra = await registrarCompraFrutaFresca(datos)
        setVales(actuales => [compra, ...actuales])
        setProductos(actuales => actuales.map(p => p.id === compra.producto_id ? { ...p, stock: p.stock + compra.cantidad_kg, ...(Object.hasOwn(p, "stock_kg") ? { stock_kg: p.stock + compra.cantidad_kg } : {}) } : p))
        setError("")
        await descargarVale(compra)
    }

    const crearProducto = async nombre => {
        const producto = { nombre: nombre.trim(), categoria: "Fruta Fresca", tipo_producto: "fruta_fresca", stock: 0, tipo_stock: "kg", costo: 0, precio_mayorista: 0, precio_minorista: 0, alerta_stock: 10, disponible: true }
        const id = await crearDocumento("productos", producto)
        setProductos(actuales => [{ ...producto, id, id_producto: Number(id) }, ...actuales])
        return id
    }

    return <section>
        <NavComponent bgColor="#F54900"><Link href="/"><FaArrowLeft /></Link><h1>Nueva Compra</h1></NavComponent>
        <div id="compraContainer">
            <div className="compraTabs" role="tablist" aria-label="Tipo de compra">
                <button id="tab-fresca" type="button" role="tab" aria-selected={seccion === "fresca"} aria-controls="panel-fresca" onClick={() => setSeccion("fresca")}>Fruta Fresca</button>
                <button id="tab-deshidratados" type="button" role="tab" aria-selected={seccion === "deshidratados"} aria-controls="panel-deshidratados" onClick={() => setSeccion("deshidratados")}>Deshidratados</button>
            </div>
            {error && <p role="alert">{error}</p>}
            <div id="panel-fresca" role="tabpanel" aria-labelledby="tab-fresca" hidden={seccion !== "fresca"}>
                {cargando ? <p>Cargando productos y productores...</p> : <CompraFrutaFrescaForm productos={productos} productores={productores} onGuardar={guardarFresca} onCrearProducto={crearProducto} />}
                <h2>Vales registrados</h2>
                {vales.length === 0 && <p>No hay vales registrados.</p>}
                {vales.map(vale => <article className="compraValeGuardado" key={vale.id}>
                    <span>Vale {vale.numero_vale} · {vale.fecha} · {vale.productor?.nombre} · {vale.producto}</span>
                    <button type="button" onClick={() => descargarVale(vale)}>Descargar vale</button>
                </article>)}
            </div>
            <div id="panel-deshidratados" role="tabpanel" aria-labelledby="tab-deshidratados" hidden={seccion !== "deshidratados"}>
                <div className="compraSeccionPendiente"><h2>Compras de Deshidratados</h2><p>Sección preparada. El formulario de compra se completará próximamente.</p></div>
            </div>
        </div>
    </section>
}
