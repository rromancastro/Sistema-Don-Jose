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

Stock muestra cuatro pestañas por `tipo_producto`: Fruta fresca, Deshidratada,
Caja y Envasado. Cada pestaña permite crear productos con ese tipo preseleccionado.
Caja y envasado se guardan en unidades enteras; fruta fresca y deshidratada proponen kg.

## Atributos por tipo

Los atributos se guardan en el objeto `atributos` de cada producto:

- Fruta fresca: `variedad`, `calidad`, `rendimiento_esperado` (%).
- Deshidratado: `fruta_origen`, `presentacion`, `calidad`, `humedad` (%).
- Caja: `peso_neto_kg` obligatorio y `tipo_empaque`.
- Envasado: `peso_neto_kg` obligatorio, `tipo_empaque` y `codigo_barras` opcional.

Cajas y envasados guardan además `producto_contenido_id`: el deshidratado de origen
para cajas, y la caja de origen para envasados. Una caja representa producto con
contenido, no un material de embalaje vacío. Los registros existentes se configuran
desde Stock antes de convertirlos. No se modificaron datos remotos ni se agregaron lotes.

## Conversiones de empaque

Desde Stock se accede a Transformaciones. El panel de conversiones permite:

1. Deshidratado → Caja: 20 kg de origen producen 2 cajas de 10 kg.
2. Caja → Envasado: 1 caja de 10 kg produce 40 envases de 0,25 kg.

Se selecciona la cantidad de origen y el destino debe estar vinculado a ese origen.
La salida se calcula con los pesos netos. Se rechazan pesos inválidos, stock
insuficiente, unidades incorrectas, cajas fraccionadas y cantidades con sobrantes.
Para cantidades con sobrantes hay que ajustar el origen; no se descarta peso automáticamente.

`registrarConversion` vuelve a leer los productos dentro de una transacción de
Firestore y guarda ambos stocks y el historial juntos. Una misma operación conserva
su identificador al reintentar desde el formulario para evitar duplicarla. El historial
registra pesos, cantidades y stocks anteriores/posteriores, y queda completado de inmediato.
Los costos y precios de los productos destino conservan su configuración en Stock.
El flujo previo de deshidratación continúa disponible en la misma pantalla.

Validación local: `node --test tests/productosStock.test.mjs`.
Las pruebas cubren cálculos y validaciones; no escriben en Firebase.
