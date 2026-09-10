# Compras de Fruta Fresca y vales

Nueva Compra tiene dos secciones: Fruta Fresca y Deshidratados. La segunda queda
preparada, sin formulario, hasta definir su funcionamiento.

Cada compra de fruta fresca guarda fecha, número ingresado, número de vale
automático, productor (seleccionado desde proveedores), producto, variedad,
envase, cantidad, pulpa neta, tara, bruto, neto y detalle.

Se utiliza `neto = bruto - tara`, redondeado a tres decimales, como ingreso al
stock en kg. Pulpa neta se registra como dato numérico independiente, sin
convertirlo ni aplicar una fórmula. Este criterio debe ajustarse si el negocio
utiliza otra definición de pulpa neta o de los kilos recibidos.

El registro usa una transacción de Firestore para guardar `compras/vale-00000001`,
incrementar `contadores/vales.ultimo_numero`, sumar el stock del producto e
incrementar las compras del productor. La numeración comienza en 00000001 y
no se reinicia al borrar compras. Las reglas desplegadas deben permitir estas
operaciones para los usuarios autorizados; no están versionadas en el proyecto.

No se solicita precio: se guarda `costo_pendiente: true`, no se cambia el costo
del producto y el registro no aporta importe a los totales monetarios hasta que
se defina su valoración. El historial y el detalle del proveedor muestran el
importe pendiente.

El vale se descarga después de guardar y puede volver a descargarse desde
Vales registrados. Un fallo de descarga no vuelve a registrar la compra.
Se dejan vacíos el beneficiario, el movimiento de envases y la firma; los textos
largos continúan en un anexo. El PDF de ejemplo usa datos ficticios.
