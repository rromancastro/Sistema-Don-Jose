"use client"

import { useId, useState } from "react"

const normalizarBusqueda = (valor) => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim()

export const SelectorPorNombre = ({ opciones, value, onChange, entidad }) => {
    const [busqueda, setBusqueda] = useState("")
    const id = useId()
    const consulta = normalizarBusqueda(busqueda)
    const resultados = opciones.filter(opcion => normalizarBusqueda(opcion.nombre).includes(consulta))
    const seleccionado = opciones.find(opcion => opcion.id === value)
    const seleccionadoFueraDelFiltro = seleccionado && !resultados.some(opcion => opcion.id === value)

    return <div className="selectorPorNombre">
        <input
            type="search"
            aria-label={`Buscar ${entidad.toLowerCase()} por nombre`}
            aria-controls={`${id}-opciones`}
            placeholder={`Buscar ${entidad.toLowerCase()} por nombre...`}
            value={busqueda}
            onChange={event => {
                const texto = event.target.value
                setBusqueda(texto)
                const consultaNueva = normalizarBusqueda(texto)
                if (!consultaNueva) return

                const coincidencia = opciones.find(opcion => normalizarBusqueda(opcion.nombre).includes(consultaNueva))
                const nuevoId = coincidencia?.id || ""
                if (nuevoId !== value) onChange(nuevoId)
            }}
        />
        <select id={`${id}-opciones`} aria-label={entidad} value={value} onChange={event => {
            onChange(event.target.value)
            setBusqueda("")
        }}>
            {!seleccionado && <option value="">{opciones.length ? `Seleccionar ${entidad.toLowerCase()}...` : "Sin opciones disponibles"}</option>}
            {seleccionadoFueraDelFiltro && <option value={seleccionado.id}>{seleccionado.etiqueta || seleccionado.nombre} (seleccionado)</option>}
            {resultados.map(opcion => <option key={opcion.id} value={opcion.id}>{opcion.etiqueta || opcion.nombre}</option>)}
        </select>
        {consulta && <span className="selectorPorNombreEstado" role="status">
            {resultados.length === 0 ? "No hay coincidencias." : `${resultados.length} coincidencia${resultados.length === 1 ? "" : "s"}.`}
        </span>}
    </div>
}
