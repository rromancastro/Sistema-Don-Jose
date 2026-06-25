"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AiOutlinePlus } from "react-icons/ai"
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa"
import { actualizarDocumento, crearDocumento, obtenerDocumentos } from "../lib/firebase"
import { NavComponent } from "./NavComponent"

const CATEGORIA_COMPRA = "Fruta Fresca"

const obtenerNombreProducto = (producto) => producto.nombre || producto.producto || "Producto sin nombre"
const obtenerStockProducto = (producto) => Number(producto.stock ?? producto.stock_kg ?? producto.cantidad_kg ?? 0)
const obtenerTipoStock = (producto) => producto.tipo_stock || "kg"
const formatearPrecio = (valor) => `$${Number(valor || 0).toFixed(2)}`
const formatearTipoStock = (tipoStock, cantidad = 1) => {
    if (tipoStock === "unidad") return cantidad === 1 ? "unidad" : "unidades"

    return "kg"
}
const obtenerFechaActual = () => {
    const ahora = new Date()
    const anio = ahora.getFullYear()
    const mes = String(ahora.getMonth() + 1).padStart(2, "0")
    const dia = String(ahora.getDate()).padStart(2, "0")

    return `${anio}-${mes}-${dia}`
}

export const CompraComponent = () => {
    const [productos, setProductos] = useState([])
    const [proveedores, setProveedores] = useState([])
    const [productoId, setProductoId] = useState("")
    const [proveedorId, setProveedorId] = useState("")
    const [cantidadKg, setCantidadKg] = useState("")
    const [costoKg, setCostoKg] = useState("")
    const [creandoProducto, setCreandoProducto] = useState(false)
    const [nombreNuevoProducto, setNombreNuevoProducto] = useState("")

    useEffect(() => {
        const cargarDatos = async () => {
            const [productosData, proveedoresData] = await Promise.all([
                obtenerDocumentos("productos"),
                obtenerDocumentos("proveedores"),
            ])

            const productosFrutaFresca = productosData.filter((producto) => producto.categoria === CATEGORIA_COMPRA)

            setProductos(productosFrutaFresca)
            setProveedores(proveedoresData)
            setProductoId(productosFrutaFresca[0]?.id || "")
            setProveedorId(proveedoresData[0]?.id || "")
        }

        cargarDatos()
    }, [])

    const productoSeleccionado = useMemo(() => {
        return productos.find((producto) => producto.id === productoId)
    }, [productos, productoId])

    const proveedorSeleccionado = useMemo(() => {
        return proveedores.find((proveedor) => proveedor.id === proveedorId)
    }, [proveedores, proveedorId])

    const tipoStockProducto = productoSeleccionado ? obtenerTipoStock(productoSeleccionado) : "kg"
    const unidadStockProducto = formatearTipoStock(tipoStockProducto)
    const cantidadNumerica = Number(cantidadKg || 0)
    const costoNumerico = Number(costoKg || 0)
    const totalCompra = cantidadNumerica * costoNumerico
    const puedeRegistrar = Boolean(productoSeleccionado && proveedorSeleccionado && cantidadNumerica > 0 && costoNumerico > 0)

    const cambiarNumero = (valor, setter) => {
        if (valor === "") {
            setter("")
            return
        }

        const nuevoValor = Number(valor)

        if (Number.isNaN(nuevoValor)) return

        const valorNormalizado = setter === setCantidadKg && tipoStockProducto === "unidad" ? Math.floor(nuevoValor) : nuevoValor

        setter(String(Math.max(valorNormalizado, 0)))
    }

    const abrirCrearProducto = () => {
        setCreandoProducto(true)
        setNombreNuevoProducto("")
    }

    const cancelarCrearProducto = () => {
        setCreandoProducto(false)
        setNombreNuevoProducto("")
    }

    const guardarNuevoProducto = async () => {
        const nombreProducto = nombreNuevoProducto.trim()

        if (!nombreProducto) return

        const productoParaCrear = {
            alerta_stock: 10,
            categoria: CATEGORIA_COMPRA,
            costo: 0,
            disponible: true,
            nombre: nombreProducto,
            precio_mayorista: 0,
            precio_minorista: 0,
            stock: 0,
            tipo_stock: "kg",
        }

        const id = await crearDocumento("productos", productoParaCrear)

        setProductos((productosActuales) => [
            {
                id,
                ...productoParaCrear,
            },
            ...productosActuales,
        ])
        setProductoId(id)
        cancelarCrearProducto()
    }

    const registrarCompra = async () => {
        if (!puedeRegistrar) return

        const compraParaCrear = {
            cantidad_kg: cantidadNumerica,
            costo_kg: costoNumerico,
            fecha: obtenerFechaActual(),
            producto: obtenerNombreProducto(productoSeleccionado),
            proveedor_id: proveedorSeleccionado.id,
            tipo_stock: tipoStockProducto,
            total_compra: totalCompra,
        }

        await crearDocumento("compras", compraParaCrear)

        const stockActualizado = obtenerStockProducto(productoSeleccionado) + cantidadNumerica

        await actualizarDocumento("productos", productoSeleccionado.id, {
            categoria: CATEGORIA_COMPRA,
            costo: costoNumerico,
            disponible: true,
            stock: stockActualizado,
            tipo_stock: tipoStockProducto,
        })

        await actualizarDocumento("proveedores", proveedorSeleccionado.id, {
            compras: Number(proveedorSeleccionado.compras || 0) + 1,
        })

        setProductos((productosActuales) => productosActuales.map((producto) => {
            if (producto.id !== productoSeleccionado.id) return producto

            return {
                ...producto,
                categoria: CATEGORIA_COMPRA,
                costo: costoNumerico,
                disponible: true,
                stock: stockActualizado,
                tipo_stock: tipoStockProducto,
            }
        }))

        setProveedores((proveedoresActuales) => proveedoresActuales.map((proveedor) => {
            if (proveedor.id !== proveedorSeleccionado.id) return proveedor

            return {
                ...proveedor,
                compras: Number(proveedor.compras || 0) + 1,
            }
        }))

        setCantidadKg("")
        setCostoKg("")
    }

    return <section>
        <NavComponent bgColor="#F54900" >
            <Link href={'/'}>
                <FaArrowLeft />
            </Link>
            <h1>Nueva Compra</h1>
        </NavComponent>

        <div id="compraContainer">
            <div className="compraCampo">
                <label>Producto ({CATEGORIA_COMPRA})</label>
                {
                    creandoProducto ? (
                        <article className="compraCrearProducto">
                            <div>
                                <p>Nuevo Producto</p>
                                <button type="button" onClick={cancelarCrearProducto} aria-label="Cancelar producto">
                                    <FaTimes />
                                </button>
                            </div>
                            <form onSubmit={(e) => {
                                e.preventDefault()
                                guardarNuevoProducto()
                            }}>
                                <input
                                    type="text"
                                    value={nombreNuevoProducto}
                                    onChange={(e) => setNombreNuevoProducto(e.target.value)}
                                    placeholder="Nombre del producto (ej: Peras Frescas)"
                                    aria-label="Nombre del producto"
                                />
                                <button type="submit">
                                    <FaCheck />
                                    Crear Producto
                                </button>
                            </form>
                        </article>
                    ) : (
                        <>
                            <select value={productoId} onChange={(e) => {
                                setProductoId(e.target.value)
                                setCantidadKg("")
                            }}>
                                {
                                    productos.length === 0 ? (
                                        <option value="">Sin productos</option>
                                    ) : (
                                        productos.map((producto) => (
                                            <option key={producto.id} value={producto.id}>{obtenerNombreProducto(producto)}</option>
                                        ))
                                    )
                                }
                            </select>
                            <button type="button" className="compraCrearProductoBtn  bdRadius" onClick={abrirCrearProducto}>
                                <AiOutlinePlus />
                                Crear Nuevo Producto
                            </button>
                        </>
                    )
                }
            </div>

            <div className="compraCampo">
                <label>Cantidad ({unidadStockProducto})</label>
                <input
                    type="number"
                    min="0"
                    step={tipoStockProducto === "unidad" ? "1" : "0.01"}
                    value={cantidadKg}
                    onChange={(e) => cambiarNumero(e.target.value, setCantidadKg)}
                    placeholder="0"
                />
            </div>

            <div className="compraCampo">
                <label>Proveedor</label>
                <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
                    {
                        proveedores.length === 0 ? (
                            <option value="">Sin proveedores</option>
                        ) : (
                            proveedores.map((proveedor) => (
                                <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}</option>
                            ))
                        )
                    }
                </select>
            </div>

            <div className="compraCampo">
                <label>Costo por {unidadStockProducto} ($)</label>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costoKg}
                    onChange={(e) => cambiarNumero(e.target.value, setCostoKg)}
                    placeholder="0.00"
                />
            </div>

            <div className="compraTotal">
                <p>Total de la Compra</p>
                <span>{formatearPrecio(totalCompra)}</span>
            </div>

            <button type="button" className="compraRegistrarBtn" onClick={registrarCompra} disabled={!puedeRegistrar}>
                <FaCheck />
                Registrar Compra
            </button>
        </div>
    </section>
}
