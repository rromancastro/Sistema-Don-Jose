// Import the functions you need from the SDKs you need
import { getApps, initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
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
export const db = getFirestore(app);

export const obtenerDocumentos = async (nombreColeccion) => {
  const querySnapshot = await getDocs(collection(db, nombreColeccion));

  return querySnapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
};

export const obtenerDocumentoPorId = async (nombreColeccion, id) => {
  const documentoRef = doc(db, nombreColeccion, id);
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
  const documentoRef = await addDoc(collection(db, nombreColeccion), data);

  return documentoRef.id;
};

export const eliminarDocumento = async (nombreColeccion, id) => {
  await deleteDoc(doc(db, nombreColeccion, id));

  return id;
};

export const actualizarDocumento = async (nombreColeccion, id, data) => {
  await updateDoc(doc(db, nombreColeccion, id), data);

  return id;
};
