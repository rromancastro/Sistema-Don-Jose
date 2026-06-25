"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AiOutlinePlus } from "react-icons/ai"
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa"
import { FiBox, FiEye } from "react-icons/fi"
import { GoPencil, GoTrash } from "react-icons/go"
import { crearDocumento, obtenerDocumentos } from "../lib/firebase"
import { NavComponent } from "./NavComponent"

const TABS = {
    DESHIDRATADOS: "deshidratados",
    FRESCA: "fresca",
}

const CATEGORIAS_FRUTA_FRESCA = ["Fruta Fresca", "Fruta Fresta"]
const CATEGORIAS_DESHIDRATADOS = ["Frutas Secas", "Frutas Frescas", "Mix"]

const obtenerNombreProducto = (producto) => producto.nombre || producto.producto || "Producto sin nombre"
const obtenerStockProducto = (producto) => Number(producto.stock ?? producto.stock_kg ?? producto.cantidad_kg ?? 0)
const obtenerTipoStock = (producto) => producto.tipo_stock || "kg"
const formatearPrecio = (valor) => `$${Number(valor || 0).toFixed(2)}`

const productoVacio = {
    nombre: "",
    categoria: CATEGORIAS_DESHIDRATADOS[0],
    nuevaCategoria: "",
    stock: "",
    tipo_stock: "kg",
    costo: "",
    precio_mayorista: "",
    precio_minorista: "",
    alerta_stock: "",
    disponible: true,
}

