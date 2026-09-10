"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AiOutlinePlus } from "react-icons/ai"
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa"
import { FiBox, FiEye } from "react-icons/fi"
import { GoPencil, GoTrash } from "react-icons/go"
import { actualizarDocumento, crearDocumento, eliminarDocumento, obtenerDocumentos } from "../lib/firebase"
import {
    formatearDineroConDecimales as formatearPrecio,
    normalizarLista,
    normalizarProducto,
    obtenerCostoProducto,
    obtenerNombreProducto,
    obtenerStockProducto,
    obtenerTipoStock,
    obtenerTipoProducto,
    TIPOS_PRODUCTO,
} from "../lib/normalizadores"
import { NavComponent } from "./NavComponent"
import { AtributosProducto } from "./AtributosProducto"
import { ATRIBUTOS_PRODUCTO, cambioStock, esEmpaque, normalizarAtributos } from "../lib/productosStock"

const TABS = {
    DESHIDRATADOS: "deshidratado",
    FRESCA: "fruta_fresca",
    CAJA: "caja",
    ENVASADO: "envasado",
}

const CATEGORIAS_FRUTA_FRESCA = ["Fruta Fresca", "Fruta Fresta"]
const CATEGORIAS_DESHIDRATADOS = ["Frutas Secas", "Frutas Frescas", "Mix"]

