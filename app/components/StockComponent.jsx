"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AiOutlinePlus } from "react-icons/ai"
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa"
import { FiBox, FiEye } from "react-icons/fi"
import { GoPencil, GoTrash } from "react-icons/go"
import { actualizarDocumento, crearDocumento, eliminarDocumento, obtenerDocumentos } from "../lib/firebase"
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
const obtenerCostoProducto = (producto) => Number(producto.costo ?? producto.costo_kg ?? producto.precio_costo ?? 0)
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
    const [productoEditandoId, setProductoEditandoId] = useState(null)
    const [productoConfirmandoId, setProductoConfirmandoId] = useState(null)
    const [nuevoProducto, setNuevoProducto] = useState(productoVacio)
    const [productoEditado, setProductoEditado] = useState(productoVacio)

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

    const categoriasDeshidratadasDisponibles = useMemo(() => {
        return Array.from(new Set([
            ...CATEGORIAS_DESHIDRATADOS,
            ...productos
                .map((producto) => producto.categoria)
                .filter((categoria) => categoria && !CATEGORIAS_FRUTA_FRESCA.includes(categoria)),
        ]))
    }, [productos])

    const productosDeshidratadosPorCategoria = useMemo(() => {
        return categoriasDeshidratadasDisponibles.reduce((categorias, categoria) => {
            const productosCategoria = productos.filter((producto) => producto.categoria === categoria)

            if (productosCategoria.length > 0) {
                categorias.push({
                    categoria,
                    productos: productosCategoria,
                })
            }

            return categorias
        }, [])
    }, [productos, categoriasDeshidratadasDisponibles])

    const todasLasCategorias = useMemo(() => {
        return Array.from(new Set([
            ...CATEGORIAS_FRUTA_FRESCA,
            ...categoriasDeshidratadasDisponibles,
            productoEditado.categoria,
        ].filter(Boolean)))
    }, [categoriasDeshidratadasDisponibles, productoEditado.categoria])

    const abrirCrearProducto = () => {
        if (tabActiva !== TABS.DESHIDRATADOS) return

        setCreandoProducto(true)
        setProductoEditandoId(null)
        setProductoConfirmandoId(null)
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

    const cambiarCampoProductoEditado = (campo, valor) => {
        setProductoEditado((productoActual) => ({
            ...productoActual,
            [campo]: valor,
        }))
    }

    const cambiarNumeroProductoEditado = (campo, valor) => {
        if (valor === "") {
            cambiarCampoProductoEditado(campo, "")
            return
        }

        const valorNumerico = Number(valor)

        if (Number.isNaN(valorNumerico)) return

        cambiarCampoProductoEditado(campo, String(Math.max(valorNumerico, 0)))
    }

    const normalizarProductoFormulario = (productoFormulario) => {
        const nombre = productoFormulario.nombre.trim()
        const categoria = productoFormulario.categoria.trim()

        if (!nombre || !categoria) return null

        return {
            alerta_stock: Number(productoFormulario.alerta_stock || 0),
            categoria,
            costo: Number(productoFormulario.costo || 0),
            disponible: productoFormulario.disponible,
            nombre,
            precio_mayorista: Number(productoFormulario.precio_mayorista || 0),
            precio_minorista: Number(productoFormulario.precio_minorista || 0),
            stock: Number(productoFormulario.stock || 0),
            tipo_stock: productoFormulario.tipo_stock,
        }
    }

    const guardarProducto = async () => {
        const nombre = nuevoProducto.nombre.trim()
        const categoria = creandoCategoria ? nuevoProducto.nuevaCategoria.trim() : nuevoProducto.categoria
        const productoParaCrear = normalizarProductoFormulario({
            ...nuevoProducto,
            nombre,
            categoria,
        })

        if (!productoParaCrear) return

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

    const editarProducto = (producto) => {
        setCreandoProducto(false)
        setCreandoCategoria(false)
        setProductoEditandoId(producto.id)
        setProductoConfirmandoId(null)
        setProductoEditado({
            nombre: obtenerNombreProducto(producto),
            categoria: producto.categoria || "",
            nuevaCategoria: "",
            stock: String(obtenerStockProducto(producto)),
            tipo_stock: obtenerTipoStock(producto),
            costo: String(obtenerCostoProducto(producto)),
            precio_mayorista: String(Number(producto.precio_mayorista || 0)),
            precio_minorista: String(Number(producto.precio_minorista || 0)),
            alerta_stock: String(Number(producto.alerta_stock || 0)),
            disponible: producto.disponible !== false,
        })
    }

    const cancelarEdicionProducto = () => {
        setProductoEditandoId(null)
        setProductoEditado(productoVacio)
    }

    const guardarProductoEditado = async (productoId) => {
        const productoActualizado = normalizarProductoFormulario(productoEditado)

        if (!productoActualizado) return

        await actualizarDocumento("productos", productoId, productoActualizado)

        setProductos((productosActuales) => productosActuales.map((producto) => {
            if (producto.id !== productoId) return producto

            return {
                ...producto,
                ...productoActualizado,
            }
        }))
        cancelarEdicionProducto()
    }

    const confirmarBorradoProducto = (productoId) => {
        setProductoConfirmandoId(productoId)

        if (productoEditandoId === productoId) {
            cancelarEdicionProducto()
        }
    }

    const borrarProducto = async (producto) => {
        await eliminarDocumento("productos", producto.id)
        setProductos((productosActuales) => productosActuales.filter((productoActual) => productoActual.id !== producto.id))
        setProductoConfirmandoId(null)
    }

    const renderFormularioProducto = ({
        productoFormulario,
        cambiarCampo,
        cambiarNumero,
        onSubmit,
        onCancel,
        mostrarCategoriaNueva = false,
    }) => (
        <form className="stockEditForm" onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
        }}>
            <input
                type="text"
                value={productoFormulario.nombre}
                onChange={(e) => cambiarCampo("nombre", e.target.value)}
                placeholder="Nombre del producto"
                aria-label="Nombre del producto"
            />

            <label>Categoria</label>
            {
                mostrarCategoriaNueva && creandoCategoria ? (
                    <div className="stockNuevaCategoria">
                        <input
                            type="text"
                            value={productoFormulario.nuevaCategoria}
                            onChange={(e) => cambiarCampo("nuevaCategoria", e.target.value)}
                            placeholder="Nombre de la nueva categoria"
                            aria-label="Nueva categoria"
                        />
                        <button type="button" onClick={() => setCreandoCategoria(false)} aria-label="Cancelar nueva categoria">
                            <FaTimes />
                        </button>
                    </div>
                ) : (
                    <>
                        <select
                            value={productoFormulario.categoria}
                            onChange={(e) => cambiarCampo("categoria", e.target.value)}
                            aria-label="Categoria"
                        >
                            {
                                (mostrarCategoriaNueva ? categoriasDeshidratadasDisponibles : todasLasCategorias).map((categoria) => (
                                    <option key={categoria} value={categoria}>{categoria}</option>
                                ))
                            }
                        </select>
                        {
                            mostrarCategoriaNueva && (
                                <button type="button" className="stockCrearCategoriaBtn" onClick={() => setCreandoCategoria(true)}>
                                    + Crear Nueva Categoria
                                </button>
                            )
                        }
                    </>
                )
            }

            <label>Stock</label>
            <input
                type="number"
                min="0"
                step="0.01"
                value={productoFormulario.stock}
                onChange={(e) => cambiarNumero("stock", e.target.value)}
                placeholder="0"
            />

            <select
                value={productoFormulario.tipo_stock}
                onChange={(e) => cambiarCampo("tipo_stock", e.target.value)}
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
                        value={productoFormulario.precio_mayorista}
                        onChange={(e) => cambiarNumero("precio_mayorista", e.target.value)}
                        placeholder="0.00"
                    />
                </div>
                <div>
                    <label>Precio Minorista</label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={productoFormulario.precio_minorista}
                        onChange={(e) => cambiarNumero("precio_minorista", e.target.value)}
                        placeholder="0.00"
                    />
                </div>
            </div>

            <label>Costo</label>
            <input
                type="number"
                min="0"
                step="0.01"
                value={productoFormulario.costo}
                onChange={(e) => cambiarNumero("costo", e.target.value)}
                placeholder="0.00"
            />

            <label>Alerta de stock bajo</label>
            <input
                type="number"
                min="0"
                step="0.01"
                value={productoFormulario.alerta_stock}
                onChange={(e) => cambiarNumero("alerta_stock", e.target.value)}
                placeholder="0"
            />

            <label className="stockDisponibleCheck">
                <input
                    type="checkbox"
                    checked={productoFormulario.disponible}
                    onChange={(e) => cambiarCampo("disponible", e.target.checked)}
                />
                Disponible para venta
            </label>

            <div className="stockCrearProductoActions">
                <button type="submit">
                    <FaCheck />
                    Guardar
                </button>
                <button type="button" onClick={onCancel}>
                    <FaTimes />
                    Cancelar
                </button>
            </div>
        </form>
    )

    const renderAccionesProducto = (producto) => (
        <div className="stockActions">
            <button type="button" onClick={() => editarProducto(producto)} aria-label={`Editar ${obtenerNombreProducto(producto)}`}>
                <GoPencil />
            </button>
            <button type="button" onClick={() => confirmarBorradoProducto(producto.id)} aria-label={`Eliminar ${obtenerNombreProducto(producto)}`}>
                <GoTrash />
            </button>
        </div>
    )

    const renderConfirmacionBorrado = (producto) => (
        <div className="stockDeleteConfirm">
            <p>Esta seguro que desea eliminar {obtenerNombreProducto(producto)}?</p>
            <div className="stockDeleteActions">
                <button type="button" onClick={() => borrarProducto(producto)}>
                    <GoTrash />
                    Eliminar
                </button>
                <button type="button" onClick={() => setProductoConfirmandoId(null)}>
                    <FaTimes />
                    Cancelar
                </button>
            </div>
        </div>
    )

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
                                    {renderFormularioProducto({
                                        productoFormulario: nuevoProducto,
                                        cambiarCampo: cambiarCampoProducto,
                                        cambiarNumero: cambiarNumeroProducto,
                                        onSubmit: guardarProducto,
                                        onCancel: cancelarCrearProducto,
                                        mostrarCategoriaNueva: true,
                                    })}
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
                                                <article key={producto.id} className={`stockCard stockCardDeshidratado bdRadius ${productoEditandoId === producto.id ? "stockCardEditando" : ""} ${productoConfirmandoId === producto.id ? "stockCardConfirmando" : ""}`}>
                                                    {
                                                        productoEditandoId === producto.id ? (
                                                            renderFormularioProducto({
                                                                productoFormulario: productoEditado,
                                                                cambiarCampo: cambiarCampoProductoEditado,
                                                                cambiarNumero: cambiarNumeroProductoEditado,
                                                                onSubmit: () => guardarProductoEditado(producto.id),
                                                                onCancel: cancelarEdicionProducto,
                                                            })
                                                        ) : productoConfirmandoId === producto.id ? (
                                                            renderConfirmacionBorrado(producto)
                                                        ) : (
                                                            <>
                                                                <div className="stockCardHeader">
                                                                    <div>
                                                                        <p>
                                                                            {obtenerNombreProducto(producto)}
                                                                            {producto.disponible && <FiEye />}
                                                                        </p>
                                                                        <span>Stock: {obtenerStockProducto(producto)} {obtenerTipoStock(producto)}</span>
                                                                    </div>
                                                                    {renderAccionesProducto(producto)}
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
                                                                    <div>
                                                                        <p>Costo</p>
                                                                        <span>{formatearPrecio(obtenerCostoProducto(producto))}/{obtenerTipoStock(producto)}</span>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )
                                                    }
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
                                    <article key={producto.id} className={`stockCard stockCardFresco bdRadius ${productoEditandoId === producto.id ? "stockCardEditando" : ""} ${productoConfirmandoId === producto.id ? "stockCardConfirmando" : ""}`}>
                                        {
                                            productoEditandoId === producto.id ? (
                                                renderFormularioProducto({
                                                    productoFormulario: productoEditado,
                                                    cambiarCampo: cambiarCampoProductoEditado,
                                                    cambiarNumero: cambiarNumeroProductoEditado,
                                                    onSubmit: () => guardarProductoEditado(producto.id),
                                                    onCancel: cancelarEdicionProducto,
                                                })
                                            ) : productoConfirmandoId === producto.id ? (
                                                renderConfirmacionBorrado(producto)
                                            ) : (
                                                <>
                                                    <div>
                                                        <p>{obtenerNombreProducto(producto)}</p>
                                                        <span>Stock: {obtenerStockProducto(producto)} {obtenerTipoStock(producto)}</span>
                                                        <span>Costo: {formatearPrecio(obtenerCostoProducto(producto))}/{obtenerTipoStock(producto)}</span>
                                                    </div>
                                                    {renderAccionesProducto(producto)}
                                                </>
                                            )
                                        }
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