export const StockComponent = () => {
    const [productos, setProductos] = useState([])
    const [tabActiva, setTabActiva] = useState(TABS.DESHIDRATADOS)
    const [creandoProducto, setCreandoProducto] = useState(false)
    const [creandoCategoria, setCreandoCategoria] = useState(false)
    const [nuevoProducto, setNuevoProducto] = useState(productoVacio)

    useEffect(() => {
        const cargarProductos = async () => {
            const data = await obtenerDocumentos("productos")
            setProductos(data)
        }

        cargarProductos()
    }, [])

    const productosFrutaFresca = useMemo(() => {
        return productos.filter((producto) => CATEGORIAS_FRUTA_FRESCA.includes(producto.categoria))
    }, [productos])

    const productosDeshidratadosPorCategoria = useMemo(() => {
        const categoriasDeshidratadas = Array.from(new Set([
            ...CATEGORIAS_DESHIDRATADOS,
            ...productos
                .map((producto) => producto.categoria)
                .filter((categoria) => categoria && !CATEGORIAS_FRUTA_FRESCA.includes(categoria)),
        ]))

        return categoriasDeshidratadas.reduce((categorias, categoria) => {
            const productosCategoria = productos.filter((producto) => producto.categoria === categoria)

            if (productosCategoria.length > 0) {
                categorias.push({
                    categoria,
                    productos: productosCategoria,
                })
            }

            return categorias
        }, [])
    }, [productos])

    const categoriasDeshidratadasDisponibles = useMemo(() => {
        return Array.from(new Set([
            ...CATEGORIAS_DESHIDRATADOS,
            ...productos
                .map((producto) => producto.categoria)
                .filter((categoria) => categoria && !CATEGORIAS_FRUTA_FRESCA.includes(categoria)),
        ]))
    }, [productos])

    const abrirCrearProducto = () => {
        if (tabActiva !== TABS.DESHIDRATADOS) return

        setCreandoProducto(true)
    }

    const cancelarCrearProducto = () => {
        setCreandoProducto(false)
        setCreandoCategoria(false)
        setNuevoProducto(productoVacio)
    }

    const cambiarCampoProducto = (campo, valor) => {
        setNuevoProducto((productoActual) => ({
            ...productoActual,
            [campo]: valor,
        }))
    }

    const cambiarNumeroProducto = (campo, valor) => {
        if (valor === "") {
            cambiarCampoProducto(campo, "")
            return
        }

        const valorNumerico = Number(valor)

        if (Number.isNaN(valorNumerico)) return

        cambiarCampoProducto(campo, String(Math.max(valorNumerico, 0)))
    }

    const guardarProducto = async () => {
        const nombre = nuevoProducto.nombre.trim()
        const categoria = creandoCategoria ? nuevoProducto.nuevaCategoria.trim() : nuevoProducto.categoria

        if (!nombre || !categoria) return

        const productoParaCrear = {
            alerta_stock: Number(nuevoProducto.alerta_stock || 0),
            categoria,
            costo: Number(nuevoProducto.costo || 0),
            disponible: nuevoProducto.disponible,
            nombre,
            precio_mayorista: Number(nuevoProducto.precio_mayorista || 0),
            precio_minorista: Number(nuevoProducto.precio_minorista || 0),
            stock: Number(nuevoProducto.stock || 0),
            tipo_stock: nuevoProducto.tipo_stock,
        }

        const id = await crearDocumento("productos", productoParaCrear)

        setProductos((productosActuales) => [
            {
                id,
                ...productoParaCrear,
            },
            ...productosActuales,
        ])
        cancelarCrearProducto()
    }

    return <section>
        <NavComponent bgColor="#9810FA" >
            <Link href={'/'}>
                <FaArrowLeft />
            </Link>
            <h1>Stock</h1>
            <AiOutlinePlus color="#9810FA" onClick={abrirCrearProducto} />
        </NavComponent>

        <div id="stockContainer">
            <div className="stockTabs">
                <button
                    type="button"
                    className={tabActiva === TABS.DESHIDRATADOS ? "stockTabActiva stockTabVioleta" : ""}
                    onClick={() => setTabActiva(TABS.DESHIDRATADOS)}
                >
                    Productos Deshidratados
                </button>
                <button
                    type="button"
                    className={tabActiva === TABS.FRESCA ? "stockTabActiva stockTabAzul" : ""}
                    onClick={() => setTabActiva(TABS.FRESCA)}
                >
                    Fruta Fresca
                </button>
            </div>

            {
                tabActiva === TABS.DESHIDRATADOS ? (
                    <div className="stockLista">
                        {
                            creandoProducto && (
                                <article className="stockCrearProducto bdRadius">
                                    <h2>Agregar Producto</h2>
                                    <form onSubmit={(e) => {
                                        e.preventDefault()
                                        guardarProducto()
                                    }}>
                                        <input
                                            type="text"
                                            value={nuevoProducto.nombre}
                                            onChange={(e) => cambiarCampoProducto("nombre", e.target.value)}
                                            placeholder="Nombre del producto"
                                            aria-label="Nombre del producto"
                                        />

                                        <label>Categoría</label>
                                        {
                                            creandoCategoria ? (
                                                <div className="stockNuevaCategoria">
                                                    <input
                                                        type="text"
                                                        value={nuevoProducto.nuevaCategoria}
                                                        onChange={(e) => cambiarCampoProducto("nuevaCategoria", e.target.value)}
                                                        placeholder="Nombre de la nueva categoría"
                                                        aria-label="Nueva categoría"
                                                    />
                                                    <button type="button" onClick={() => setCreandoCategoria(false)} aria-label="Cancelar nueva categoría">
                                                        <FaTimes />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <select
                                                        value={nuevoProducto.categoria}
                                                        onChange={(e) => cambiarCampoProducto("categoria", e.target.value)}
                                                        aria-label="Categoría"
                                                    >
                                                        {
                                                            categoriasDeshidratadasDisponibles.map((categoria) => (
                                                                <option key={categoria} value={categoria}>{categoria}</option>
                                                            ))
                                                        }
                                                    </select>
                                                    <button type="button" className="stockCrearCategoriaBtn" onClick={() => setCreandoCategoria(true)}>
                                                        + Crear Nueva Categoría
                                                    </button>
                                                </>
                                            )
                                        }

                                        <label>Stock Inicial</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={nuevoProducto.stock}
                                            onChange={(e) => cambiarNumeroProducto("stock", e.target.value)}
                                            placeholder="0"
                                        />

                                        <select
                                            value={nuevoProducto.tipo_stock}
                                            onChange={(e) => cambiarCampoProducto("tipo_stock", e.target.value)}
                                            aria-label="Tipo de stock"
                                        >
                                            <option value="kg">Por Kilogramo (kg)</option>
                                            <option value="unidad">Por Unidad</option>
                                        </select>

                                        <div className="stockCrearProductoGrid">
                                            <div>
                                                <label>Precio Mayorista</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={nuevoProducto.precio_mayorista}
                                                    onChange={(e) => cambiarNumeroProducto("precio_mayorista", e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div>
                                                <label>Precio Minorista</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={nuevoProducto.precio_minorista}
                                                    onChange={(e) => cambiarNumeroProducto("precio_minorista", e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>

                                        <label>Costo</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={nuevoProducto.costo}
                                            onChange={(e) => cambiarNumeroProducto("costo", e.target.value)}
                                            placeholder="0.00"
                                        />

                                        <label>Alerta de stock bajo</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={nuevoProducto.alerta_stock}
                                            onChange={(e) => cambiarNumeroProducto("alerta_stock", e.target.value)}
                                            placeholder="0"
                                        />

                                        <label className="stockDisponibleCheck">
                                            <input
                                                type="checkbox"
                                                checked={nuevoProducto.disponible}
                                                onChange={(e) => cambiarCampoProducto("disponible", e.target.checked)}
                                            />
                                            Disponible para venta
                                        </label>

                                        <div className="stockCrearProductoActions">
                                            <button type="submit">
                                                <FaCheck />
                                                Guardar
                                            </button>
                                            <button type="button" onClick={cancelarCrearProducto}>
                                                <FaTimes />
                                                Cancelar
                                            </button>
                                        </div>
                                    </form>
                                </article>
                            )
                        }
                        {
                            productosDeshidratadosPorCategoria.length === 0 ? (
                                <p className="stockVacio">No hay productos deshidratados cargados</p>
                            ) : (
                                productosDeshidratadosPorCategoria.map((grupo) => (
                                    <div key={grupo.categoria} className="stockGrupo">
                                        <h2>
                                            <FiBox />
                                            {grupo.categoria}
                                        </h2>
                                        {
                                            grupo.productos.map((producto) => (
                                                <article key={producto.id} className="stockCard stockCardDeshidratado bdRadius">
                                                    <div className="stockCardHeader">
                                                        <div>
                                                            <p>
                                                                {obtenerNombreProducto(producto)}
                                                                {producto.disponible && <FiEye />}
                                                            </p>
                                                            <span>Stock: {obtenerStockProducto(producto)} {obtenerTipoStock(producto)}</span>
                                                        </div>
                                                        <div className="stockActions">
                                                            <button type="button" aria-label={`Editar ${obtenerNombreProducto(producto)}`}>
                                                                <GoPencil />
                                                            </button>
                                                            <button type="button" aria-label={`Eliminar ${obtenerNombreProducto(producto)}`}>
                                                                <GoTrash />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="stockPrecios">
                                                        <div>
                                                            <p>Mayorista</p>
                                                            <span>{formatearPrecio(producto.precio_mayorista)}/{obtenerTipoStock(producto)}</span>
                                                        </div>
                                                        <div>
                                                            <p>Minorista</p>
                                                            <span>{formatearPrecio(producto.precio_minorista)}/{obtenerTipoStock(producto)}</span>
                                                        </div>
                                                    </div>
                                                </article>
                                            ))
                                        }
                                    </div>
                                ))
                            )
                        }
                    </div>
                ) : (
                    <div className="stockLista">
                        {
                            productosFrutaFresca.length === 0 ? (
                                <p className="stockVacio">No hay fruta fresca cargada</p>
                            ) : (
                                productosFrutaFresca.map((producto) => (
                                    <article key={producto.id} className="stockCard stockCardFresco bdRadius">
                                        <div>
                                            <p>{obtenerNombreProducto(producto)}</p>
                                            <span>Stock: {obtenerStockProducto(producto)} {obtenerTipoStock(producto)}</span>
                                        </div>
                                        <button type="button" aria-label={`Editar ${obtenerNombreProducto(producto)}`}>
                                            <GoPencil />
                                        </button>
                                    </article>
                                ))
                            )
                        }
                    </div>
                )
            }
        </div>
    </section>
}
