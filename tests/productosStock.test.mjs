import test from "node:test"
import assert from "node:assert/strict"
import { calcularConversion, cambioStock, normalizarAtributos } from "../app/lib/productosStock.js"

const seco = { id: "1000", tipo_producto: "deshidratado", tipo_stock: "kg", stock: 30 }
const caja = { id: "1001", tipo_producto: "caja", tipo_stock: "unidad", stock: 3, producto_contenido_id: "1000", atributos: { peso_neto_kg: 10 } }
const envase = { id: "1002", tipo_producto: "envasado", tipo_stock: "unidad", stock: 0, producto_contenido_id: "1001", atributos: { peso_neto_kg: 0.25 } }

test("20 kg de deshidratado producen 2 cajas de 10 kg", () => {
    const resultado = calcularConversion(seco, caja, 20)
    assert.equal(resultado.cantidad_obtenida, 2)
    assert.equal(resultado.peso_total_kg, 20)
})
test("una caja de 10 kg produce 40 envases de 250 g", () => {
    assert.equal(calcularConversion(caja, envase, 1).cantidad_obtenida, 40)
})
test("conserva el peso con decimales binarios", () => {
    assert.equal(calcularConversion(seco, { ...caja, atributos: { peso_neto_kg: 0.1 } }, 0.3).cantidad_obtenida, 3)
})
test("rechaza stock insuficiente, cantidades inválidas y cajas fraccionadas", () => {
    for (const cantidad of [31, 0, -1, NaN, Infinity]) assert.throws(() => calcularConversion(seco, caja, cantidad))
    assert.throws(() => calcularConversion(caja, envase, 0.5), /entera/)
})
test("rechaza saltos de tipo y productos sin relación", () => {
    assert.throws(() => calcularConversion(seco, envase, 10), /conversión/)
    assert.throws(() => calcularConversion(seco, { ...caja, producto_contenido_id: "otro" }, 10), /origen/)
    assert.throws(() => calcularConversion(caja, caja, 1), /diferentes/)
})
test("rechaza peso faltante, unidades incorrectas y sobrantes", () => {
    assert.throws(() => calcularConversion(seco, { ...caja, atributos: {} }, 10), /peso neto/)
    assert.throws(() => calcularConversion({ ...seco, tipo_stock: "unidad" }, caja, 10), /kg/)
    assert.throws(() => calcularConversion(seco, caja, 15), /sobrantes/)
    assert.throws(() => calcularConversion(caja, { ...envase, atributos: { peso_neto_kg: 0.3 } }, 1), /sobrantes/)
})
test("lee y actualiza también las representaciones antiguas del stock", () => {
    assert.throws(() => calcularConversion({ ...seco, stock_kg: 5 }, caja, 10), /insuficiente/)
    assert.deepEqual(cambioStock({ stock: 20, stock_kg: 20, cantidad_kg: 20 }, 10), { stock: 10, stock_kg: 10, cantidad_kg: 10 })
})
test("normaliza los atributos del tipo y conserva cero y campos opcionales vacíos", () => {
    assert.deepEqual(normalizarAtributos("caja", { peso_neto_kg: "10", tipo_empaque: " Cartón ", humedad: 10 }), { peso_neto_kg: 10, tipo_empaque: "Cartón" })
    assert.equal(normalizarAtributos("deshidratado", { humedad: 0 }).humedad, 0)
    assert.equal(normalizarAtributos("fruta_fresca").rendimiento_esperado, "")
})
