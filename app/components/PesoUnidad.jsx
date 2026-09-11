"use client"

import { useId, useState } from "react"

export const PesoUnidad = ({ value, onChange }) => {
    const id = useId()
    const [unidad, setUnidad] = useState("kg")
    const factor = unidad === "g" ? 1000 : 1
    return <div className="pesoUnidad">
        <label htmlFor={id}>Peso neto de cada unidad de stock</label>
        <div style={{ display: "flex", gap: 8 }}>
            <input id={id} type="number" min="0.000001" step="any" required
                value={value === "" || value == null ? "" : Number((Number(value) * factor).toPrecision(12))}
                onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value) / factor)} />
            <select aria-label="Unidad de peso" value={unidad} onChange={e => setUnidad(e.target.value)}>
                <option value="kg">kg</option><option value="g">g</option>
            </select>
        </div>
    </div>
}