const productoVacio = {
    atributos: {},
    producto_contenido_id: "",
    tipo_producto: "deshidratado",
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
            setProductos(normalizarLista(data, normalizarProducto))
        }

        cargarProductos()
    }, [])

    const categoriasDisponibles = useMemo(() => {
        return Array.from(new Set([
            ...(tabActiva === TABS.DESHIDRATADOS ? CATEGORIAS_DESHIDRATADOS : [TIPOS_PRODUCTO[tabActiva]]),
            ...productos
                .filter((producto) => obtenerTipoProducto(producto) === tabActiva)
                .map((producto) => producto.categoria)
                .filter(Boolean),
        ]))
    }, [productos, tabActiva])

    const productosPorCategoria = useMemo(() => {
        return categoriasDisponibles.reduce((categorias, categoria) => {
            const productosCategoria = productos.filter((producto) => producto.categoria === categoria && obtenerTipoProducto(producto) === tabActiva)

            if (productosCategoria.length > 0) {
                categorias.push({
                    categoria,
                    productos: productosCategoria,
                })
            }

            return categorias
        }, [])
    }, [productos, categoriasDisponibles, tabActiva])

    const todasLasCategorias = useMemo(() => {
        return Array.from(new Set([
            ...CATEGORIAS_FRUTA_FRESCA,
            ...categoriasDisponibles,
            productoEditado.categoria,
        ].filter(Boolean)))
    }, [categoriasDisponibles, productoEditado.categoria])

    const abrirCrearProducto = () => {
        setNuevoProducto({ ...productoVacio, tipo_producto: tabActiva, categoria: tabActiva === TABS.DESHIDRATADOS ? CATEGORIAS_DESHIDRATADOS[0] : TIPOS_PRODUCTO[tabActiva], tipo_stock: [TABS.CAJA, TABS.ENVASADO].includes(tabActiva) ? "unidad" : "kg" })
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

        const tipo = productoFormulario.tipo_producto
        const atributos = normalizarAtributos(tipo, productoFormulario.atributos)
        const empaque = esEmpaque(tipo)
        const origen = productos.find((item) => item.id === productoFormulario.producto_contenido_id)
        if (empaque && (!origen || origen.id === productoEditandoId || obtenerTipoProducto(origen) !== (tipo === "caja" ? "deshidratado" : "caja"))) {
            alert("Seleccioná un producto de origen válido.")
            return null
        }
        for (const { campo, numero, requerido, max } of ATRIBUTOS_PRODUCTO[tipo] || []) {
            const valor = atributos[campo]
            if (numero && ((requerido && !(valor > 0)) || (valor !== "" && (!Number.isFinite(valor) || valor < 0 || (max != null && valor > max))))) {
                alert("Revisá los pesos y porcentajes del producto.")
                return null
            }
        }
        if (empaque && !Number.isSafeInteger(Number(productoFormulario.stock || 0))) {
            alert("El stock de cajas y envasados debe ser entero.")
            return null
        }

        return {
            atributos,
            producto_contenido_id: empaque ? origen.id : "",
            alerta_stock: Number(productoFormulario.alerta_stock || 0),
            categoria,
            costo: Number(productoFormulario.costo || 0),
            disponible: productoFormulario.disponible,
            nombre,
            precio_mayorista: Number(productoFormulario.precio_mayorista || 0),
            precio_minorista: Number(productoFormulario.precio_minorista || 0),
            stock: Number(productoFormulario.stock || 0),
            tipo_stock: empaque ? "unidad" : productoFormulario.tipo_stock,
            tipo_producto: productoFormulario.tipo_producto,
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

        let id
        try {
            id = await crearDocumento("productos", productoParaCrear)
        } catch (error) {
            alert(error.message || "No se pudo crear el producto. Intentá nuevamente.")
            return
        }

        setProductos((productosActuales) => [
            normalizarProducto({
                id,
                ...productoParaCrear,
                id_producto: Number(id),
            }),
            ...productosActuales,
        ])
        cancelarCrearProducto()
        setTabActiva(productoParaCrear.tipo_producto)
    }

    const editarProducto = (producto) => {
        setCreandoProducto(false)
        setCreandoCategoria(false)
        setProductoEditandoId(producto.id)
        setProductoConfirmandoId(null)
        setProductoEditado({
            id: producto.id,
            atributos: producto.atributos || {},
            producto_contenido_id: producto.producto_contenido_id || "",
            nombre: obtenerNombreProducto(producto),
            categoria: producto.categoria || "",
            nuevaCategoria: "",
            stock: String(obtenerStockProducto(producto)),
            tipo_stock: obtenerTipoStock(producto),
            tipo_producto: obtenerTipoProducto(producto),
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

        const original = productos.find((producto) => producto.id === productoId)
        Object.assign(productoActualizado, cambioStock(original, productoActualizado.stock))
        try {
            await actualizarDocumento("productos", productoId, productoActualizado)
        } catch (error) {
            alert(error.message || "No se pudo guardar el producto.")
            return
        }

        setProductos((productosActuales) => productosActuales.map((producto) => {
            if (producto.id !== productoId) return producto

            return normalizarProducto({
                ...producto,
                ...productoActualizado,
            })
        }))
        cancelarEdicionProducto()
        setTabActiva(productoActualizado.tipo_producto)
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
                                (mostrarCategoriaNueva ? categoriasDisponibles : todasLasCategorias).map((categoria) => (
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

            <label>Tipo de producto</label>
            <select value={productoFormulario.tipo_producto} onChange={e => {
                cambiarCampo("tipo_producto", e.target.value)
                cambiarCampo("producto_contenido_id", "")
                cambiarCampo("tipo_stock", esEmpaque(e.target.value) ? "unidad" : "kg")
            }} aria-label="Tipo de producto">
                {Object.entries(TIPOS_PRODUCTO).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
            </select>

            <AtributosProducto producto={productoFormulario} productos={productos} cambiarCampo={cambiarCampo} />

            <label>Stock</label>
            <input
                type="number"
                min="0"
                step={esEmpaque(productoFormulario.tipo_producto) ? "1" : "0.01"}
                value={productoFormulario.stock}
                onChange={(e) => cambiarNumero("stock", e.target.value)}
                placeholder="0"
            />

            <select
                value={esEmpaque(productoFormulario.tipo_producto) ? "unidad" : productoFormulario.tipo_stock}
                disabled={esEmpaque(productoFormulario.tipo_producto)}
                onChange={(e) => cambiarCampo("tipo_stock", e.target.value)}
                aria-label="Unidad de stock"
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
            <Link href="/nuena-transformacion">Convertir productos / Transformaciones</Link>
            <div className="stockTabs" aria-label="Categorías de stock">
                {Object.entries(TIPOS_PRODUCTO).map(([tipo, etiqueta]) => (
                    <button key={tipo} type="button" aria-pressed={tabActiva === tipo}
                        className={tabActiva === tipo ? "stockTabActiva stockTabVioleta" : ""}
                        onClick={() => { setTabActiva(tipo); cancelarCrearProducto(); cancelarEdicionProducto(); setProductoConfirmandoId(null) }}>
                        {etiqueta}
                    </button>
                ))}
            </div>
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
                            productosPorCategoria.length === 0 ? (
                                <p className="stockVacio">No hay productos de {TIPOS_PRODUCTO[tabActiva].toLowerCase()} cargados</p>
                            ) : (
                                productosPorCategoria.map((grupo) => (
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
                                                                        <span>{TIPOS_PRODUCTO[obtenerTipoProducto(producto)]} · Código: {producto.id_producto ?? "—"} · Stock: {obtenerStockProducto(producto)} {obtenerTipoStock(producto)}</span>
                                                                        {(ATRIBUTOS_PRODUCTO[obtenerTipoProducto(producto)] || []).filter(({ campo }) => producto.atributos?.[campo] !== "" && producto.atributos?.[campo] != null).map(({ campo, etiqueta }) => <span key={campo}>{etiqueta}: {producto.atributos[campo]}</span>)}
                                                                        {producto.producto_contenido_id && <span>Origen: {productos.find((item) => item.id === producto.producto_contenido_id)?.nombre || "Producto eliminado"}</span>}
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
        </div>
    </section>
}
