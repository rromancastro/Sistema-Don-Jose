import { ATRIBUTOS_PRODUCTO, esEmpaque } from "../lib/productosStock"
import { obtenerTipoProducto, obtenerNombreProducto } from "../lib/normalizadores"

export const AtributosProducto = ({ producto, productos, cambiarCampo }) => <>
    {esEmpaque(producto.tipo_producto) && <>
        <label>Producto de origen</label>
        <select aria-label="Producto de origen" required value={producto.producto_contenido_id || ""}
            onChange={(e) => cambiarCampo("producto_contenido_id", e.target.value)}>
            <option value="">Seleccionar {producto.tipo_producto === "caja" ? "deshidratado" : "caja"}</option>
            {productos.filter((item) => obtenerTipoProducto(item) === (producto.tipo_producto === "caja" ? "deshidratado" : "caja") && item.id !== producto.id)
                .map((item) => <option key={item.id} value={item.id}>{obtenerNombreProducto(item)}</option>)}
        </select>
        <p>El peso es neto, sin el empaque. Para 250 g ingresá 0,25 kg.</p>
    </>}
    {(ATRIBUTOS_PRODUCTO[producto.tipo_producto] || []).map(({ campo, etiqueta, numero, max, requerido }) => <div key={campo}>
        <label htmlFor={`atributo-${campo}`}>{etiqueta}</label>
        <input id={`atributo-${campo}`} type={numero ? "number" : "text"}
            min={numero ? (requerido ? "0.000001" : "0") : undefined} max={max} step={numero ? "any" : undefined}
            required={requerido} value={producto.atributos?.[campo] ?? ""}
            onChange={(e) => cambiarCampo("atributos", { ...producto.atributos, [campo]: e.target.value })} />
    </div>)}
</>
