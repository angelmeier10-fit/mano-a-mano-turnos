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
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  setDoc,
  getDocs,
  writeBatch,
  runTransaction,
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

// Reserva atómica: lee el cupo, verifica que no esté ocupado, lo marca booked:true
// y crea el turno en una sola transacción. Previene que dos personas reserven el
// mismo horario simultáneamente.
export async function bookSlotAtomic(appt) {
  const slotId = appt.fromAvailabilityId;
  if (!slotId) {
    return createAppointment(appt);
  }
  const slotRef = doc(db, "availability", slotId);
  return runTransaction(db, async (transaction) => {
    const slotSnap = await transaction.get(slotRef);
    if (!slotSnap.exists() || slotSnap.data().booked) {
      throw new Error("Este horario ya fue reservado. Por favor elegí otro.");
    }
    transaction.update(slotRef, { booked: true });
    const apptRef = doc(collection(db, "appointments"));
    transaction.set(apptRef, { ...appt, createdAt: Date.now() });
  });
}

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
function normalizePhone(phone) {
  return (phone || "").replace(/[^\d]/g, "");
}

// Uso desde la Agenda (vos, logueado): deduplica primero por teléfono (dígitos),
// después por nombre. Guarda phoneDigits y mantiene phoneIndex sincronizado.
export async function upsertClientByName(name, phone) {
  const trimmedName = name.trim();
  const phoneDigits = normalizePhone(phone);

  if (phoneDigits) {
    const qPhone = query(collection(db, "clients"), where("phoneDigits", "==", phoneDigits));
    const snapPhone = await getDocs(qPhone);
    if (!snapPhone.empty) {
      const existing = snapPhone.docs[0];
      await updateDoc(doc(db, "clients", existing.id), { phone: phone || existing.data().phone });
      // phoneIndex ya existe para estos dígitos — no hace falta tocarlo
      return existing.id;
    }
  }

  const qName = query(collection(db, "clients"), where("name", "==", trimmedName));
  const snapName = await getDocs(qName);
  if (!snapName.empty) {
    const existing = snapName.docs[0];
    const updates = {};
    if (phone) updates.phone = phone;
    if (phoneDigits) updates.phoneDigits = phoneDigits;
    if (Object.keys(updates).length) await updateDoc(doc(db, "clients", existing.id), updates);
    if (phoneDigits) {
      await setDoc(doc(db, "phoneIndex", phoneDigits), { clientId: existing.id });
    }
    return existing.id;
  }

  const ref = await addDoc(collection(db, "clients"), {
    name: trimmedName,
    phone: phone || "",
    phoneDigits,
    notes: "",
    createdAt: Date.now(),
  });
  if (phoneDigits) {
    await setDoc(doc(db, "phoneIndex", phoneDigits), { clientId: ref.id });
  }
  return ref.id;
}

// Uso desde la app pública de Reservas (sin login): deduplica por teléfono usando
// la colección phoneIndex (accesible públicamente, sin datos sensibles).
// La creación de cliente nunca tumba la reserva — todos los errores son silenciosos.
export async function createClientPublic(name, phone) {
  const phoneDigits = normalizePhone(phone);

  if (phoneDigits) {
    try {
      const indexSnap = await getDoc(doc(db, "phoneIndex", phoneDigits));
      if (indexSnap.exists()) return indexSnap.data().clientId;
    } catch {
      // Error de red o permisos — continúa a crear
    }
  }

  try {
    const ref = await addDoc(collection(db, "clients"), {
      name: name.trim(),
      phone: phone || "",
      phoneDigits,
      notes: "",
      createdAt: Date.now(),
    });
    if (phoneDigits) {
      try {
        await setDoc(doc(db, "phoneIndex", phoneDigits), { clientId: ref.id });
      } catch (indexErr) {
        console.error("[phoneIndex] No se pudo crear la entrada para", phoneDigits, indexErr);
      }
    }
    return ref.id;
  } catch (err) {
    console.error("No se pudo crear/actualizar la ficha del cliente:", err);
    return null;
  }
}
export async function updateClient(id, data) {
  return updateDoc(doc(db, "clients", id), data);
}
export async function deleteClient(id) {
  try {
    const snap = await getDoc(doc(db, "clients", id));
    if (snap.exists() && snap.data().phoneDigits) {
      await deleteDoc(doc(db, "phoneIndex", snap.data().phoneDigits));
    }
  } catch {
    // Best-effort: si falla la limpieza del índice, igual borra el cliente
  }
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