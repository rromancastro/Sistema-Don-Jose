export const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
export const MESES_LARGOS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
export const DIAS_SEMANA_CORTOS = ["D", "L", "M", "M", "J", "V", "S"]
export const DIAS_SEMANA_DOS_LETRAS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"]
export const MS_DIA = 24 * 60 * 60 * 1000

export const obtenerFechaISO = (fecha = new Date()) => {
    const anio = fecha.getFullYear()
    const mes = String(fecha.getMonth() + 1).padStart(2, "0")
    const dia = String(fecha.getDate()).padStart(2, "0")

    return `${anio}-${mes}-${dia}`
}

export const obtenerFechaActual = () => obtenerFechaISO(new Date())

export const formatearFechaHora = (fecha = new Date()) => new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
}).format(fecha)

export const obtenerFechaHoraActual = () => {
    const ahora = new Date()
    const fecha = obtenerFechaISO(ahora)
    const hora = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`
    const [anio, mes, dia] = fecha.split("-")

    return {
        fecha,
        hora,
        fecha_hora: `${dia}/${mes}/${anio} ${hora}`,
    }
}

export const formatearFecha = (fecha) => {
    if (!fecha) return ""

    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const [anio, mes, dia] = fecha.split("-")

        return `${dia}/${mes}/${anio}`
    }

    return String(fecha).split(" ")[0]
}

export const formatearFechaCalendario = (fechaISO) => {
    const [anio, mes, dia] = fechaISO.split("-")

    return `${dia}/${mes}/${anio}`
}

export const normalizarFecha = (valor) => {
    if (!valor) return ""

    const texto = String(valor)

    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10)

    const coincidencia = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (coincidencia) {
        const [, dia, mes, anio] = coincidencia

        return `${anio}-${mes}-${dia}`
    }

    return ""
}

export const crearFechaLocal = (fechaISO) => {
    const [anio, mes, dia] = fechaISO.split("-").map(Number)

    return new Date(anio, mes - 1, dia)
}

export const crearFechaDesdeInput = (fecha) => {
    if (!fecha) return new Date()

    return crearFechaLocal(fecha)
}

export const sumarDias = (fechaISO, dias) => {
    const fecha = crearFechaLocal(fechaISO)
    fecha.setDate(fecha.getDate() + dias)

    return obtenerFechaISO(fecha)
}

export const obtenerDiasEntre = (desde, hasta) => {
    const inicio = crearFechaLocal(desde).getTime()
    const fin = crearFechaLocal(hasta).getTime()
    const cantidad = Math.max(Math.round((fin - inicio) / MS_DIA), 0) + 1

    return Array.from({ length: cantidad }, (_, index) => sumarDias(desde, index))
}

export const obtenerDiasCalendario = (mesVisible) => {
    const primerDiaMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1)
    const inicioCalendario = new Date(primerDiaMes)
    inicioCalendario.setDate(primerDiaMes.getDate() - primerDiaMes.getDay())

    return Array.from({ length: 42 }, (_, index) => {
        const fechaDia = new Date(inicioCalendario)
        fechaDia.setDate(inicioCalendario.getDate() + index)

        return {
            dia: fechaDia.getDate(),
            esMesActual: fechaDia.getMonth() === mesVisible.getMonth(),
            valor: obtenerFechaISO(fechaDia),
        }
    })
}
