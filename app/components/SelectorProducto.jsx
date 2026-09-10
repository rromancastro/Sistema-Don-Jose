"use client"

import { SelectorPorNombre } from "./SelectorPorNombre"
import { obtenerNombreProducto, obtenerStockProducto, obtenerTipoStock, formatearTipoStock } from "../lib/normalizadores"

export const SelectorProducto = ({ productos, value, onChange, entidad = "Producto" }) => (
    <SelectorPorNombre
        opciones={productos.map(producto => ({
            id: producto.id,
            nombre: obtenerNombreProducto(producto),
            etiqueta: `${producto.id_producto ? `${producto.id_producto} · ` : ""}${obtenerNombreProducto(producto)} (Stock: ${obtenerStockProducto(producto)} ${formatearTipoStock(obtenerTipoStock(producto), obtenerStockProducto(producto))})`,
        }))}
        value={value}
        onChange={onChange}
        entidad={entidad}
    />
)
