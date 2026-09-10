import { doc, runTransaction } from "firebase/firestore"
import { db } from "./firebase"
import { obtenerNombreProducto, obtenerStockProducto } from "./normalizadores"

export const registrarCompraFrutaFresca = async (datos) => {
    if (!datos.fecha || !String(datos.numero || "").trim() || !datos.producto_id || !datos.productor_id) {
        throw new Error("Completá fecha, número, productor y producto.")
    }
    const numericos = ["cantidad", "pulpa_neta", "tara", "bruto", "neto", "cantidad_kg"]
    const valores = Object.fromEntries(numericos.map(campo => [campo, Number(datos[campo])]))
    if (numericos.some(campo => datos[campo] === "" || !Number.isFinite(valores[campo]) || valores[campo] < 0) || valores.cantidad <= 0 || valores.cantidad_kg <= 0) {
        throw new Error("Revisá las cantidades y los pesos. Deben ser válidos y el ingreso al stock debe ser mayor que cero.")
    }
    const neto = Math.round((valores.bruto - valores.tara) * 1000) / 1000
    if (neto <= 0 || valores.neto !== neto || valores.cantidad_kg !== neto) {
        throw new Error("El neto debe ser igual al bruto menos la tara.")
    }
    if (!String(datos.variedad || "").trim() || !String(datos.envase || "").trim()) {
        throw new Error("Completá variedad y envase.")
    }

    return runTransaction(db, async transaction => {
        const contadorRef = doc(db, "contadores", "vales");
        const productoRef = doc(db, "productos", datos.producto_id)
        const productorRef = doc(db, "proveedores", datos.productor_id)
        const contador = await transaction.get(contadorRef)
        const producto = await transaction.get(productoRef)
        const productor = await transaction.get(productorRef)
        if (!producto.exists() || !productor.exists()) throw new Error("El producto o el productor ya no existe.")
        const productoData = producto.data()
        if (!["Fruta Fresca", "Fruta Fresta"].includes(productoData.categoria) || (productoData.tipo_stock || "kg") !== "kg") {
            throw new Error("Seleccioná un producto de Fruta Fresca con stock en kg.")
        }
        const ultimo = contador.exists() ? contador.data().ultimo_numero : 0
        if (!Number.isSafeInteger(ultimo) || ultimo < 0 || ultimo >= Number.MAX_SAFE_INTEGER) throw new Error("El contador de vales no es válido.")
        const numeroVale = String(ultimo + 1).padStart(8, "0")
        const compraRef = doc(db, "compras", `vale-${numeroVale}`)
        if ((await transaction.get(compraRef)).exists()) throw new Error("El número de vale ya existe. Revisá el contador.")
        const compra = {
            ...datos, ...valores,
            numero: String(datos.numero).trim(),
            numero_vale: numeroVale,
            tipo_compra: "fruta_fresca",
            producto: obtenerNombreProducto(productoData),
            id_producto: productoData.id_producto || "",
            productor: { id: productor.id, nombre: productor.data().nombre || "" },
            proveedor_id: productor.id,
            tipo_stock: "kg",
            costo_pendiente: true,
            total_compra: 0,
        }
        const stock = obtenerStockProducto(productoData) + valores.cantidad_kg
        transaction.set(compraRef, compra)
        transaction.set(contadorRef, { ultimo_numero: ultimo + 1 })
        transaction.update(productoRef, { stock, ...(Object.hasOwn(productoData, "stock_kg") ? { stock_kg: stock } : {}) })
        transaction.update(productorRef, { compras: Number(productor.data().compras || 0) + 1 })
        return { ...compra, id: compraRef.id }
    })
}
