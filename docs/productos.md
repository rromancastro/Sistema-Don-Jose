# Identificación de productos

Cada producto nuevo guarda `tipo_producto`: `fruta_fresca`, `deshidratado`,
`caja` o `envasado`. Se elige al crear o editar en Stock; las altas desde
Compras de Fruta Fresca asignan `fruta_fresca`. Es independiente de
`tipo_stock` (`kg` o `unidad`) y de la categoría.
Los registros sin este campo se muestran como fruta fresca cuando su categoría
es Fruta Fresca (o Fruta Fresta); los demás se muestran como deshidratados.
Al editarlos se guarda el tipo elegido. No se realizó una migración remota.

Los nuevos productos se guardan en `productos/{id_producto}`, por ejemplo
`productos/1000`, con el campo numérico `id_producto: 1000`. Firestore requiere
que el identificador del documento sea texto; la aplicación conserva `id` como
texto para sus referencias y selectores.

La secuencia compartida por Stock y Compras comienza en 1000 y termina en 9999.
`contadores/productos` guarda `ultimo_id`. El contador se crea automáticamente
con el primer producto. Una transacción guarda el producto y actualiza el
contador juntos, con reintentos ante altas simultáneas. Si se alcanza 9999,
se rechaza el alta con un mensaje; no se generan códigos de cinco dígitos.

El código no se modifica al editar y no se reutiliza al eliminar. No borrar ni
reiniciar el contador, aunque se vacíe la colección de productos. Si el siguiente
documento ya existe, el alta falla sin sobrescribirlo.

Este cambio parte de la colección de productos vacía. No migra documentos
anteriores ni reconstruye referencias históricas a productos eliminados.

Las reglas desplegadas de Firestore deben permitir a los usuarios autorizados
leer y escribir `contadores/productos`, además de crear productos. Las reglas
no están versionadas en este repositorio: se debe verificar ese acceso en el
proyecto Firebase. La protección contra escrituras directas fuera de la aplicación
también debe implementarse en esas reglas.
