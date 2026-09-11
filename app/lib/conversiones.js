import { collection, doc, runTransaction } from "firebase/firestore"
import { db } from "./firebase"
import { normalizarProducto, obtenerStockProducto } from "./normalizadores"
import { calcularConversionPorUnidades, cambioStock } from "./productosStock"
import { obtenerFechaHoraActual } from "./fechas"

export const registrarConversion = async ({ origenId, destinoId, unidades, pesoUnidadKg, operacionId }) => {
    const registroRef = doc(collection(db, "transformaciones"), operacionId)
    const origenRef = doc(db, "productos", origenId)
    const destinoRef = doc(db, "productos", destinoId)
    return runTransaction(db, async (tx) => {
        const [registro, origenDoc, destinoDoc] = await Promise.all([
            tx.get(registroRef), tx.get(origenRef), tx.get(destinoRef),
        ])
        if (!origenDoc.exists() || !destinoDoc.exists()) throw new Error("Uno de los productos ya no existe.")
        const origen = normalizarProducto({ ...origenDoc.data(), id: origenDoc.id })
        const destino = normalizarProducto({ ...destinoDoc.data(), id: destinoDoc.id })
        if (registro.exists()) return { transformacion: { ...registro.data(), id: registro.id }, productos: [origen, destino] }
        const calculo = calcularConversionPorUnidades(origen, destino, unidades, pesoUnidadKg)
        const stockOrigen = obtenerStockProducto(origen) - calculo.cantidad_utilizada
        const stockDestino = obtenerStockProducto(destino) + calculo.cantidad_obtenida
        if (!Number.isFinite(stockDestino)) throw new Error("El stock de destino no es válido.")
        const transformacion = {
            ...calculo, ...obtenerFechaHoraActual(),
            tipo_transformacion: `${origen.tipo_producto}_a_${destino.tipo_producto}`,
            estado: "completada", cantidad_final: calculo.cantidad_obtenida,
            materia_prima_id: origen.id, materia_prima_nombre: origen.nombre,
            producto_final_id: destino.id, producto_final_nombre: destino.nombre,
            tipo_stock_materia_prima: origen.tipo_stock, tipo_stock_final: destino.tipo_stock,
            rendimiento_porcentaje: 100, perdida_descarte: 0,
            materia_prima: { id: origen.id, nombre: origen.nombre, tipo_stock: origen.tipo_stock, stock_anterior: obtenerStockProducto(origen), stock_actualizado: stockOrigen },
            producto_final: { id: destino.id, nombre: destino.nombre, tipo_stock: destino.tipo_stock, stock_anterior: obtenerStockProducto(destino), stock_actualizado: stockDestino },
        }
        tx.update(origenRef, cambioStock(origen, stockOrigen))
        const cambioDestino = { ...cambioStock(destino, stockDestino), atributos: { ...destino.atributos, peso_neto_kg: calculo.peso_destino_kg } }
        tx.update(destinoRef, cambioDestino)
        tx.set(registroRef, transformacion)
        return { transformacion: { ...transformacion, id: registroRef.id }, productos: [
            { ...origen, ...cambioStock(origen, stockOrigen) },
            { ...destino, ...cambioDestino },
        ] }
    })
}
