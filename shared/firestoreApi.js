// shared/firestoreApi.js
//
// Funciones compartidas para leer/escribir en Firestore.
// Ambas apps (agenda-app y reservas-app) importan este archivo.

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  setDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ---------- Servicios ----------
export function listenServices(callback) {
  return onSnapshot(collection(db, "services"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
export async function addService(service) {
  return addDoc(collection(db, "services"), service);
}
export async function updateService(id, data) {
  return updateDoc(doc(db, "services", id), data);
}
export async function deleteService(id) {
  return deleteDoc(doc(db, "services", id));
}

// ---------- Disponibilidad (cupos abiertos por el profesional) ----------
export function listenAvailability(callback) {
  return onSnapshot(collection(db, "availability"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
export async function addAvailabilitySlot(slot) {
  // slot: { dateKey, start, end }
  return addDoc(collection(db, "availability"), slot);
}
export async function removeAvailabilitySlot(id) {
  return deleteDoc(doc(db, "availability", id));
}
// Crea muchos cupos de una sola vez (ej: "todos los lunes de 10 a 14, por 8 semanas")
// Firestore permite hasta 500 escrituras por batch; si hay más, las dividimos.
export async function addAvailabilitySlotsBatch(slots) {
  // slots: [{ dateKey, start, end }, ...]
  const chunks = [];
  for (let i = 0; i < slots.length; i += 450) chunks.push(slots.slice(i, i + 450));
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach(slot => {
      const ref = doc(collection(db, "availability"));
      batch.set(ref, slot);
    });
    await batch.commit();
  }
}
// Borra todos los cupos (sin reservar) de un día puntual
export async function removeAvailabilitySlotsByIds(ids) {
  if (ids.length === 0) return;
  const chunks = [];
  for (let i = 0; i < ids.length; i += 450) chunks.push(ids.slice(i, i + 450));
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach(id => batch.delete(doc(db, "availability", id)));
    await batch.commit();
  }
}

// ---------- Turnos ----------
export function listenAppointments(callback) {
  return onSnapshot(collection(db, "appointments"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
export async function createAppointment(appt) {
  // appt: { dateKey, start, end, serviceId, clientName, clientPhone, notes, status, fromAvailabilityId? }
  return addDoc(collection(db, "appointments"), { ...appt, createdAt: Date.now() });
}
export async function updateAppointment(id, data) {
  return updateDoc(doc(db, "appointments", id), data);
}
export async function deleteAppointment(id) {
  return deleteDoc(doc(db, "appointments", id));
}

// ---------- Clientes ----------
export function listenClients(callback) {
  return onSnapshot(collection(db, "clients"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
export async function upsertClientByName(name, phone) {
  const trimmedName = name.trim();
  const q = query(collection(db, "clients"), where("name", "==", trimmedName));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const existing = snap.docs[0];
    if (phone) await updateDoc(doc(db, "clients", existing.id), { phone });
    return existing.id;
  }
  const ref = await addDoc(collection(db, "clients"), {
    name: trimmedName,
    phone: phone || "",
    notes: "",
    createdAt: Date.now(),
  });
  return ref.id;
}
export async function updateClient(id, data) {
  return updateDoc(doc(db, "clients", id), data);
}
export async function deleteClient(id) {
  return deleteDoc(doc(db, "clients", id));
}

// ---------- Info del negocio ----------
export function listenBusinessInfo(callback) {
  return onSnapshot(doc(db, "businessInfo", "main"), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}
export async function setBusinessInfo(data) {
  return setDoc(doc(db, "businessInfo", "main"), data, { merge: true });
}
