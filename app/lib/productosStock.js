export const ATRIBUTOS_PRODUCTO = {
    fruta_fresca: [
        { campo: "variedad", etiqueta: "Variedad" },
        { campo: "calidad", etiqueta: "Calidad / calibre" },
        { campo: "rendimiento_esperado", etiqueta: "Rendimiento esperado (%)", numero: true, max: 100 },
    ],
    deshidratado: [
        { campo: "fruta_origen", etiqueta: "Fruta de origen" },
        { campo: "presentacion", etiqueta: "Presentación (entera, rodajas, cubos)" },
        { campo: "calidad", etiqueta: "Calidad" },
        { campo: "humedad", etiqueta: "Humedad (%)", numero: true, max: 100 },
    ],
    caja: [
        { campo: "peso_neto_kg", etiqueta: "Peso neto por caja (kg)", numero: true, requerido: true },
        { campo: "tipo_empaque", etiqueta: "Tipo de caja" },
    ],
    envasado: [
        { campo: "peso_neto_kg", etiqueta: "Peso neto por envase (kg)", numero: true, requerido: true },
        { campo: "tipo_empaque", etiqueta: "Tipo de envase" },
        { campo: "codigo_barras", etiqueta: "Código de barras" },
    ],
}

export const esEmpaque = (tipo) => ["caja", "envasado"].includes(tipo)

export const normalizarAtributos = (tipo, atributos = {}) => Object.fromEntries(
    (ATRIBUTOS_PRODUCTO[tipo] || []).map(({ campo, numero }) => {
        const valor = atributos[campo]
        return [campo, numero && valor !== "" && valor != null ? Number(valor) : String(valor ?? "").trim()]
    })
)

// Se guardan los pesos en kg; 0.25 equivale a un envase de 250 g.
export const calcularConversion = (origen, destino, cantidad) => {
    if (!origen || !destino || origen.id === destino.id) throw new Error("Seleccioná origen y destino diferentes.")
    const tipo = origen.tipo_producto
    if (!((tipo === "deshidratado" && destino.tipo_producto === "caja") ||
        (tipo === "caja" && destino.tipo_producto === "envasado"))) {
        throw new Error("La conversión debe ser de deshidratado a caja o de caja a envasado.")
    }
    if (destino.producto_contenido_id !== origen.id) throw new Error("El destino debe tener seleccionado este producto de origen en Stock.")
    if (origen.tipo_stock !== (tipo === "caja" ? "unidad" : "kg") || destino.tipo_stock !== "unidad") {
        throw new Error("Configurá deshidratados en kg y cajas/envasados en unidades.")
    }
    const utilizada = Number(cantidad)
    const stock = Number(origen.stock_kg ?? origen.stock ?? origen.cantidad_kg ?? 0)
    if (!Number.isFinite(utilizada) || utilizada <= 0) throw new Error("Ingresá una cantidad mayor que cero.")
    if (!Number.isFinite(stock) || utilizada > stock) throw new Error("Stock de origen insuficiente.")
    if (tipo === "caja" && !Number.isSafeInteger(utilizada)) throw new Error("La cantidad de cajas debe ser entera.")
    const pesoOrigen = tipo === "caja" ? Number(origen.atributos?.peso_neto_kg) : 1
    const pesoDestino = Number(destino.atributos?.peso_neto_kg)
    if (![pesoOrigen, pesoDestino].every((peso) => Number.isFinite(peso) && peso > 0)) {
        throw new Error("Configurá el peso neto de cada caja o envase en Stock.")
    }
    const pesoTotal = utilizada * pesoOrigen
    const obtenida = Math.round(pesoTotal / pesoDestino)
    if (!Number.isSafeInteger(obtenida) || obtenida <= 0 || Math.abs(pesoTotal - obtenida * pesoDestino) > 0.0000001) {
        throw new Error("La cantidad debe alcanzar para cajas o envases completos, sin sobrantes. Ajustá la cantidad de origen.")
    }
    return { cantidad_utilizada: utilizada, cantidad_obtenida: obtenida, peso_total_kg: pesoTotal,
        peso_origen_kg: pesoOrigen, peso_destino_kg: pesoDestino }
}

export const cambioStock = (producto, stock) => ({
    stock,
    ...(Object.hasOwn(producto, "stock_kg") ? { stock_kg: stock } : {}),
    ...(Object.hasOwn(producto, "cantidad_kg") ? { cantidad_kg: stock } : {}),
})
