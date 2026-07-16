import { actualizarDocumento, crearDocumento } from "./firebase"
import { formatearEstadoPago, formatearMetodoPago } from "./normalizadores"

export const registrarVenta = async ({
    cliente,
    documento,
    estadoPago,
    fechaHoraVenta,
    fechaVenta,
    gananciaTotal,
    items,
    metodoPago,
    montoDebe,
    montoPagado,
    observaciones,
    total,
    emitirFacturaElectronica,
    extraComprobante = {},
    extraVenta = {},
}) => {
    const itemsVenta = items.map((item) => ({ ...item }))
    const pagoVenta = {
        estado: estadoPago,
        estado_label: formatearEstadoPago(estadoPago),
        metodo: metodoPago,
        metodo_label: formatearMetodoPago(metodoPago),
        monto_debe: montoDebe,
        monto_pagado: montoPagado,
        total,
    }
    const clienteVenta = {
        id: cliente.id,
        nombre: cliente.nombre || "",
        telefono: cliente.telefono || "",
        email: cliente.email || "",
        dni_cuit: cliente.dni_cuit || "",
        direccion: cliente.direccion || "",
    }
    const comprobanteParaGuardar = {
        negocio: {
            nombre: "Don Jose",
            rubro: "Frutos Secos",
        },
        cliente: clienteVenta,
        fecha: fechaVenta,
        fecha_hora: fechaHoraVenta,
        ganancia_total: gananciaTotal,
        items: itemsVenta.map((item) => ({
            cantidad_kg: item.cantidad_kg,
            costo_unitario: item.costo_unitario,
            ganancia: item.ganancia,
            id: item.id,
            nombre: item.nombre,
            precio_unitario: item.precio_unitario,
            producto_id: item.producto_id,
            subtotal: item.subtotal,
            tipo_precio: item.tipo_precio,
            tipo_stock: item.tipo_stock,
        })),
        pago: pagoVenta,
        estado_pago: estadoPago,
        metodo_pago: metodoPago,
        monto_debe: montoDebe,
        monto_pagado: montoPagado,
        observaciones: observaciones.trim(),
        tipo_documento: documento,
        total,
        ...extraComprobante,
    }

    const comprobanteId = await crearDocumento("comprobantes_venta", comprobanteParaGuardar)
    const ventasIds = await Promise.all(itemsVenta.map((item) => crearDocumento("ventas", {
        cantidad_kg: item.cantidad_kg,
        cliente: {
            id: cliente.id,
            nombre: cliente.nombre || "",
            dni_cuit: cliente.dni_cuit || "",
            direccion: cliente.direccion || "",
        },
        cliente_id: cliente.id,
        comprobante_id: comprobanteId,
        costo_unitario: item.costo_unitario,
        fecha: fechaVenta,
        fecha_hora: fechaHoraVenta,
        ganancia: item.ganancia,
        pago: pagoVenta,
        estado_pago: estadoPago,
        metodo_pago: metodoPago,
        monto_debe: montoDebe,
        monto_pagado: montoPagado,
        observaciones: observaciones.trim(),
        precio_unitario: item.precio_unitario,
        producto: {
            id: item.producto_id,
            nombre: item.nombre,
        },
        producto_id: item.producto_id,
        producto_nombre: item.nombre,
        subtotal: item.subtotal,
        tipo_documento: documento,
        tipo_precio: item.tipo_precio,
        tipo_stock: item.tipo_stock,
        ...extraVenta,
    })))
    const comprobanteConIds = {
        id: comprobanteId,
        venta_ids: ventasIds,
        ...comprobanteParaGuardar,
    }
    const facturaElectronica = documento === "factura" && emitirFacturaElectronica
        ? await emitirFacturaElectronica(comprobanteConIds)
        : null
    const datosComprobanteActualizado = {
        id: comprobanteId,
        venta_ids: ventasIds,
        ...(facturaElectronica ? { factura_electronica: facturaElectronica } : {}),
    }

    await actualizarDocumento("comprobantes_venta", comprobanteId, datosComprobanteActualizado)

    const clienteActualizado = {
        facturacion: Number(cliente.facturacion || 0) + total,
        ganancia: Number(cliente.ganancia || 0) + gananciaTotal,
        deuda: Number(cliente.deuda || 0) + montoDebe,
        ventas: Number(cliente.ventas || 0) + 1,
    }

    await actualizarDocumento("clientes", cliente.id, clienteActualizado)

    return {
        clienteActualizado,
        comprobante: {
            ...comprobanteConIds,
            ...(facturaElectronica ? { factura_electronica: facturaElectronica } : {}),
        },
    }
}
