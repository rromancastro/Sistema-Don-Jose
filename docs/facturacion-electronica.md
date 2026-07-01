# Facturacion electronica ARCA

La app ya llama a `app/api/facturacion-electronica/emitir/route.js` cuando una venta se genera con documento `Factura`.

Para que ARCA devuelva CAE real, crear `.env.local` con estos valores:

```env
ARCA_FACTURACION_HABILITADA=true
ARCA_AMBIENTE=homologacion
ARCA_CUIT_EMISOR=20111111112
ARCA_PUNTO_VENTA=1
ARCA_TIPO_COMPROBANTE=C
ARCA_CONCEPTO=1
ARCA_CERT="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
ARCA_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

Valores utiles:

- `ARCA_AMBIENTE`: `homologacion` para pruebas, `produccion` para facturas reales.
- `ARCA_TIPO_COMPROBANTE`: `C` para monotributo, `A` o `B` para responsable inscripto.
- `ARCA_CONCEPTO`: `1` productos, `2` servicios, `3` productos y servicios.
- `ARCA_IVA_ALICUOTA`: dejar sin definir para factura C. Para A/B usar por ejemplo `21`.
- `ARCA_OPENSSL_PATH`: opcional. Por defecto usa `openssl` del sistema.

Los archivos `.crt`, `.key`, `.pem` y `.env*` no se versionan por seguridad. Para local, pega el contenido del certificado y la clave en `.env.local` usando `\n` para los saltos de linea.

Esta integracion usa directamente los web services oficiales:

- WSAA: obtiene `token` y `sign`.
- WSFEv1: consulta ultimo comprobante y solicita CAE.

No usa AfipSDK ni servicios pagos. El servidor donde corre Next tiene que tener OpenSSL instalado para firmar el TRA.
