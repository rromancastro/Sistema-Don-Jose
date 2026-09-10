// Import the functions you need from the SDKs you need
import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { obtenerTipoProducto, TIPOS_PRODUCTO } from "./normalizadores";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC10dzjhrw8tJ4_aUMr8jjRTpaqkru0fxw",
  authDomain: "don-jose-84c44.firebaseapp.com",
  projectId: "don-jose-84c44",
  storageBucket: "don-jose-84c44.firebasestorage.app",
  messagingSenderId: "1026123415710",
  appId: "1:1026123415710:web:47447d6981d4b6750ebb8f"
};

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Conserva los registros y permisos existentes al renombrar el módulo.
const resolverColeccion = (nombre) => nombre === "cotizaciones" ? "presupuestos" : nombre;

export const obtenerDocumentos = async (nombreColeccion) => {
  const querySnapshot = await getDocs(collection(db, resolverColeccion(nombreColeccion)));

  return querySnapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
};

export const obtenerDocumentoPorId = async (nombreColeccion, id) => {
  const documentoRef = doc(db, resolverColeccion(nombreColeccion), id);
  const documentoSnapshot = await getDoc(documentoRef);

  if (!documentoSnapshot.exists()) {
    return null;
  }

  return {
    id: documentoSnapshot.id,
    ...documentoSnapshot.data(),
  };
};

export const crearDocumento = async (nombreColeccion, data) => {
  if (resolverColeccion(nombreColeccion) === "presupuestos") {
    return runTransaction(db, async (transaction) => {
      const contadorRef = doc(db, "contadores", "cotizaciones");
      const contador = await transaction.get(contadorRef);
      const ultimoNumero = contador.exists() ? contador.data().ultimo_numero : 0;
      if (!Number.isSafeInteger(ultimoNumero) || ultimoNumero < 0 || ultimoNumero >= Number.MAX_SAFE_INTEGER) {
        throw new Error("El contador de cotizaciones no es válido.");
      }

      const siguiente = ultimoNumero + 1;
      const numero = String(siguiente).padStart(4, "0");
      const cotizacionRef = doc(db, resolverColeccion(nombreColeccion), numero);
      if ((await transaction.get(cotizacionRef)).exists()) {
        throw new Error("El número de cotización ya existe. Revisá el contador de cotizaciones.");
      }

      transaction.set(cotizacionRef, { ...data, numero });
      transaction.set(contadorRef, { ultimo_numero: siguiente });
      return cotizacionRef.id;
    });
  }

  if (nombreColeccion === "productos") {
    const tipoProducto = obtenerTipoProducto(data);
    if (!Object.hasOwn(TIPOS_PRODUCTO, tipoProducto)) throw new Error("El tipo de producto no es válido.");
    return runTransaction(db, async (transaction) => {
      const contadorRef = doc(db, "contadores", "productos");
      const contador = await transaction.get(contadorRef);
      const ultimoId = contador.exists() ? contador.data().ultimo_id : 999;

      if (!Number.isInteger(ultimoId) || ultimoId < 999 || ultimoId > 9999) {
        throw new Error("El contador de productos no es válido.");
      }
      if (ultimoId === 9999) {
        throw new Error("Se agotaron los códigos de producto de cuatro dígitos (1000–9999).");
      }

      const idProducto = ultimoId + 1;
      const productoRef = doc(db, "productos", String(idProducto));
      const existente = await transaction.get(productoRef);
      if (existente.exists()) {
        throw new Error("El código de producto ya existe. Revisá el contador de productos.");
      }

      transaction.set(productoRef, { ...data, tipo_producto: tipoProducto, id_producto: idProducto });
      transaction.set(contadorRef, { ultimo_id: idProducto });
      return productoRef.id;
    });
  }

  const documentoRef = await addDoc(collection(db, resolverColeccion(nombreColeccion)), data);

  return documentoRef.id;
};

export const eliminarDocumento = async (nombreColeccion, id) => {
  await deleteDoc(doc(db, resolverColeccion(nombreColeccion), id));

  return id;
};

export const actualizarDocumento = async (nombreColeccion, id, data) => {
  if (nombreColeccion === "productos" && Object.hasOwn(data, "tipo_producto") && !Object.hasOwn(TIPOS_PRODUCTO, data.tipo_producto)) {
    throw new Error("El tipo de producto no es válido.");
  }
  if (resolverColeccion(nombreColeccion) === "presupuestos" && Object.hasOwn(data, "numero")) {
    throw new Error("El número de cotización se asigna automáticamente y no se puede modificar.");
  }
  if (nombreColeccion === "productos" && Object.hasOwn(data, "id_producto")) {
    throw new Error("El código de producto se asigna automáticamente y no se puede modificar.");
  }
  await updateDoc(doc(db, resolverColeccion(nombreColeccion), id), data);

  return id;
};
