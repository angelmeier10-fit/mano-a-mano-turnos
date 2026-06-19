// agenda-app/src/auth.js
//
// Login simple por email/contraseña. Solo vos vas a tener una cuenta acá.
// La sesión queda guardada en el navegador (persistencia local), así que
// no te va a pedir login cada vez que abrís la app, solo si cerrás sesión
// manualmente o borrás los datos del navegador.

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { firebaseConfig } from "../../shared/firebaseConfig";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence);

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}
