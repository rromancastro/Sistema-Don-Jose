export const formatearDinero = (valor, opciones = {}) => `$${Number(valor || 0).toLocaleString("es-AR", {
    minimumFractionDigits: opciones.minimumFractionDigits ?? 0,
    maximumFractionDigits: opciones.maximumFractionDigits ?? 2,
})}`

export const formatearDineroConDecimales = (valor) => formatearDinero(valor, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})

export const formatearNumero = (valor, opciones = {}) => Number(valor || 0).toLocaleString("es-AR", {
    maximumFractionDigits: opciones.maximumFractionDigits ?? 2,
    minimumFractionDigits: opciones.minimumFractionDigits ?? 0,
})

export const formatearCantidad = (valor, unidad = "") => {
    const cantidad = formatearNumero(valor)

    return unidad ? `${cantidad} ${unidad}` : cantidad
}

export const formatearTipoStock = (tipoStock, cantidad = 1) => {
    if (tipoStock === "unidad") return Number(cantidad) === 1 ? "unidad" : "unidades"

    return "kg"
}

export const formatearDocumento = (documento) => documento === "factura" ? "Factura" : "Remito"

export const formatearMetodoPago = (metodo) => metodo === "transferencia" ? "Transferencia" : "Efectivo"

export const formatearEstadoPago = (estado) => estado === "incompleto" ? "Incompleto" : "Completo"

export const normalizarTexto = (valor) => String(valor || "").trim()

export const normalizarNumero = (valor) => {
    const numero = Number(valor || 0)

    return Number.isNaN(numero) ? 0 : numero
}

export const obtenerNombreProducto = (producto) => producto.nombre || producto.producto || "Producto sin nombre"

export const obtenerStockProducto = (producto) => Number(producto.stock_kg ?? producto.stock ?? producto.cantidad_kg ?? 0)

export const obtenerTipoStock = (producto) => producto.tipo_stock || "kg"

export const TIPOS_PRODUCTO = {
    fruta_fresca: "Fruta fresca",
    deshidratado: "Deshidratado",
    caja: "Caja",
    envasado: "Envasado",
}

export const obtenerTipoProducto = (producto) => producto.tipo_producto || (
    ["Fruta Fresca", "Fruta Fresta"].includes(producto.categoria) ? "fruta_fresca" : "deshidratado"
)

export const obtenerPrecioMayorista = (producto) => Number(producto.precio_mayorista ?? producto.mayorista ?? producto.precioMayorista ?? producto.precio_kg ?? producto.precio ?? 0)

export const obtenerPrecioMinorista = (producto) => Number(producto.precio_minorista ?? producto.minorista ?? producto.precioMinorista ?? producto.precio_venta ?? producto.precio ?? 0)

export const obtenerCostoProducto = (producto) => Number(producto.costo ?? producto.costo_kg ?? producto.precio_costo ?? 0)

export const normalizarCliente = (cliente = {}) => ({
    ...cliente,
    nombre: normalizarTexto(cliente.nombre),
    telefono: normalizarTexto(cliente.telefono || cliente.contacto),
    email: normalizarTexto(cliente.email),
    dni_cuit: normalizarTexto(cliente.dni_cuit || cliente.dniCuit),
    direccion: normalizarTexto(cliente.direccion),
    ventas: normalizarNumero(cliente.ventas),
    facturacion: normalizarNumero(cliente.facturacion),
    ganancia: normalizarNumero(cliente.ganancia),
    deuda: normalizarNumero(cliente.deuda),
})

export const normalizarProveedor = (proveedor = {}) => ({
    ...proveedor,
    nombre: normalizarTexto(proveedor.nombre),
    telefono: normalizarTexto(proveedor.telefono || proveedor.contacto),
    email: normalizarTexto(proveedor.email),
    compras: normalizarNumero(proveedor.compras),
    total_kg: normalizarNumero(proveedor.total_kg),
    total_precio: normalizarNumero(proveedor.total_precio),
})

export const normalizarProducto = (producto = {}) => ({
    ...producto,
    nombre: obtenerNombreProducto(producto),
    categoria: normalizarTexto(producto.categoria),
    stock: obtenerStockProducto(producto),
    tipo_stock: obtenerTipoStock(producto),
    tipo_producto: obtenerTipoProducto(producto),
    costo: obtenerCostoProducto(producto),
    precio_mayorista: obtenerPrecioMayorista(producto),
    precio_minorista: obtenerPrecioMinorista(producto),
    alerta_stock: normalizarNumero(producto.alerta_stock),
    disponible: producto.disponible !== false,
})

export const normalizarItemVenta = (item = {}) => ({
    ...item,
    cantidad_kg: normalizarNumero(item.cantidad_kg ?? item.cantidad),
    costo_unitario: normalizarNumero(item.costo_unitario),
    ganancia: normalizarNumero(item.ganancia),
    nombre: normalizarTexto(item.nombre || item.producto_nombre || item.producto?.nombre) || "Producto sin nombre",
    precio_unitario: normalizarNumero(item.precio_unitario),
    subtotal: normalizarNumero(item.subtotal),
    tipo_stock: item.tipo_stock || "kg",
})

export const normalizarCompra = (compra = {}) => ({
    ...compra,
    cantidad_kg: normalizarNumero(compra.cantidad_kg ?? compra.cantidad),
    costo_kg: normalizarNumero(compra.costo_kg ?? compra.costo_unitario),
    fecha: compra.fecha || "",
    fecha_hora: compra.fecha_hora || "",
    producto: normalizarTexto(compra.producto || compra.producto_nombre || compra.producto?.nombre) || "Producto sin nombre",
    proveedor_id: compra.proveedor_id || compra.proveedor?.id || "",
    tipo_stock: compra.tipo_stock || "kg",
    total_compra: normalizarNumero(compra.total_compra ?? compra.total),
})

export const normalizarComprobanteVenta = (comprobante = {}) => ({
    ...comprobante,
    cliente: normalizarCliente(comprobante.cliente || {}),
    estado_pago: comprobante.estado_pago || comprobante.pago?.estado || "completo",
    ganancia_total: normalizarNumero(comprobante.ganancia_total),
    items: Array.isArray(comprobante.items) ? comprobante.items.map(normalizarItemVenta) : [],
    metodo_pago: comprobante.metodo_pago || comprobante.pago?.metodo || "efectivo",
    monto_debe: normalizarNumero(comprobante.monto_debe ?? comprobante.pago?.monto_debe),
    monto_pagado: normalizarNumero(comprobante.monto_pagado ?? comprobante.pago?.monto_pagado),
    total: normalizarNumero(comprobante.total ?? comprobante.pago?.total),
})

export const normalizarLista = (items, normalizador) => Array.isArray(items) ? items.map(normalizador) : []
