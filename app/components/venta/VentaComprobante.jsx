"use client"

import Link from "next/link"
import { FaCheck, FaDownload, FaHome } from "react-icons/fa"
import { descargarComprobantePDF } from "../../lib/documentosPdf"
import {
    formatearDineroConDecimales as formatearPrecio,
    formatearDocumento,
    formatearEstadoPago,
    formatearMetodoPago,
    formatearTipoStock,
} from "../../lib/normalizadores"

export const VentaComprobante = ({ comprobanteVenta }) => (
    <section className="ventaComprobantePage">
        <div className="ventaComprobanteIcono">
            <FaCheck />
        </div>
        <h1>Venta Registrada</h1>
        <p>{formatearDocumento(comprobanteVenta.tipo_documento)} de Venta</p>

        <article className="ventaComprobanteCard" id="ventaComprobante">
            <div className="ventaComprobanteMarca">
                <h2>Don Jose</h2>
                <p>Frutos Secos</p>
                <span>{comprobanteVenta.fecha_hora}</span>
            </div>

            {
                comprobanteVenta.tipo_documento === "factura" && (
                    <div className={`ventaFacturaElectronica ${comprobanteVenta.factura_electronica?.cae ? "ventaFacturaElectronicaEmitida" : "ventaFacturaElectronicaPendiente"}`}>
                        <span>Factura electronica</span>
                        <strong>{comprobanteVenta.factura_electronica?.cae ? "CAE emitido" : "Pendiente"}</strong>
                        {
                            comprobanteVenta.factura_electronica?.cae ? (
                                <p>CAE: {comprobanteVenta.factura_electronica.cae}</p>
                            ) : (
                                <p>{comprobanteVenta.factura_electronica?.mensaje || "No se recibio CAE."}</p>
                            )
                        }
                    </div>
                )
            }

            <div className="ventaComprobanteCliente">
                <span>Cliente</span>
                <strong>{comprobanteVenta.cliente.nombre}</strong>
                {
                    comprobanteVenta.cliente.dni_cuit && (
                        <p>DNI/CUIT: {comprobanteVenta.cliente.dni_cuit}</p>
                    )
                }
                {
                    comprobanteVenta.cliente.direccion && (
                        <p>Direccion: {comprobanteVenta.cliente.direccion}</p>
                    )
                }
            </div>

            <div className="ventaComprobanteItems">
                {
                    comprobanteVenta.items.map((item) => (
                        <div key={item.id} className="ventaComprobanteItem">
                            <div>
                                <p>{item.nombre}</p>
                                <span>{item.cantidad_kg} {formatearTipoStock(item.tipo_stock, item.cantidad_kg)} x {formatearPrecio(item.precio_unitario)}/{formatearTipoStock(item.tipo_stock)}</span>
                            </div>
                            <strong>{formatearPrecio(item.subtotal)}</strong>
                        </div>
                    ))
                }
            </div>

            <div className="ventaComprobanteTotal">
                <span>Total</span>
                <strong>{formatearPrecio(comprobanteVenta.total)}</strong>
            </div>

            <div className="ventaComprobantePago">
                <span>Pago</span>
                <strong>{formatearMetodoPago(comprobanteVenta.metodo_pago)} - {formatearEstadoPago(comprobanteVenta.estado_pago)}</strong>
                {
                    comprobanteVenta.estado_pago === "incompleto" && (
                        <p>Pago {formatearPrecio(comprobanteVenta.monto_pagado)} - Debe {formatearPrecio(comprobanteVenta.monto_debe)}</p>
                    )
                }
            </div>

            {
                comprobanteVenta.observaciones && (
                    <div className="ventaComprobanteObservaciones">
                        <span>Observaciones</span>
                        <p>{comprobanteVenta.observaciones}</p>
                    </div>
                )
            }

            <p className="ventaComprobanteGracias">Gracias por su compra!</p>
        </article>

        <div className="ventaComprobanteAcciones">
            <button type="button" onClick={() => descargarComprobantePDF(comprobanteVenta)}>
                <FaDownload />
                Descargar PDF
            </button>
            <Link href="/">
                <FaHome />
                Volver al Inicio
            </Link>
        </div>
    </section>
)
