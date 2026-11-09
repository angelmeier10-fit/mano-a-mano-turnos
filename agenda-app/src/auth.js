// agenda-app/src/auth.js
//
// Login y registro de cuentas de la agenda. La sesión queda guardada en el navegador (persistencia local), así que
// no te va a pedir login cada vez que abrís la app, solo si cerrás sesión
// manualmente o borrás los datos del navegador.

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
} from "firebase/auth";
import { firebaseConfig } from "../../shared/firebaseConfig";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = "es";
if (import.meta.env.VITE_USE_EMULATOR) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

setPersistence(auth, browserLocalPersistence);

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function loginWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function signUp(email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(user);
}

export function resendVerification() {
  return sendEmailVerification(auth.currentUser);
}

// Fuerza un token nuevo: las reglas leen email_verified del token, no de la cuenta.
export async function refreshEmailVerified() {
  await auth.currentUser.reload();
  if (auth.currentUser.emailVerified) await auth.currentUser.getIdToken(true);
  return auth.currentUser.emailVerified;
}

export function logout() {
  return signOut(auth);
}

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}
