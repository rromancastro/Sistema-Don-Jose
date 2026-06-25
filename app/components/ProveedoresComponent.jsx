"use client"
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa"
import { NavComponent } from "./NavComponent"
import Link from "next/link"
import { AiOutlinePlus } from "react-icons/ai"
import { actualizarDocumento, crearDocumento, eliminarDocumento, obtenerDocumentos } from "../lib/firebase"
import { useEffect, useMemo, useState } from "react"
import { GoPencil, GoTrash } from "react-icons/go"

export const ProveedoresComponent = () => {

    const [proveedores, setProveedores] = useState([])
    const [compras, setCompras] = useState([])
    const [creandoProveedor, setCreandoProveedor] = useState(false)
    const [proveedorEditandoId, setProveedorEditandoId] = useState(null)
    const [proveedorConfirmandoId, setProveedorConfirmandoId] = useState(null)
    const [nuevoProveedor, setNuevoProveedor] = useState({
        nombre: "",
        telefono: "",
        email: "",
    })
    const [proveedorEditado, setProveedorEditado] = useState({
        nombre: "",
        telefono: "",
        email: "",
    })

    const proveedoresConTotales = useMemo(() => {
        return proveedores.map((proveedor) => {
            const comprasDelProveedor = compras.filter((compra) => compra.proveedor_id === proveedor.id)
            const totalKg = comprasDelProveedor.reduce((total, compra) => total + Number(compra.cantidad_kg || 0), 0)
            const totalPrecio = comprasDelProveedor.reduce((total, compra) => total + Number(compra.total_compra || 0), 0)

            return {
                ...proveedor,
                total_kg: totalKg,
                total_precio: totalPrecio,
            }
        })
    }, [proveedores, compras])

    useEffect(() => {
        const cargarProveedores = async () => {
            const data = await obtenerDocumentos("proveedores");
            setProveedores(data);
        };

        cargarProveedores();
    }, []);

    useEffect(() => {
        const cargarCompras = async () => {
            const data = await obtenerDocumentos("compras");
            setCompras(data);
        };

        cargarCompras();
    }, []);

    const abrirCrearProveedor = () => {
        setCreandoProveedor(true)
        setProveedorEditandoId(null)
        setProveedorConfirmandoId(null)
    }

    const cancelarCrearProveedor = () => {
        setCreandoProveedor(false)
        setNuevoProveedor({
            nombre: "",
            telefono: "",
            email: "",
        })
    }

    const guardarNuevoProveedor = async () => {
        const proveedorParaCrear = {
            nombre: nuevoProveedor.nombre,
            telefono: nuevoProveedor.telefono,
            email: nuevoProveedor.email,
            compras: 0,
        }

        const id = await crearDocumento("proveedores", proveedorParaCrear)

        setProveedores((proveedoresActuales) => [
            {
                id,
                ...proveedorParaCrear,
            },
            ...proveedoresActuales,
        ])

        cancelarCrearProveedor()
    }

    const editarProveedor = (proveedor) => {
        setCreandoProveedor(false)
        setProveedorEditandoId(proveedor.id)
        setProveedorConfirmandoId(null)
        setProveedorEditado({
            nombre: proveedor.nombre || "",
            telefono: proveedor.telefono || "",
            email: proveedor.email || "",
        })
    }

    const cancelarEdicion = () => {
        setProveedorEditandoId(null)
        setProveedorEditado({
            nombre: "",
            telefono: "",
            email: "",
        })
    }

    const guardarProveedor = async (proveedorId) => {
        const proveedorActualizado = {
            nombre: proveedorEditado.nombre,
            telefono: proveedorEditado.telefono,
            email: proveedorEditado.email,
        }

        await actualizarDocumento("proveedores", proveedorId, proveedorActualizado)

        setProveedores((proveedoresActuales) => proveedoresActuales.map((proveedor) => {
            if (proveedor.id !== proveedorId) return proveedor

            return {
                ...proveedor,
                ...proveedorActualizado,
            }
        }))

        cancelarEdicion()
    }

    const borrarProveedor = async (proveedor) => {
        await eliminarDocumento("proveedores", proveedor.id)
        setProveedores((proveedoresActuales) => proveedoresActuales.filter((proveedorActual) => proveedorActual.id !== proveedor.id))
        setProveedorConfirmandoId(null)

        if (proveedorEditandoId === proveedor.id) {
            cancelarEdicion()
        }
    }

    return <section>
        <NavComponent bgColor="#155DFC" >
            <Link href={'/'}>
                <FaArrowLeft />
            </Link>
            <h1>Proveedores</h1>
            <AiOutlinePlus color="#155DFC" onClick={abrirCrearProveedor} />
        </NavComponent>

        <div id="proveedoresContainer">
            {
                creandoProveedor && (
                    <article className="proveedorCard proveedorCardEditando bdRadius">
                        <form className="proveedorEditForm" onSubmit={(e) => {
                            e.preventDefault()
                            guardarNuevoProveedor()
                        }}>
                            <input
                                type="text"
                                value={nuevoProveedor.nombre}
                                onChange={(e) => setNuevoProveedor((proveedorActual) => ({
                                    ...proveedorActual,
                                    nombre: e.target.value,
                                }))}
                                placeholder="Nombre del proveedor"
                                aria-label="Nombre del proveedor"
                            />
                            <input
                                type="text"
                                value={nuevoProveedor.telefono}
                                onChange={(e) => setNuevoProveedor((proveedorActual) => ({
                                    ...proveedorActual,
                                    telefono: e.target.value,
                                }))}
                                placeholder="Telefono"
                                aria-label="Telefono del proveedor"
                            />
                            <input
                                type="email"
                                value={nuevoProveedor.email}
                                onChange={(e) => setNuevoProveedor((proveedorActual) => ({
                                    ...proveedorActual,
                                    email: e.target.value,
                                }))}
                                placeholder="Email"
                                aria-label="Email del proveedor"
                            />
                            <div className="proveedorEditActions">
                                <button type="submit">
                                    <FaCheck />
                                    Guardar
                                </button>
                                <button type="button" onClick={cancelarCrearProveedor}>
                                    <FaTimes />
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </article>
                )
            }
            {
                proveedoresConTotales.map((proveedor) => (
                    <article key={proveedor.id} className={`proveedorCard bdRadius ${proveedorEditandoId === proveedor.id ? "proveedorCardEditando" : ""} ${proveedorConfirmandoId === proveedor.id ? "proveedorCardConfirmando" : ""}`}>
                        {
                            proveedorEditandoId === proveedor.id ? (
                                <form className="proveedorEditForm" onSubmit={(e) => {
                                    e.preventDefault()
                                    guardarProveedor(proveedor.id)
                                }}>
                                    <input
                                        type="text"
                                        value={proveedorEditado.nombre}
                                        onChange={(e) => setProveedorEditado((proveedorActual) => ({
                                            ...proveedorActual,
                                            nombre: e.target.value,
                                        }))}
                                        aria-label="Nombre del proveedor"
                                    />
                                    <input
                                        type="text"
                                        value={proveedorEditado.telefono}
                                        onChange={(e) => setProveedorEditado((proveedorActual) => ({
                                            ...proveedorActual,
                                            telefono: e.target.value,
                                        }))}
                                        aria-label="Telefono del proveedor"
                                    />
                                    <input
                                        type="email"
                                        value={proveedorEditado.email}
                                        onChange={(e) => setProveedorEditado((proveedorActual) => ({
                                            ...proveedorActual,
                                            email: e.target.value,
                                        }))}
                                        aria-label="Email del proveedor"
                                    />
                                    <div className="proveedorEditActions">
                                        <button type="submit">
                                            <FaCheck />
                                            Guardar
                                        </button>
                                        <button type="button" onClick={cancelarEdicion}>
                                            <FaTimes />
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                            ) : proveedorConfirmandoId === proveedor.id ? (
                                <div className="proveedorDeleteConfirm">
                                    <p>Esta seguro que desea eliminar a {proveedor.nombre}?</p>
                                    <div className="proveedorDeleteActions">
                                        <button type="button" onClick={() => borrarProveedor(proveedor)}>
                                            <GoTrash />
                                            Eliminar
                                        </button>
                                        <button type="button" onClick={() => setProveedorConfirmandoId(null)}>
                                            <FaTimes />
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p>{proveedor.nombre}</p>
                                    <p>{proveedor.telefono ? proveedor.telefono : ""} - {proveedor.email ? proveedor.email : ""}</p>
                                    <div className="proveedorStats">
                                        <p>Compras <span>{proveedor.compras}</span></p>
                                        <p>Total kg <span>{proveedor.total_kg}</span></p>
                                        <p>Total $ <span>${proveedor.total_precio.toLocaleString('es-ES')}</span></p>
                                    </div>
                                    <div className="proveedorActions">
                                        <button type="button" onClick={() => editarProveedor(proveedor)} aria-label={`Editar ${proveedor.nombre}`}>
                                            <GoPencil />
                                        </button>
                                        <button type="button" onClick={() => setProveedorConfirmandoId(proveedor.id)} aria-label={`Eliminar ${proveedor.nombre}`}>
                                            <GoTrash />
                                        </button>
                                    </div>
                                </>
                            )
                        }
                    </article>
                ))
            }
        </div>
    </section>
}
